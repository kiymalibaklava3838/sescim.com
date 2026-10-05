-- =====================================================================
-- sescim.com - siparis_kalemleri RLS Politikaları
-- Bu migration, siparis_kalemleri tablosunun istemci tarafından
-- güvenli bir şekilde okunabilmesini sağlar.
-- =====================================================================

ALTER TABLE public.siparis_kalemleri ENABLE ROW LEVEL SECURITY;

-- 1. Herkes sipariş anında kalem ekleyebilir (Anonim veya Üye)
DROP POLICY IF EXISTS "Herkes siparis kalemi ekleyebilir" ON public.siparis_kalemleri;
CREATE POLICY "Herkes siparis kalemi ekleyebilir"
  ON public.siparis_kalemleri FOR INSERT TO public
  WITH CHECK (true);

-- 2. Kullanıcı kendi siparişinin kalemlerini görebilir
DROP POLICY IF EXISTS "Kullanici kendi siparis kalemlerini gorebilir" ON public.siparis_kalemleri;
CREATE POLICY "Kullanici kendi siparis kalemlerini gorebilir"
  ON public.siparis_kalemleri FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.siparisler s
      WHERE s.id = siparis_kalemleri.siparis_id
      AND (s.user_id = auth.uid() OR s.email = (auth.jwt() ->> 'email'))
    )
  );

-- 3. Site adminleri tüm sipariş kalemlerini görebilir ve yönetebilir
DROP POLICY IF EXISTS "Site admin siparis kalemleri tam yetki" ON public.siparis_kalemleri;
CREATE POLICY "Site admin siparis kalemleri tam yetki"
  ON public.siparis_kalemleri FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.site_admins a WHERE a.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.site_admins a WHERE a.user_id = auth.uid())
  );
