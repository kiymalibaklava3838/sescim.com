const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function syncProducts() {
  const sescim = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const akdag = createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL, process.env.AKDAG_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_AKDAG_SUPABASE_ANON_KEY);

  // Fetch Spekon from Akdag
  const { data: spekon } = await akdag.from('urunler').select('*').eq('id', '5871d834-2fe7-424e-8a1f-db881d248689').single();

  console.log('Fetched Spekon from Akdag:', spekon?.ad);

  // Re-insert Spekon into Sescim urunler with full Akdag data
  const { error: insErr } = await sescim.from('urunler').insert({
    id: spekon.id,
    ad: spekon.ad,
    slug: spekon.slug,
    aciklama: spekon.aciklama,
    fotograflar: spekon.fotograflar,
    fiyat: spekon.fiyat,
    bayi_fiyati: spekon.bayi_fiyati,
    para_birimi: spekon.para_birimi,
    stok_adedi: spekon.stok_adedi,
    stok_durumu: spekon.stok_durumu,
    kritik_stok: spekon.kritik_stok,
    marka: spekon.marka,
    model_kodu: spekon.model_kodu,
    aktif: true,
    sescim_aktif: true,
    sescim_fiyat: 23.49,
    sescim_indirimli_fiyat: 21,
    created_at: spekon.created_at
  });
  console.log('Spekon insert error:', insErr);

  // Re-insert into flas_indirimler
  const { error: flashErr } = await sescim.from('flas_indirimler').insert({
    id: '75820dab-e01b-4f3c-9e95-1162b967e363',
    urun_id: spekon.id,
    indirimli_fiyat: 21,
    baslangic_tarihi: '2026-10-09T17:47:00+00:00',
    bitis_tarihi: '2026-10-16T17:47:00+00:00',
    aktif: true
  });
  console.log('Flash insert error:', flashErr);

  // Update Westa in Sescim with full Akdag data
  const { data: westa } = await akdag.from('urunler').select('*').eq('id', 'f0d7d88e-e4ee-4071-9d55-66aa0bd5d88f').single();
  if (westa) {
    const { error: wErr } = await sescim.from('urunler').update({
      aciklama: westa.aciklama,
      stok_adedi: westa.stok_adedi,
      stok_durumu: westa.stok_durumu,
      fotograflar: westa.fotograflar,
      fiyat: westa.fiyat,
      marka: westa.marka,
      model_kodu: westa.model_kodu
    }).eq('id', westa.id);
    console.log('Westa update error:', wErr);
  }

  // Update RCF in Sescim with full Akdag data
  const { data: rcf } = await akdag.from('urunler').select('*').eq('id', '5d0e77ac-9daf-4630-a4b9-d3f216c76bb5').single();
  if (rcf) {
    const { error: rErr } = await sescim.from('urunler').update({
      aciklama: rcf.aciklama,
      stok_adedi: rcf.stok_adedi,
      stok_durumu: rcf.stok_durumu,
      fotograflar: rcf.fotograflar,
      fiyat: rcf.fiyat,
      marka: rcf.marka,
      model_kodu: rcf.model_kodu
    }).eq('id', rcf.id);
    console.log('RCF update error:', rErr);
  }

  console.log('Done sync!');
}
syncProducts();
