-- 1. Sütunu ekliyoruz
ALTER TABLE public.urunler ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Benzersizlik (Unique) için kısıtlama ekliyoruz
-- Ancak önce mevcut verileri güncellememiz gerektiği için UNIQUE constraint'i veriler güncellendikten sonra ekleyeceğiz.

-- 3. Türkçe karakterleri değiştiren ve temiz bir link (slug) oluşturan fonksiyon
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Küçük harfe çevir ve Türkçe karakterleri İngilizce karşılıklarıyla değiştir
  slug := lower(title);
  slug := replace(slug, 'ı', 'i');
  slug := replace(slug, 'ğ', 'g');
  slug := replace(slug, 'ü', 'u');
  slug := replace(slug, 'ş', 's');
  slug := replace(slug, 'ö', 'o');
  slug := replace(slug, 'ç', 'c');
  
  -- Alfanumerik olmayan tüm karakterleri (boşluklar dahil) tireye (-) çevir
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  
  -- Başındaki ve sonundaki tireleri temizle
  slug := trim(both '-' from slug);
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- 4. Mevcut ürünlerin slug'larını güncelle
-- Eğer aynı isimde ürünler varsa sonlarına id'lerinin ilk 4 hanesini ekleyerek benzersiz yaparız
DO $$ 
DECLARE 
  urun_record RECORD;
  generated_slug TEXT;
  slug_count INT;
BEGIN
  FOR urun_record IN SELECT id, ad FROM public.urunler WHERE slug IS NULL LOOP
    generated_slug := generate_slug(urun_record.ad);
    
    -- Bu slug'dan başka var mı kontrol et
    SELECT count(*) INTO slug_count FROM public.urunler WHERE slug = generated_slug AND id != urun_record.id;
    
    IF slug_count > 0 THEN
      -- Eğer varsa sonuna rastgele bir id parçası ekle
      generated_slug := generated_slug || '-' || substr(urun_record.id::text, 1, 4);
    END IF;
    
    UPDATE public.urunler SET slug = generated_slug WHERE id = urun_record.id;
  END LOOP;
END $$;

-- 5. Artık hepsi dolduğuna göre sütunu UNIQUE ve NOT NULL yapabiliriz
ALTER TABLE public.urunler ADD CONSTRAINT urunler_slug_key UNIQUE (slug);
ALTER TABLE public.urunler ALTER COLUMN slug SET NOT NULL;
