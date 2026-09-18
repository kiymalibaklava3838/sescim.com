-- Siparişler tablosuna opsiyonel ek kolonları ekleme
-- Bu scripti Supabase Dashboard -> SQL Editor üzerinden çalıştırabilirsiniz.
-- Not: Kodlarımız bu kolonlar olmasa dahi güvenli çalışacak şekilde uyarlanmıştır.

-- 1. Fatura ve Kargo Alanları
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS fatura_tipi TEXT DEFAULT 'bireysel';
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS firma_unvani TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS vergi_dairesi TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS vergi_no TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS teslimat_tipi TEXT DEFAULT 'kargo';
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS kargo_firmasi TEXT;

-- 2. Kur ve Dekont Alanları
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS dolar_kuru NUMERIC;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS euro_kuru NUMERIC;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS dekont_url TEXT;
ALTER TABLE siparisler ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
