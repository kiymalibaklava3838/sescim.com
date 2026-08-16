-- Siparişler tablosuna fatura ve dekont alanlarını ekleme
-- Bu scripti Supabase SQL Editor üzerinden çalıştırın.

-- 1. Fatura Alanları
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS fatura_tipi TEXT DEFAULT 'bireysel';
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS firma_unvani TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS vergi_dairesi TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS vergi_no TEXT;

-- 2. Dekont Alanı
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS dekont_url TEXT;

-- 3. Storage Bucket Ayarı (Eğer manuel oluşturmadıysanız)
-- Not: Supabase arayüzünden 'siparis-dekontlari' adında bir public bucket oluşturmanız önerilir.
