const query = "Denon PMA-600NE";
const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}&hl=tr&safe=off`;

async function testSearch() {
  console.log(`Aranıyor: ${searchUrl}`);
  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
  });

  if (!res.ok) {
    console.error(`Hata: ${res.status}`);
    return;
  }

  const html = await res.text();
  console.log(`HTML Uzunluğu: ${html.length}`);

  const imageUrls = [];
  // Method 1: "ou" pattern (Old Google)
  const ouRegex = /"ou":"(https?:\/\/[^"]+)"/g;
  let ouMatch;
  while ((ouMatch = ouRegex.exec(html)) !== null) {
      imageUrls.push(ouMatch[1]);
  }
  console.log(`Method 1 (ou) bulunan: ${imageUrls.length}`);

  // Method 2: Image URL pattern (Newer Google)
  const imgRegex = /\["(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))"/gi;
  let imgMatch;
  const method2 = [];
  while ((imgMatch = imgRegex.exec(html)) !== null) {
      if (!imgMatch[1].includes('gstatic') && !imgMatch[1].includes('google')) {
          method2.push(imgMatch[1]);
      }
  }
  console.log(`Method 2 (img) bulunan: ${method2.length}`);
  
  if (method2.length > 0) {
      console.log("Örnek URL:", method2[0]);
  }
}

testSearch();
