-- Öne Çıkan Ürünler (Featured Products) İçin Veritabanı Güncellemesi

-- 1. 'urunler' tablosuna 'is_featured' sütunu ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'urunler' AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE urunler ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
END $$;
