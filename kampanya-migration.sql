-- Kampanya geçmişi tablosu
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

-- RLS (Sadece adminlerin erişebilmesi için)
ALTER TABLE public.kampanya_gecmisi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sadece adminler kampanya geçmişini görebilir"
ON public.kampanya_gecmisi FOR SELECT
USING ( auth.uid() IN (SELECT user_id FROM site_admins) );

CREATE POLICY "Sadece adminler kampanya ekleyebilir"
ON public.kampanya_gecmisi FOR INSERT
WITH CHECK ( auth.uid() IN (SELECT user_id FROM site_admins) );
