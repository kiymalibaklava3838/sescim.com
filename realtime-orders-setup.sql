-- ==============================================================================
-- Sescim.com - Siparişler Tablosu Realtime (Anlık Bildirim) ve Kopya Kimliği Kurulumu
-- ==============================================================================

-- 1. siparisler tablosunu Supabase Realtime yayınına ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'siparisler'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.siparisler;
  END IF;
END $$;

-- 2. UPDATE/DELETE olaylarında satırın önceki durumunun (payload.old) tam iletilmesi için
ALTER TABLE public.siparisler REPLICA IDENTITY FULL;

-- 3. İndeksler (Sipariş sorgu ve filtreleme hızlandırma)
CREATE INDEX IF NOT EXISTS idx_siparisler_created_at_desc ON public.siparisler (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_siparisler_durum_odeme ON public.siparisler (durum, odeme_durumu);
