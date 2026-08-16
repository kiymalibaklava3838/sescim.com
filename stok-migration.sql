-- ═══════════════════════════════════════════════════════════════════
-- STOK ATOMIC UPDATE FONKSIYONU
-- Bu SQL'i Supabase Dashboard → SQL Editor'da çalıştırın.
-- Race condition olmadan eş zamanlı siparişlerde güvenli stok düşürür.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION atomic_stok_dusur(
  p_urun_id UUID,
  p_adet    INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_yeni_stok INTEGER;
BEGIN
  -- PostgreSQL seviyesinde atomic: GREATEST ile negatif stok engellenir
  UPDATE urunler
  SET
    stok_adedi = GREATEST(stok_adedi - p_adet, 0),
    stok_durumu = CASE
      WHEN GREATEST(stok_adedi - p_adet, 0) <= 0 THEN 'tukendi'
      ELSE 'stokta'
    END,
    updated_at = NOW()
  WHERE id = p_urun_id
  RETURNING stok_adedi INTO v_yeni_stok;
END;
$$;

-- Fonksiyona erişim ver
GRANT EXECUTE ON FUNCTION atomic_stok_dusur(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION atomic_stok_dusur(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION atomic_stok_dusur(UUID, INTEGER) TO authenticated;
