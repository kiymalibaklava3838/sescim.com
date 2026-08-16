-- =============================================
-- sescim.com - Supabase Tam Şema
-- Akdag-elektronik'ten BAĞIMSIZ ayrı proje
-- SQL Editor'da çalıştırın
-- =============================================

-- ─────────────────────────────────────────────
-- 1) ÜRÜNLER
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS urunler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad TEXT NOT NULL,
  aciklama TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Ses Sistemleri',
  alt_kategori TEXT,
  detay_kategori TEXT,
  fotograflar TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE urunler ADD COLUMN IF NOT EXISTS fiyat DECIMAL(10,2);
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS indirimli_fiyat DECIMAL(10,2);
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS stok_durumu TEXT DEFAULT 'stokta';
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS fiyat_guncelleme TIMESTAMPTZ;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS para_birimi TEXT DEFAULT 'TRY';
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS stok_adedi INTEGER DEFAULT 0;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS kritik_stok INTEGER DEFAULT 5;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS marka TEXT;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS kullanim_alani TEXT;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS model_kodu TEXT;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE INDEX IF NOT EXISTS idx_urunler_fiyat ON urunler(fiyat);
CREATE INDEX IF NOT EXISTS idx_urunler_stok ON urunler(stok_durumu);
CREATE INDEX IF NOT EXISTS idx_urunler_marka ON urunler(marka);
CREATE INDEX IF NOT EXISTS idx_urunler_slug ON urunler(slug);

-- ─────────────────────────────────────────────
-- 2) SİTE ADMİNLERİ
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

ALTER TABLE urunler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes urunleri okuyabilir" ON urunler;
CREATE POLICY "Herkes urunleri okuyabilir"
  ON urunler FOR SELECT TO public USING (true);

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
-- 3) ÜYE PROFIL (auth.users'a ek bilgi)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS uye_profiller (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  ad TEXT,
  soyad TEXT,
  telefon TEXT,
  dogum_tarihi DATE,
  cinsiyet TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE uye_profiller ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Uye kendi profilini gorebilir" ON uye_profiller;
CREATE POLICY "Uye kendi profilini gorebilir"
  ON uye_profiller FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Uye kendi profilini guncelleyebilir" ON uye_profiller;
CREATE POLICY "Uye kendi profilini guncelleyebilir"
  ON uye_profiller FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin profil tam yetki" ON uye_profiller;
CREATE POLICY "Admin profil tam yetki"
  ON uye_profiller FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 4) ADRES DEFTERİ
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS adres_defteri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  baslik TEXT NOT NULL DEFAULT 'Ev',
  ad_soyad TEXT NOT NULL,
  telefon TEXT NOT NULL,
  il TEXT NOT NULL,
  ilce TEXT NOT NULL,
  mahalle TEXT,
  adres TEXT NOT NULL,
  posta_kodu TEXT,
  varsayilan BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE adres_defteri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Uye kendi adreslerini yonetebilir" ON adres_defteri;
CREATE POLICY "Uye kendi adreslerini yonetebilir"
  ON adres_defteri FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 5) SİPARİŞLER (SCM- prefix)
-- ─────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS siparis_no_seq START 1000;

CREATE TABLE IF NOT EXISTS siparisler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  siparis_no TEXT,
  user_id UUID REFERENCES auth.users(id),
  urunler JSONB NOT NULL DEFAULT '[]',
  toplam_tutar DECIMAL(10,2) NOT NULL DEFAULT 0,
  ad_soyad TEXT,
  telefon TEXT,
  email TEXT,
  teslimat_adresi TEXT,
  notlar TEXT,
  odeme_tipi TEXT DEFAULT 'havale',
  odeme_durumu TEXT DEFAULT 'beklemede',
  durum TEXT DEFAULT 'beklemede',
  kargo_takip_no TEXT,
  kargo_firmasi TEXT,
  teslimat_tipi TEXT DEFAULT 'kargo',
  fatura_tipi TEXT DEFAULT 'bireysel',
  firma_unvani TEXT,
  vergi_no TEXT,
  vergi_dairesi TEXT,
  paytr_token TEXT,
  dekont_url TEXT,
  dolar_kuru DECIMAL(10,4),
  euro_kuru DECIMAL(10,4),
  kupon_kodu TEXT,
  kupon_indirimi DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sipariş no otomatik SCM-XXXXX formatında
CREATE OR REPLACE FUNCTION set_siparis_no()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.siparis_no IS NULL OR NEW.siparis_no = '' THEN
    NEW.siparis_no := 'SCM-' || LPAD(nextval('siparis_no_seq')::TEXT, 5, '0');
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
  ON siparisler FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Kullanici kendi siparislerini gorebilir" ON siparisler;
CREATE POLICY "Kullanici kendi siparislerini gorebilir"
  ON siparisler FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Site admin siparis tam yetki" ON siparisler;
CREATE POLICY "Site admin siparis tam yetki"
  ON siparisler FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 6) ÜRÜN YORUMLARI
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS urun_yorumlari (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  urun_id UUID REFERENCES urunler(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  puan INTEGER NOT NULL CHECK (puan >= 1 AND puan <= 5),
  baslik TEXT,
  yorum TEXT NOT NULL,
  onaylandi BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE urun_yorumlari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes onaylanmis yorumlari okuyabilir" ON urun_yorumlari;
CREATE POLICY "Herkes onaylanmis yorumlari okuyabilir"
  ON urun_yorumlari FOR SELECT TO public
  USING (onaylandi = true);

DROP POLICY IF EXISTS "Uye yorum ekleyebilir" ON urun_yorumlari;
CREATE POLICY "Uye yorum ekleyebilir"
  ON urun_yorumlari FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin yorumlari yonetebilir" ON urun_yorumlari;
CREATE POLICY "Admin yorumlari yonetebilir"
  ON urun_yorumlari FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 7) KUPONLAR
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kuponlar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kod TEXT NOT NULL UNIQUE,
  indirim_tipi TEXT NOT NULL CHECK (indirim_tipi IN ('yuzde', 'sabit')),
  indirim_miktari DECIMAL(10,2) NOT NULL,
  min_tutar DECIMAL(10,2),
  max_kullanim INTEGER,
  kullanim_sayisi INTEGER DEFAULT 0,
  gecerlilik_tarihi TIMESTAMPTZ,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kuponlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin kupon yonetebilir" ON kuponlar;
CREATE POLICY "Admin kupon yonetebilir"
  ON kuponlar FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "Herkes aktif kuponu okuyabilir" ON kuponlar;
CREATE POLICY "Herkes aktif kuponu okuyabilir"
  ON kuponlar FOR SELECT TO public
  USING (aktif = true);

-- ─────────────────────────────────────────────
-- 8) İLETİŞİM MESAJLARI
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
  ON iletisim_mesajlari FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Admin iletisim okuyabilir" ON iletisim_mesajlari;
CREATE POLICY "Admin iletisim okuyabilir"
  ON iletisim_mesajlari FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 9) BANNER & VİTRİN
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bannerlar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baslik TEXT,
  alt_yazi TEXT,
  resim_url TEXT NOT NULL,
  link TEXT,
  aktif BOOLEAN DEFAULT true,
  sira INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bannerlar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes aktif bannerlari gorebilir" ON bannerlar;
CREATE POLICY "Herkes aktif bannerlari gorebilir"
  ON bannerlar FOR SELECT TO public USING (aktif = true);

DROP POLICY IF EXISTS "Admin bannerlari yonetebilir" ON bannerlar;
CREATE POLICY "Admin bannerlari yonetebilir"
  ON bannerlar FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 10) ÖZEL ÜRÜNLER (Ana sayfada öne çıkan)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ozel_urunler (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  urun_id UUID REFERENCES urunler(id) ON DELETE CASCADE UNIQUE,
  tip TEXT DEFAULT 'one_cikan',
  sira INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ozel_urunler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Herkes ozel urunleri gorebilir" ON ozel_urunler;
CREATE POLICY "Herkes ozel urunleri gorebilir"
  ON ozel_urunler FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admin ozel urun yonetebilir" ON ozel_urunler;
CREATE POLICY "Admin ozel urun yonetebilir"
  ON ozel_urunler FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM site_admins s WHERE s.user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- 11) KAMPANYA GEÇMİŞİ
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kampanya_gecmisi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  konu TEXT NOT NULL,
  baslik TEXT NOT NULL,
  icerik TEXT NOT NULL,
  resim_url TEXT,
  link_url TEXT,
  hedef_kitle TEXT NOT NULL,
  gonderilen_kisi_sayisi INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kampanya_gecmisi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin kampanya gorebilir"
  ON kampanya_gecmisi FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM site_admins));

CREATE POLICY "Admin kampanya ekleyebilir"
  ON kampanya_gecmisi FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT user_id FROM site_admins));

-- ─────────────────────────────────────────────
-- 12) STORAGE BUCKETS
-- ─────────────────────────────────────────────

-- Supabase Dashboard'dan oluşturun: Storage > New Bucket
-- Bucket adı: urun-fotograflari (public: true)

DROP POLICY IF EXISTS "Herkes fotograflari gorebilir" ON storage.objects;
CREATE POLICY "Herkes fotograflari gorebilir"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'urun-fotograflari');

DROP POLICY IF EXISTS "Auth kullanici fotograf yukleyebilir" ON storage.objects;
CREATE POLICY "Auth kullanici fotograf yukleyebilir"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'urun-fotograflari');

-- ─────────────────────────────────────────────
-- 13) İLK ADMİN EKLEME (çalıştırmadan önce user_id'yi güncelleyin)
-- ─────────────────────────────────────────────
-- Supabase'e üye olun, Authentication > Users'dan user_id'yi kopyalayın
-- Sonra aşağıdaki satırı çalıştırın:
-- INSERT INTO site_admins (user_id) VALUES ('your-user-uuid-here');
