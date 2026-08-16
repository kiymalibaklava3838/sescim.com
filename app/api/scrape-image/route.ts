import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Sorgu parametresi (query) gerekli.' }, { status: 400 });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_CX = process.env.GOOGLE_CX;

    // 1) GOOGLE CUSTOM SEARCH API (Önerilen)
    if (GOOGLE_API_KEY && GOOGLE_CX) {
      try {
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&searchType=image&num=5`;
        const gRes = await fetch(googleUrl);
        if (gRes.ok) {
          const gData = await gRes.json();
          const images = gData.items?.map((item: any) => item.link) || [];
          if (images.length > 0) return NextResponse.json({ images, provider: 'google_api' });
        }
      } catch (e) {
        console.error('Google API Error:', e);
      }
    }

    // 2) FALLBACK: GELİŞMİŞ SCRAPING (Vercel Uyumlu)
    // Farklı bir User-Agent ve daha detaylı bir arama pattern'ı
    const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}&hl=tr&safe=off`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/',
      },
    });

    if (!res.ok) return NextResponse.json({ images: [], error: 'Google erişim hatası' }, { status: 200 });

    const html = await res.text();
    const imageUrls: string[] = [];

    // Pattern 1: Standart HTTPS URL'leri (Regex daha esnek hale getirildi)
    const imgPatterns = [
      /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif))",\d+,\d+\]/gi,
      /imgurl=(https?:\/\/[^&]+)/gi,
      /"https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)"/gi
    ];

    for (const pattern of imgPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && imageUrls.length < 10) {
        const url = match[1] || match[0].replace(/"/g, '');
        if (url.includes('gstatic.com') || url.includes('google.com') || url.includes('encrypted-tbn')) continue;
        if (!imageUrls.includes(url)) imageUrls.push(url);
      }
    }

    // Pattern 2: Base64 Thumbnails (Eğer normal URL bulunamazsa)
    if (imageUrls.length < 3) {
      const base64Regex = /data:image\/(?:jpeg|png|gif);base64,[^"']+/g;
      let b64Match;
      while ((b64Match = base64Regex.exec(html)) !== null && imageUrls.length < 10) {
        if (!imageUrls.includes(b64Match[0])) imageUrls.push(b64Match[0]);
      }
    }

    return NextResponse.json({ 
      images: imageUrls.slice(0, 8), 
      provider: 'improved_fallback',
      foundCount: imageUrls.length 
    });

  } catch (error: any) {
    return NextResponse.json({ images: [], error: error.message }, { status: 200 });
  }
}
