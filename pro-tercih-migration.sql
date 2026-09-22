-- ========================================================
-- sescim.com - Pro Tercihler Foreign Key Constraint Düzeltmesi
-- Supabase SQL Editor'da çalıştırın
-- ========================================================

-- ozel_urunler tablosundaki urun_id sütununun Sescim urunler tablosuna
-- olan kısıtlamasını kaldırır. Böylece Akdağ Elektronik kataloğundaki
-- tüm ürünler de Profesyonellerin Tercihi vitrinine eklenebilir.

ALTER TABLE ozel_urunler DROP CONSTRAINT IF EXISTS ozel_urunler_urun_id_fkey;

-- İndeks performansı için urun_id indeksinin varlığını garantiye al
CREATE INDEX IF NOT EXISTS idx_ozel_urunler_urun_id ON ozel_urunler(urun_id);
CREATE INDEX IF NOT EXISTS idx_ozel_urunler_tip ON ozel_urunler(tip);
