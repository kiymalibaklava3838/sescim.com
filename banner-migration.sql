-- Ürünler Sayfası Kampanya/Banner Tablosu
CREATE TABLE IF NOT EXISTS public.store_banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) Aktifleştirme
ALTER TABLE public.store_banners ENABLE ROW LEVEL SECURITY;

-- Okuma (Görüntüleme): Herkes görebilir
CREATE POLICY "Herkes bannerları görebilir"
ON public.store_banners FOR SELECT
USING (true);

-- Ekleme: Sadece Adminler
CREATE POLICY "Sadece adminler banner ekleyebilir"
ON public.store_banners FOR INSERT
WITH CHECK ( auth.uid() IN (SELECT user_id FROM site_admins) );

-- Silme: Sadece Adminler
CREATE POLICY "Sadece adminler banner silebilir"
ON public.store_banners FOR DELETE
USING ( auth.uid() IN (SELECT user_id FROM site_admins) );

-- Güncelleme: Sadece Adminler
CREATE POLICY "Sadece adminler banner güncelleyebilir"
ON public.store_banners FOR UPDATE
USING ( auth.uid() IN (SELECT user_id FROM site_admins) );

-- --------------------------------------------------------
-- Storage (Dosya Deposu) Bucket'ı (kampanya-gorselleri)
-- --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kampanya-gorselleri', 'kampanya-gorselleri', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Okuma: Herkes
CREATE POLICY "Herkes kampanya görsellerini görebilir"
ON storage.objects FOR SELECT
USING ( bucket_id = 'kampanya-gorselleri' );

-- Storage Yazma: Sadece Adminler
CREATE POLICY "Sadece adminler kampanya görseli yükleyebilir"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'kampanya-gorselleri' AND auth.uid() IN (SELECT user_id FROM site_admins) );

-- Storage Silme: Sadece Adminler
CREATE POLICY "Sadece adminler kampanya görseli silebilir"
ON storage.objects FOR DELETE
USING ( bucket_id = 'kampanya-gorselleri' AND auth.uid() IN (SELECT user_id FROM site_admins) );
