-- ==========================================================
-- Sescim.com - Distribütör Fiyat Koruması Migration
-- sescim_fiyatlar tablosuna 'fiyat_sorunuz' kolonu ekleme
-- Bu sorguyu Supabase SQL Editor üzerinden çalıştırabilirsiniz.
-- ==========================================================

ALTER TABLE sescim_fiyatlar 
ADD COLUMN IF NOT EXISTS fiyat_sorunuz BOOLEAN DEFAULT false;

-- Mevcut satırlara varsayılan false değerini garantile
UPDATE sescim_fiyatlar 
SET fiyat_sorunuz = false 
WHERE fiyat_sorunuz IS NULL;
