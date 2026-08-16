    -- =============================================
    -- AKDAĞ ELEKTRONİK — B2B Migration
    -- Supabase SQL Editor'da çalıştırın.
    -- =============================================

    -- 1) Ürünler tablosuna gerekli sütunlar
    ALTER TABLE urunler ADD COLUMN IF NOT EXISTS alt_kategori TEXT;
    ALTER TABLE urunler ADD COLUMN IF NOT EXISTS urun_tipi TEXT;
    ALTER TABLE urunler ADD COLUMN IF NOT EXISTS model_kodu TEXT;

    -- 2) Siparişler tablosuna teslimat tipi
    ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS teslimat_tipi TEXT DEFAULT 'kargo';

    -- 3) Sepet Tablosu (Kalıcı Sepet Mimarisi)
    CREATE TABLE IF NOT EXISTS sepet (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
        urun_id UUID REFERENCES urunler(id) ON DELETE CASCADE NOT NULL,
        adet INT DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, urun_id)
    );

    -- Sepet RLS Güvenlik Politikaları
    ALTER TABLE sepet ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Kullanıcılar kendi sepetini görebilir" ON sepet;
    CREATE POLICY "Kullanıcılar kendi sepetini görebilir" ON sepet FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Kullanıcılar kendi sepetine ürün ekleyebilir" ON sepet;
    CREATE POLICY "Kullanıcılar kendi sepetine ürün ekleyebilir" ON sepet FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Kullanıcılar kendi sepetini güncelleyebilir" ON sepet;
    CREATE POLICY "Kullanıcılar kendi sepetini güncelleyebilir" ON sepet FOR UPDATE USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Kullanıcılar kendi sepetinden ürün silebilir" ON sepet;
    CREATE POLICY "Kullanıcılar kendi sepetinden ürün silebilir" ON sepet FOR DELETE USING (auth.uid() = user_id);

    -- 4) Bayi Cari Hesap Sütunları
    ALTER TABLE bayiler ADD COLUMN IF NOT EXISTS bakiye DECIMAL(12,2) DEFAULT 0;
    ALTER TABLE bayiler ADD COLUMN IF NOT EXISTS kredi_limiti DECIMAL(12,2) DEFAULT 0;

    -- 5) Cari Hareketler Tablosu (Ekstre için)
    CREATE TABLE IF NOT EXISTS cari_hareketler (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        bayi_id UUID REFERENCES bayiler(id) ON DELETE CASCADE NOT NULL,
        islem_tarihi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        aciklama TEXT,
        borc DECIMAL(12,2) DEFAULT 0,
        alacak DECIMAL(12,2) DEFAULT 0,
        bakiye_sonrasi DECIMAL(12,2),
        belge_no TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE cari_hareketler ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Bayiler kendi hareketlerini görebilir" ON cari_hareketler;
    CREATE POLICY "Bayiler kendi hareketlerini görebilir" ON cari_hareketler FOR SELECT USING (
        EXISTS (SELECT 1 FROM bayiler WHERE id = cari_hareketler.bayi_id AND user_id = auth.uid())
    );

    -- 6) Bayi Teklif Ayarları (Kendi Logosu, Adresi vb.)
    CREATE TABLE IF NOT EXISTS bayi_teklif_ayarlari (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        bayi_id UUID REFERENCES bayiler(id) ON DELETE CASCADE NOT NULL UNIQUE,
        logo_url TEXT,
        firma_adi TEXT,
        adres TEXT,
        telefon TEXT,
        email TEXT,
        web_sitesi TEXT,
        varsayilan_kar_orani DECIMAL(5,2) DEFAULT 20,
        teklif_notu TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE bayi_teklif_ayarlari ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Bayiler kendi teklif ayarlarını yönetebilir" ON bayi_teklif_ayarlari;
    CREATE POLICY "Bayiler kendi teklif ayarlarını yönetebilir" ON bayi_teklif_ayarlari FOR ALL USING (
        EXISTS (SELECT 1 FROM bayiler WHERE id = bayi_teklif_ayarlari.bayi_id AND user_id = auth.uid())
    );

    -- 7) Kaydedilen Teklifler (Gelişmiş Yapı)
    CREATE TABLE IF NOT EXISTS teklifler (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        bayi_id UUID REFERENCES bayiler(id) ON DELETE CASCADE NOT NULL,
        teklif_no TEXT,
        musteri_adi TEXT,
        tarih DATE DEFAULT CURRENT_DATE,
        ara_toplam DECIMAL(12,2),
        kdv DECIMAL(12,2),
        genel_toplam DECIMAL(12,2),
        kur_usd DECIMAL(10,4),
        kur_eur DECIMAL(10,4),
        ozel_not TEXT,
        urunler JSONB, -- [ {ad, adet, birim_fiyat, toplam_fiyat}, ... ]
        durum TEXT DEFAULT 'beklemede',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    ALTER TABLE teklifler ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Bayiler kendi tekliflerini görebilir" ON teklifler;
    CREATE POLICY "Bayiler kendi tekliflerini görebilir" ON teklifler FOR SELECT USING (
        EXISTS (SELECT 1 FROM bayiler WHERE id = teklifler.bayi_id AND user_id = auth.uid())
    );

    -- 8) Storage Bucket Ayarları (Bayi Logoları İçin)
    INSERT INTO storage.buckets (id, name, public) VALUES ('bayi-assets', 'bayi-assets', true) ON CONFLICT DO NOTHING;

    DROP POLICY IF EXISTS "Bayi Assetleri Herkese Açık" ON storage.objects;
    CREATE POLICY "Bayi Assetleri Herkese Açık" ON storage.objects FOR SELECT USING (bucket_id = 'bayi-assets');

    DROP POLICY IF EXISTS "Bayiler Kendi Assetlerini Yükleyebilir" ON storage.objects;
    CREATE POLICY "Bayiler Kendi Assetlerini Yükleyebilir" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bayi-assets' AND auth.role() = 'authenticated');
