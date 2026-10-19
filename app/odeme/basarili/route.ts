import { NextRequest, NextResponse } from 'next/server'

/**
 * PayTR iFrame, ödeme başarılı olduğunda merchant_ok_url adresine HTTP POST ile yönlendirir.
 * Next.js App Router'da page.tsx dosyaları yalnızca GET isteklerini kabul eder.
 * Bu route handler, POST isteklerini 303 See Other ile aynı URL'e GET olarak yönlendirir.
 * Böylece PayTR'dan gelen POST isteği page.tsx tarafından sorunsuz render edilir.
 */
export async function POST(req: NextRequest) {
  // POST body'deki form verilerini query parametrelerine dönüştür
  const url = new URL(req.url)

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      formData.forEach((value, key) => {
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, String(value))
        }
      })
    }
  } catch {
    // Form verisi okunamazsa mevcut query params ile devam et
  }

  // 303 See Other: Tarayıcı bu yanıtı alınca GET ile yönlendirir
  return NextResponse.redirect(url.toString(), 303)
}
