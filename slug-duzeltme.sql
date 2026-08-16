-- SQL'de büyük 'İ' ve diğer Türkçe karakterleri düzgün çeviren düzeltme fonksiyonu
CREATE OR REPLACE FUNCTION fix_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
  slug TEXT;
BEGIN
  -- ÖNCE büyük Türkçe harfleri küçük karşılıklarına çeviriyoruz
  slug := title;
  slug := replace(slug, 'İ', 'i');
  slug := replace(slug, 'I', 'i');
  slug := replace(slug, 'Ş', 's');
  slug := replace(slug, 'Ğ', 'g');
  slug := replace(slug, 'Ü', 'u');
  slug := replace(slug, 'Ö', 'o');
  slug := replace(slug, 'Ç', 'c');
  
  -- Sonra standart lower() işlemini yapıyoruz
  slug := lower(slug);
  
  -- Kalan küçük Türkçe harfleri de garantiye alıyoruz
  slug := replace(slug, 'ı', 'i');
  slug := replace(slug, 'ğ', 'g');
  slug := replace(slug, 'ü', 'u');
  slug := replace(slug, 'ş', 's');
  slug := replace(slug, 'ö', 'o');
  slug := replace(slug, 'ç', 'c');
  
  -- Alfanumerik olmayan tüm karakterleri (boşluklar dahil) tireye (-) çevir
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  
  -- Fazladan yanyana gelmiş tireleri tek tire yap
  slug := regexp_replace(slug, '-+', '-', 'g');
  
  -- Başındaki ve sonundaki tireleri temizle
  slug := trim(both '-' from slug);
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Tüm ürünlerin slug'larını yeniden, doğru formata göre düzeltelim
DO $$ 
DECLARE 
  urun_record RECORD;
  generated_slug TEXT;
  slug_count INT;
BEGIN
  FOR urun_record IN SELECT id, ad FROM public.urunler LOOP
    generated_slug := fix_slug(urun_record.ad);
    
    -- Benzersizlik kontrolü (Eğer bu slug'dan başka varsa sonuna ID ekle)
    SELECT count(*) INTO slug_count FROM public.urunler WHERE slug = generated_slug AND id != urun_record.id;
    
    IF slug_count > 0 THEN
      generated_slug := generated_slug || '-' || substr(urun_record.id::text, 1, 4);
    END IF;
    
    UPDATE public.urunler SET slug = generated_slug WHERE id = urun_record.id;
  END LOOP;
END $$;
