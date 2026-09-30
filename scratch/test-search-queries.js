const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSearchQueries() {
  const akdag = createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL, process.env.NEXT_PUBLIC_AKDAG_SUPABASE_ANON_KEY);
  
  const testTerms = ['jbl', 'yamaha', 'shure', 'amfi', 'hoparlor', 'mikrofon', 'stand', 'kablo'];
  
  for (const q of testTerms) {
    const { data, error } = await akdag
      .from('urunler')
      .select('id, slug, ad, kategori, fotograflar, fiyat, indirimli_fiyat, para_birimi, marka')
      .or(`ad.ilike.%${q}%,marka.ilike.%${q}%`)
      .limit(6);
      
    if (error) {
      console.log('Error for query', q, error);
      continue;
    }
    
    console.log(`=== Query: ${q} (found ${data.length}) ===`);
    data.forEach(p => {
      console.log(`- [${p.ad}] has ${p.fotograflar ? p.fotograflar.length : 'NULL'} photos. First: ${p.fotograflar?.[0] ? p.fotograflar[0].slice(0, 70) + '...' : 'NONE'}`);
    });
  }
}
testSearchQueries();
