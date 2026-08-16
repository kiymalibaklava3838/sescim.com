-- =============================================
-- AKDAĞ ELEKTRONİK - Supabase tam şema
-- SQL Editor'da tek seferde veya parça parça çalıştırılabilir.
-- Daha önce çalıştırdığınız migration'larla uyumludur (idempotent).
--
-- ÖNEMLİ: site_admins tablosu oluşturulduktan sonra en az bir yönetici ekleyin:
--   INSERT INTO site_admins (user_id) VALUES ('<auth.users.id>');
-- Aksi halde kimse ürün ekleyemez/güncelleyemez ve /admin paneli middleware ile kısıtlanır.
-- =============================================

-- ─────────────────────────────────────────────
-- 1) ÜRÜNLER (temel tablo + kolonlar)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS urunler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad TEXT NOT NULL,
  aciklama TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Ses Sistemleri',
  fotograflar TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE urunler ADD COLUMN IF NOT EXISTS fiyat DECIMAL(10,2);
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS indirimli_fiyat DECIMAL(10,2);
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS bayi_fiyati DECIMAL(10,2);
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS stok_durumu TEXT DEFAULT 'stokta';
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS fiyat_guncelleme TIMESTAMPTZ;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS para_birimi TEXT DEFAULT 'TRY';
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS bayi_para_birimi TEXT DEFAULT 'TRY';
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS stok_adedi INTEGER DEFAULT 0;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS kritik_stok INTEGER DEFAULT 5;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS marka TEXT;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS kullanim_alani TEXT;

CREATE INDEX IF NOT EXISTS idx_urunler_fiyat ON urunler(fiyat);
CREATE INDEX IF NOT EXISTS idx_urunler_stok_durumu ON urunler(stok_durumu);
CREATE INDEX IF NOT EXISTS idx_urunler_marka ON urunler(marka);
CREATE INDEX IF NOT EXISTS idx_urunler_kullanim ON urunler(kullanim_alani);

-- ─────────────────────────────────────────────
-- Site yöneticileri (RLS'te kullanılır)
-- İlk admin: INSERT INTO site_admins (user_id) VALUES ('<auth.users.id>');
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Site admin kendi kaydini okur" ON site_admins;
CREATE POLICY "Site admin kendi kaydini okur"
  ON site_admins FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- İletişim formu kayıtları
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iletisim_mesajlari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad TEXT NOT NULL,
  soyad TEXT,
  telefon TEXT,
  email TEXT NOT NULL,
  konu TEXT,
  mesaj TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE iletisim_mesajlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes iletisim gonderebilir" ON iletisim_mesajlari;
CREATE POLICY "Herkes iletisim gonderebilir"
  ON iletisim_mesajlari FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Site admin iletisim okuyabilir" ON iletisim_mesajlari;
CREATE POLICY "Site admin iletisim okuyabilir"
  ON iletisim_mesajlari FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Site admin iletisim yonetir" ON iletisim_mesajlari;
CREATE POLICY "Site admin iletisim yonetir"
  ON iletisim_mesajlari FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Site admin iletisim silebilir" ON iletisim_mesajlari;
CREATE POLICY "Site admin iletisim silebilir"
  ON iletisim_mesajlari FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

ALTER TABLE urunler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes urunleri okuyabilir" ON urunler;
CREATE POLICY "Herkes urunleri okuyabilir"
  ON urunler FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Auth kullanici urun ekleyebilir" ON urunler;
DROP POLICY IF EXISTS "Auth kullanici urun silebilir" ON urunler;
DROP POLICY IF EXISTS "Auth kullanici urun guncelleyebilir" ON urunler;

DROP POLICY IF EXISTS "Site admin urun ekler" ON urunler;
CREATE POLICY "Site admin urun ekler"
  ON urunler FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Site admin urun gunceller" ON urunler;
CREATE POLICY "Site admin urun gunceller"
  ON urunler FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Site admin urun siler" ON urunler;
CREATE POLICY "Site admin urun siler"
  ON urunler FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 2) BAYİ SİSTEMİ
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bayiler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  firma_adi TEXT NOT NULL,
  yetkili_adi TEXT NOT NULL,
  telefon TEXT NOT NULL,
  sehir TEXT NOT NULL,
  onaylandi BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bayiler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bayi kendi profilini gorebilir" ON bayiler;
CREATE POLICY "Bayi kendi profilini gorebilir"
  ON bayiler FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Eski ve yeni isimler (tek politika — tüm authenticated için tam erişim; admin ayrımı uygulama katmanında)
DROP POLICY IF EXISTS "Admin bayileri gorebilir" ON bayiler;
DROP POLICY IF EXISTS "Admin bayileri yonetebilir" ON bayiler;
DROP POLICY IF EXISTS "Site admin bayiler tam yetki" ON bayiler;
CREATE POLICY "Site admin bayiler tam yetki"
  ON bayiler FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS bayi_basvurular (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firma_adi TEXT NOT NULL,
  yetkili_adi TEXT NOT NULL,
  telefon TEXT NOT NULL,
  email TEXT NOT NULL,
  sehir TEXT NOT NULL,
  mesaj TEXT,
  durum TEXT DEFAULT 'beklemede',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bayi_basvurular ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes basvuru yapabilir" ON bayi_basvurular;
CREATE POLICY "Herkes basvuru yapabilir"
  ON bayi_basvurular FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin basvurulari gorebilir" ON bayi_basvurular;
DROP POLICY IF EXISTS "Admin basvurulari yonetebilir" ON bayi_basvurular;
DROP POLICY IF EXISTS "Site admin basvurular tam yetki" ON bayi_basvurular;
CREATE POLICY "Site admin basvurular tam yetki"
  ON bayi_basvurular FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- Bayi başına özel fiyat satırları (AdminBayiYonetim bileşeni)
CREATE TABLE IF NOT EXISTS urun_fiyatlari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  urun_id UUID REFERENCES urunler(id) ON DELETE CASCADE,
  bayi_fiyati DECIMAL(10,2) NOT NULL,
  para_birimi TEXT DEFAULT 'TRY',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(urun_id)
);

ALTER TABLE urun_fiyatlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Onayli bayiler fiyat gorebilir" ON urun_fiyatlari;
CREATE POLICY "Onayli bayiler fiyat gorebilir"
  ON urun_fiyatlari FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bayiler
      WHERE user_id = auth.uid() AND onaylandi = true
    )
  );

DROP POLICY IF EXISTS "Admin fiyat yonetebilir" ON urun_fiyatlari;
DROP POLICY IF EXISTS "Site admin fiyat tam yetki" ON urun_fiyatlari;
CREATE POLICY "Site admin fiyat tam yetki"
  ON urun_fiyatlari FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 3) SİPARİŞLER
-- ─────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS siparis_no_seq START 1000;

CREATE TABLE IF NOT EXISTS siparisler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siparis_no TEXT,
  user_id UUID REFERENCES auth.users(id),
  bayi_id UUID,
  urunler JSONB NOT NULL DEFAULT '[]',
  toplam_tutar DECIMAL(10,2) NOT NULL DEFAULT 0,
  ad_soyad TEXT,
  telefon TEXT,
  email TEXT,
  notlar TEXT,
  odeme_tipi TEXT DEFAULT 'havale',
  odeme_durumu TEXT DEFAULT 'beklemede',
  durum TEXT DEFAULT 'beklemede',
  paytr_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_siparis_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.siparis_no IS NULL OR NEW.siparis_no = '' THEN
    NEW.siparis_no := 'AKD-' || LPAD(nextval('siparis_no_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_siparis_no ON siparisler;
CREATE TRIGGER trigger_siparis_no
  BEFORE INSERT ON siparisler
  FOR EACH ROW
  EXECUTE FUNCTION set_siparis_no();

ALTER TABLE siparisler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes siparis verebilir" ON siparisler;
CREATE POLICY "Herkes siparis verebilir"
  ON siparisler FOR INSERT TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Kullanici kendi siparislerini gorebilir" ON siparisler;
CREATE POLICY "Kullanici kendi siparislerini gorebilir"
  ON siparisler FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin siparisleri yonetebilir" ON siparisler;
DROP POLICY IF EXISTS "Site admin siparis tam yetki" ON siparisler;
CREATE POLICY "Site admin siparis tam yetki"
  ON siparisler FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 4) STORAGE (bucket Dashboard'dan da oluşturulabilir)
-- ─────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('urun-fotograflari', 'urun-fotograflari', true)
-- ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Herkes fotograflari gorebilir" ON storage.objects;
CREATE POLICY "Herkes fotograflari gorebilir"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'urun-fotograflari');

DROP POLICY IF EXISTS "Auth kullanici fotograf yukleyebilir" ON storage.objects;
CREATE POLICY "Auth kullanici fotograf yukleyebilir"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'urun-fotograflari');

-- ─────────────────────────────────────────────
-- 5) ÖRNEK ÜRÜNLER (yalnızca aynı ada sahip kayıt yoksa ekler)
-- ─────────────────────────────────────────────

INSERT INTO urunler (ad, aciklama, kategori)
SELECT v.ad, v.aciklama, v.kategori
FROM (VALUES
  ('JBL PRX915 Aktif Hoparlör', '15" woofer, 1500W güç çıkışı. Sahne ve etkinlik için profesyonel sınıf hoparlör.', 'Ses Sistemleri'),
  ('Shure SM58 Dinamik Mikrofon', 'Canlı performans için endüstri standardı vokal mikrofonu. Dayanıklı yapı.', 'Ses Sistemleri'),
  ('Yamaha MG16XU Mixer', '16 kanallı, USB, efektli profesyonel mixing console.', 'Ses Sistemleri'),
  ('AKUSTEK Akıllı Okul Saati', 'Programlanabilir zil sistemi, anons entegrasyonu ve uzaktan yönetim. Okul otomasyon çözümü.', 'Okul Saat Sistemleri')
) AS v(ad, aciklama, kategori)
WHERE NOT EXISTS (SELECT 1 FROM urunler u WHERE u.ad = v.ad);

-- ═══════════════════════════════════════════════════════════════════════════════
-- KAMPANYA GEÇMİŞİ (TOPLU E-POSTA)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.kampanya_gecmisi (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    konu TEXT NOT NULL,
    baslik TEXT NOT NULL,
    icerik TEXT NOT NULL,
    resim_url TEXT,
    link_url TEXT,
    hedef_kitle TEXT NOT NULL, -- Örn: "Tüm Bayiler", "Seçili 3 Bayi"
    gonderilen_kisi_sayisi INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.kampanya_gecmisi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sadece adminler kampanya gecmisini gorebilir"
ON public.kampanya_gecmisi FOR SELECT
USING ( auth.uid() IN (SELECT user_id FROM site_admins) );

CREATE POLICY "Sadece adminler kampanya ekleyebilir"
ON public.kampanya_gecmisi FOR INSERT
WITH CHECK ( auth.uid() IN (SELECT user_id FROM site_admins) );
