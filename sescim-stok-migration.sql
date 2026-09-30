-- ==========================================================
-- Sescim.com - Sescim Özel Stok Ayırma Migration
-- sescim_fiyatlar tablosuna Sescim'e özel stok kolonlarını ekleme
-- Bu sorguyu Supabase SQL Editor (sescim projesi) üzerinden çalıştırın.
-- ==========================================================

ALTER TABLE sescim_fiyatlar 
ADD COLUMN IF NOT EXISTS sescim_stok INTEGER DEFAULT NULL;

ALTER TABLE sescim_fiyatlar 
ADD COLUMN IF NOT EXISTS sescim_stok_durumu TEXT DEFAULT NULL;

-- Yorumlar:
-- sescim_stok:
--   - NULL ise Akdağ Elektronik ortak kataloğundaki stok_adedi kullanılır.
--   - Sayısal bir değer (örn. 5 veya 0) girildiğinde yalnızca sescim.com'a ayrılan stok kotası geçerli olur.
--   - Akdağ Elektronik ana veritabanındaki stok (örn. 8) KESİNLİKLE değişmez, korunur.
-- sescim_stok_durumu:
--   - NULL ise otomatik stok mantığı (sescim_stok <= 0 ise 'tukendi', değilse 'stokta' veya Akdağ durumu) çalışır.
--   - 'siparise_gore', 'stokta' veya 'tukendi' olarak elle de zorlanabilir.
