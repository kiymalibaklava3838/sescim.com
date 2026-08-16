-- Wolvox Taslak Tablosu Güncelleme
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- 1) Açıklama kolonu (Wolvox ACIKLAMA1 alanından gelir)
ALTER TABLE wolvox_taslak 
  ADD COLUMN IF NOT EXISTS aciklama text;

-- 2) Senkronizasyon yılı kolonu
ALTER TABLE wolvox_taslak 
  ADD COLUMN IF NOT EXISTS yil integer;

-- 3) Mevcut kayıtlara 2025 yılını yaz (isteğe bağlı)
UPDATE wolvox_taslak SET yil = 2025 WHERE yil IS NULL;

-- 4) İndeks ekle (yıl filtresi için performans)
CREATE INDEX IF NOT EXISTS idx_wolvox_taslak_yil ON wolvox_taslak(yil);
CREATE INDEX IF NOT EXISTS idx_wolvox_taslak_is_processed ON wolvox_taslak(is_processed);
