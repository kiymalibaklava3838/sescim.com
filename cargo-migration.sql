-- =============================================
-- sescim.com — Kargo & Lojistik Veritabanı Güncellemesi
-- Supabase SQL Editor'da çalıştırılabilir
-- =============================================

ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS kargo_ucreti DECIMAL(10,2) DEFAULT 0;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS koli_adedi INTEGER DEFAULT 1;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS toplam_desi DECIMAL(6,2) DEFAULT 1;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS kargo_notu TEXT;

ALTER TABLE urunler ADD COLUMN IF NOT EXISTS desi DECIMAL(6,2) DEFAULT 1;
ALTER TABLE urunler ADD COLUMN IF NOT EXISTS agirlik_kg DECIMAL(6,2);
