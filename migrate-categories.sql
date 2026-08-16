-- =============================================
-- AKDAĞ ELEKTRONİK — Kategori Migration
-- Eski kategorilerdeki ürünleri yeni yapıya taşır.
-- Supabase SQL Editor'da çalıştırılabilir.
--
-- ÖNEMLİ: Bu script'i çalıştırmadan önce,
-- eski kategorilerde hangi ürünlerin olduğunu kontrol edin:
--   SELECT id, ad, kategori FROM urunler WHERE kategori IN ('Okul Saat Sistemleri', 'Simultune Sistemleri', 'Aksesuarlar');
-- =============================================

-- Eski "Okul Saat Sistemleri" → "Ses Sistemleri" (akıllı okul saati ses/anons sistemidir)
UPDATE urunler
SET kategori = 'Ses Sistemleri', updated_at = NOW()
WHERE kategori = 'Okul Saat Sistemleri';

-- Eski "Simultune Sistemleri" → "Ses Sistemleri" (simultane çeviri ses sistemidir)
UPDATE urunler
SET kategori = 'Ses Sistemleri', updated_at = NOW()
WHERE kategori = 'Simultune Sistemleri';

-- Eski "Aksesuarlar" → uygun kategoriye göre elle taşıyın veya "Ses Sistemleri" olarak varsayalım
-- İsterseniz bu satırı yorumdan çıkarın:
-- UPDATE urunler
-- SET kategori = 'Ses Sistemleri', updated_at = NOW()
-- WHERE kategori = 'Aksesuarlar';

-- Varsayılan kategori değerini güncelle
ALTER TABLE urunler ALTER COLUMN kategori SET DEFAULT 'Ses Sistemleri';
