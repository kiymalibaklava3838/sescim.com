const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function analyzeExtensionsAndChars() {
  const akdag = createClient(process.env.NEXT_PUBLIC_AKDAG_SUPABASE_URL, process.env.NEXT_PUBLIC_AKDAG_SUPABASE_ANON_KEY);
  const { data: prods } = await akdag.from('urunler').select('id, ad, slug, fotograflar');
  
  const extCount = {};
  const specialChars = [];

  for (const p of prods) {
    if (!p.fotograflar || !p.fotograflar[0]) continue;
    const url = p.fotograflar[0];
    const pathname = new URL(url).pathname;
    const ext = pathname.split('.').pop().toLowerCase();
    extCount[ext] = (extCount[ext] || 0) + 1;
    
    // Check if pathname has any encoding or special chars like +, %, (), spaces, commas
    if (/[+()%'",; ]/.test(pathname)) {
      specialChars.push({ ad: p.ad, slug: p.slug, pathname });
    }
  }

  console.log('Extensions:', extCount);
  console.log('URLs with special characters in pathname count:', specialChars.length);
  if (specialChars.length > 0) {
    console.log('Sample special chars:', specialChars.slice(0, 10));
  }
}
analyzeExtensionsAndChars();
