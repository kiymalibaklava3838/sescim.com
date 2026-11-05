-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: flas_indirimler tablosuna fiyat_para_birimi kolonu ekle
--
-- AMAÇ: Admin TL ile flaş indirim fiyatı girdiğinde, bu fiyat TL olarak
--        veritabanında saklanır. Döviz çevirimi yapılmaz, kur dalgalanmalarından
--        etkilenmez. Mevcut USD/EUR kayıtlar da kendi para birimiyle korunur.
--
-- UYGULAMA: Supabase SQL Editor'da çalıştırın.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE flas_indirimler
  ADD COLUMN IF NOT EXISTS fiyat_para_birimi VARCHAR(3) DEFAULT 'TRY';

-- Mevcut kayıtlar: para_birimi bilgisi yoktu, varsayılan olarak 'TRY' bırak.
-- (Eğer mevcut kayıtlar USD ise elle güncellemeniz gerekebilir)
-- UPDATE flas_indirimler SET fiyat_para_birimi = 'USD' WHERE id IN (...);

-- outlet_urunler için de aynı kolonu ekle (tutarlılık için)
ALTER TABLE outlet_urunler
  ADD COLUMN IF NOT EXISTS fiyat_para_birimi VARCHAR(3) DEFAULT 'TRY';
