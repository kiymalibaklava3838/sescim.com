-- =============================================================================
-- sescim.com — Üye Zorunlu & Tek Seferlik Kupon Sistemi Migration
-- =============================================================================

-- 1. kupon_kullanimlari tablosu (Hesap Başına Tekil Kullanım & Denetim Kaydı)
CREATE TABLE IF NOT EXISTS kupon_kullanimlari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kupon_id UUID REFERENCES kuponlar(id) ON DELETE SET NULL,
  kupon_kodu TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  siparis_id UUID REFERENCES siparisler(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  durum TEXT NOT NULL DEFAULT 'onaylandi', -- 'beklemede', 'onaylandi', 'iptal'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT kupon_kullanimlari_user_kod_unique UNIQUE (user_id, kupon_kodu)
);

CREATE INDEX IF NOT EXISTS idx_kupon_kullanimlari_user ON kupon_kullanimlari(user_id);
CREATE INDEX IF NOT EXISTS idx_kupon_kullanimlari_kod ON kupon_kullanimlari(kupon_kodu);
CREATE INDEX IF NOT EXISTS idx_kupon_kullanimlari_email ON kupon_kullanimlari(email);
CREATE INDEX IF NOT EXISTS idx_kupon_kullanimlari_siparis ON kupon_kullanimlari(siparis_id);

-- 2. Güvenlik: RLS Politikaları
ALTER TABLE kupon_kullanimlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanici kendi kupon kullanimlarini gorebilir" ON kupon_kullanimlari;
CREATE POLICY "Kullanici kendi kupon kullanimlarini gorebilir" ON kupon_kullanimlari
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin kupon kullanimlarini gorebilir" ON kupon_kullanimlari;
CREATE POLICY "Admin kupon kullanimlarini gorebilir" ON kupon_kullanimlari
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins WHERE user_id = auth.uid()));

-- 3. Backfill: Geçmişte kupon ile tamamlanmış siparişleri aktar
INSERT INTO kupon_kullanimlari (kupon_kodu, user_id, siparis_id, email, durum, created_at)
SELECT s.kupon_kodu, s.user_id, s.id, s.email, 'onaylandi', s.created_at
FROM siparisler s
WHERE s.kupon_kodu IS NOT NULL
  AND s.user_id IS NOT NULL
  AND s.durum <> 'iptal'
  AND (s.odeme_durumu = 'odendi' OR s.odeme_durumu = 'onaylandi')
ON CONFLICT (user_id, kupon_kodu) DO NOTHING;
