-- =============================================================================
-- sescim.com — PayTR Ödeme Olayları & Güvenlik Bayrakları Migration
-- =============================================================================

-- 1. siparisler tablosuna çökme ve mükerrer işlem koruma bayrakları
ALTER TABLE siparisler
  ADD COLUMN IF NOT EXISTS stok_dusuldu BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onay_maili_gonderildi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS odeme_hata_maili_gonderildi BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS odeme_hata_mesaji TEXT;

-- 2. siparis_kalemleri tablosuna kalem bazlı stok düşüm bayrağı (Kısmi hata koruması)
ALTER TABLE siparis_kalemleri
  ADD COLUMN IF NOT EXISTS stok_dusuldu BOOLEAN NOT NULL DEFAULT false;

-- 3. odeme_olaylari tablosu: Muhasebe, itiraz ve idempotency denetim kaydı
CREATE TABLE IF NOT EXISTS odeme_olaylari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_oid TEXT NOT NULL,
  status TEXT NOT NULL,
  total_amount DECIMAL(10,2),
  payment_amount DECIMAL(10,2),
  failed_reason_msg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT odeme_olaylari_oid_status_key UNIQUE (merchant_oid, status)
);

CREATE INDEX IF NOT EXISTS idx_odeme_olaylari_oid ON odeme_olaylari (merchant_oid);
CREATE INDEX IF NOT EXISTS idx_siparisler_odeme_durumu ON siparisler (odeme_durumu);

-- 4. Güvenlik: RLS Politikaları (Tekrar çalıştırılabilir / Idempotent)
ALTER TABLE odeme_olaylari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read odeme_olaylari" ON odeme_olaylari;
CREATE POLICY "Admins read odeme_olaylari" ON odeme_olaylari
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins WHERE user_id = auth.uid()));

-- 5. Backfill: Geçmişte ödenmiş siparişlerin bayraklarını geriye dönük true yap (Mükerrer işlem engeli)
UPDATE siparisler
SET stok_dusuldu = true, onay_maili_gonderildi = true
WHERE odeme_durumu = 'odendi';

UPDATE siparis_kalemleri sk
SET stok_dusuldu = true
FROM siparisler s
WHERE sk.siparis_id = s.id AND s.odeme_durumu = 'odendi';

-- 6. Atomik Stok Düşürme PostgreSQL Fonksiyonu
CREATE OR REPLACE FUNCTION deduct_sescim_stock(p_urun_id UUID, p_adet INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO sescim_fiyatlar (urun_id, sescim_stok, sescim_stok_durumu, updated_at)
  VALUES (p_urun_id, 0, 'tukendi', NOW())
  ON CONFLICT (urun_id) DO UPDATE
  SET sescim_stok = GREATEST(0, COALESCE(sescim_fiyatlar.sescim_stok, 0) - p_adet),
      sescim_stok_durumu = CASE WHEN GREATEST(0, COALESCE(sescim_fiyatlar.sescim_stok, 0) - p_adet) = 0 THEN 'tukendi' ELSE 'stokta' END,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
