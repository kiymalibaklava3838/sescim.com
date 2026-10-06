import { NextRequest, NextResponse } from 'next/server'
import { fetchLabelSvg } from '@/lib/basit-kargo'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const labelId = params.id
    if (!labelId) {
      return new NextResponse('Etiket ID belirtilmedi', { status: 400 })
    }

    const svgContent = await fetchLabelSvg(labelId)

    // Güvenlik: SVG içeriğini Base64 data-URI'ye dönüştürerek <img> içinde basıyoruz.
    // W3C standartlarına göre <img> etiketinde yüklenen SVG'lerde tüm JavaScript yürütmesi tamamen engellenir (XSS koruması).
    const base64Svg = Buffer.from(svgContent, 'utf-8').toString('base64')
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`

    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kargo Sevk Etiketi - ${labelId}</title>
  <style>
    @page {
      size: 100mm 150mm;
      margin: 0;
    }
    @media print {
      body { margin: 0; padding: 0; background: white; }
      .no-print { display: none !important; }
      .label-container { box-shadow: none !important; padding: 0 !important; }
    }
    body {
      margin: 0;
      padding: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .toolbar {
      width: 100%;
      max-width: 500px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .btn:hover { background: #0369a1; }
    .label-container {
      background: white;
      padding: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      border-radius: 4px;
      max-width: 100%;
    }
    .label-img {
      display: block;
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div><strong>Basit Kargo Etiketi:</strong> ${labelId}</div>
    <button class="btn" onclick="window.print()">🖨️ Yazdır (Ctrl+P)</button>
  </div>
  <div class="label-container">
    <img src="${dataUri}" alt="Kargo Sevk Etiketi" class="label-img" />
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      },
    })
  } catch (err: any) {
    console.error('[cargo/label] Etiket getirme hatası:', err)
    return new NextResponse(`Etiket yüklenemedi: ${err.message}`, { status: 500 })
  }
}
