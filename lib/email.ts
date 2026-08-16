import { BANK_ACCOUNTS } from './bank-accounts'

// ─── Ortak Yardımcılar ────────────────────────────────────────────────────────

const BASE_STYLE = `margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Arial,sans-serif`

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    ${content}
    ${footer()}
  </div>
</body>
</html>`
}

function header(baslik: string, alt?: string): string {
  return `
  <div style="background:#1a1a1a;border-left:4px solid #DA291C;padding:24px 28px;margin-bottom:20px">
    <div style="color:#DA291C;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;margin-bottom:6px">Akdağ Elektronik</div>
    <div style="color:#fff;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em">${baslik}</div>
    ${alt ? `<div style="color:#666;font-size:13px;margin-top:4px">${alt}</div>` : ''}
  </div>`
}

function infoBox(content: string): string {
  return `<div style="background:#141414;border:1px solid #222;padding:20px 24px;margin-bottom:16px">${content}</div>`
}

function label(text: string): string {
  return `<div style="color:#888;font-size:10px;letter-spacing:0.25em;text-transform:uppercase;margin-bottom:10px">${text}</div>`
}

function statusBadge(renk: string, ikon: string, metin: string): string {
  return `
  <div style="background:${renk}18;border:1px solid ${renk}44;border-radius:4px;padding:14px 20px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">${ikon}</span>
    <span style="color:${renk};font-size:15px;font-weight:700">${metin}</span>
  </div>`
}

function footer(): string {
  return `
  <div style="background:#DA291C;padding:20px 24px;text-align:center;margin-top:24px">
    <a href="tel:+903522316915" style="color:#fff;font-size:18px;font-weight:900;text-decoration:none">+90 352 231 69 15</a>
    <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</div>
    <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-top:8px">Bu otomatik bir bilgilendirme e-postasıdır. Lütfen yanıtlamayınız.</div>
  </div>`
}

// ─── Sipariş Ürün Tablosu ─────────────────────────────────────────────────────

interface SiparisItem {
  ad: string
  fiyat: number
  adet: number
  fotograf?: string
}

function urunTablosu(urunler: SiparisItem[], toplam_tutar: number): string {
  const satirlar = urunler.map(u => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#ccc;font-size:13px">${u.ad}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#ccc;font-size:13px;text-align:center">×${u.adet}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2a2a2a;color:#ccc;font-size:13px;text-align:right">${(u.fiyat * u.adet).toLocaleString('tr-TR')} ₺</td>
    </tr>`).join('')

  return `
  <div style="background:#141414;border:1px solid #222;margin-bottom:16px;overflow:hidden">
    <div style="padding:14px 24px;border-bottom:1px solid #222">
      ${label('Sipariş Kalemleri')}
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#1a1a1a">
          <th style="padding:10px 12px;color:#666;font-size:11px;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Ürün</th>
          <th style="padding:10px 12px;color:#666;font-size:11px;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Adet</th>
          <th style="padding:10px 12px;color:#666;font-size:11px;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:0.1em">Tutar</th>
        </tr>
      </thead>
      <tbody>${satirlar}</tbody>
      <tfoot>
        <tr style="background:#1a1a1a">
          <td colspan="2" style="padding:14px 12px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Toplam</td>
          <td style="padding:14px 12px;color:#DA291C;font-size:20px;font-weight:900;text-align:right">${toplam_tutar.toLocaleString('tr-TR')} ₺</td>
        </tr>
      </tfoot>
    </table>
  </div>`
}

// ─── Kargo Firması Tespiti ─────────────────────────────────────────────────────

function kargoTakipLinki(takipNo: string): { firma: string; url: string } | null {
  if (!takipNo) return null
  const no = takipNo.trim().replace(/\s/g, '')

  if (/^1\d{10}$/.test(no) || no.startsWith('Y')) {
    return { firma: 'Yurtiçi Kargo', url: `https://www.yurticikargo.com/tr/online-islemler/gonderi-sorgula?code=${no}` }
  }
  if (/^\d{13}$/.test(no) && no.startsWith('7')) {
    return { firma: 'Aras Kargo', url: `https://www.araskargo.com.tr/ArasTrack/Track/?trackno=${no}` }
  }
  if (/^MNG/i.test(no) || /^M\d{10}/.test(no)) {
    return { firma: 'MNG Kargo', url: `https://www.mngkargo.com.tr/wps/portal/mng/main/sorgu/gondericisorgula?barkod=${no}` }
  }
  if (/^PTT/i.test(no) || no.startsWith('9')) {
    return { firma: 'PTT Kargo', url: `https://www.ptt.gov.tr/tr/main/kargo-takip?barkodNo=${no}` }
  }
  if (/^\d{10,12}$/.test(no)) {
    return { firma: 'Sürat Kargo', url: `https://www.suratkargo.com.tr/KargoSorgulama/Index?durum=1&barkod=${no}` }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Sipariş Onayı (ilk sipariş alındığında)
// ═══════════════════════════════════════════════════════════════════════════════

export interface SiparisEmailData {
  siparis_no: string
  ad_soyad: string
  email: string
  telefon: string
  urunler: SiparisItem[]
  toplam_tutar: number
  odeme_tipi: string
  notlar?: string
  is_bayi?: boolean
  bayi_adi?: string
}

export function musterionayHTML(data: SiparisEmailData): string {
  const odemeLabel: Record<string, string> = {
    kredi_karti: 'Kredi / Banka Kartı',
    kart: 'Kredi / Banka Kartı',
    havale: 'Havale / EFT',
    whatsapp: 'WhatsApp Siparişi',
  }

  const bankAccountsHTML = BANK_ACCOUNTS.map(bank => `
    <div style="margin-top:12px;padding:12px;background:#1a1a1a;border-left:3px solid #DA291C">
      <div style="color:#888;font-size:10px;text-transform:uppercase;margin-bottom:4px">${bank.bankName}</div>
      <div style="color:#ddd;font-size:13px;line-height:1.6">
        IBAN: <strong style="color:#DA291C">${bank.iban}</strong><br>
        Alıcı: ${bank.accountHolder}
      </div>
    </div>`).join('')

  return emailShell(`
    ${header('Siparişiniz Alındı', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#22c55e', '✅', 'Siparişiniz başarıyla alındı. En kısa sürede işleme alınacak.')}

    ${infoBox(`
      ${label('Müşteri Bilgileri')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        <strong style="color:#fff">${data.ad_soyad}</strong><br>
        📧 ${data.email}<br>
        📞 ${data.telefon}
        ${data.is_bayi ? `<br>🏢 Bayi: <strong style="color:#DA291C">${data.bayi_adi}</strong>` : ''}
      </div>
    `)}

    ${urunTablosu(data.urunler, data.toplam_tutar)}

    ${infoBox(`
      <span style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.15em">Ödeme Yöntemi: </span>
      <span style="color:#ddd;font-size:13px">${odemeLabel[data.odeme_tipi] || data.odeme_tipi}</span>
      ${data.odeme_tipi === 'havale' ? `
      <div style="margin-top:16px">
        <div style="color:#fff;font-size:12px;font-weight:700;margin-bottom:8px">HAVALE / EFT BİLGİLERİ</div>
        ${bankAccountsHTML}
        <div style="margin-top:12px;font-size:11px;color:#DA291C;font-style:italic">
          Açıklama kısmına mutlaka <strong>${data.siparis_no}</strong> yazınız.
        </div>
      </div>` : ''}
    `)}

    ${data.notlar ? infoBox(`
      ${label('Sipariş Notu')}
      <div style="color:#ccc;font-size:13px;font-style:italic">${data.notlar}</div>
    `) : ''}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Sipariş Onaylandı (admin tarafından)
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisOnaylandiHTML(data: { siparis_no: string; ad_soyad: string }): string {
  return emailShell(`
    ${header('Siparişiniz Onaylandı', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#3b82f6', '🔵', 'Siparişiniz onaylanmış ve hazırlık sürecine alınmıştır.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişiniz ekibimiz tarafından onaylanmıştır.
        Ürününüz en kısa sürede hazırlanarak kargoya verilecektir.<br><br>
        Herhangi bir sorunuz için bize ulaşabilirsiniz.
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Sipariş Hazırlanıyor
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisHazirlaniyorHTML(data: { siparis_no: string; ad_soyad: string }): string {
  return emailShell(`
    ${header('Siparişiniz Hazırlanıyor', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#f59e0b', '📦', 'Siparişiniz depomuzda paketleniyor.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişiniz şu an depomuzda özenle paketlenmektedir.
        Kargoya verildiğinde takip bilgilerinizi içeren ayrı bir e-posta alacaksınız.
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Kargoya Verildi
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisKargolandiHTML(data: {
  siparis_no: string
  ad_soyad: string
  kargo_takip_no?: string
}): string {
  const takip = data.kargo_takip_no ? kargoTakipLinki(data.kargo_takip_no) : null

  const takipSection = data.kargo_takip_no ? `
    ${infoBox(`
      ${label('Kargo Takip Bilgisi')}
      <div style="color:#ddd;font-size:14px;margin-bottom:12px">
        Takip No: <strong style="color:#DA291C;font-size:16px">${data.kargo_takip_no}</strong>
        ${takip ? `<br><span style="color:#888;font-size:12px">${takip.firma}</span>` : ''}
      </div>
      ${takip ? `
      <a href="${takip.url}" style="display:inline-block;padding:10px 20px;background:#DA291C;color:#fff;text-decoration:none;font-weight:700;font-size:13px;border-radius:2px">
        🚚 Kargonu Takip Et →
      </a>` : ''}
    `)}` : ''

  return emailShell(`
    ${header('Siparişiniz Kargoya Verildi', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#8b5cf6', '🚚', 'Siparişiniz kargoya teslim edildi.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişiniz kargoya verilmiştir.
        ${data.kargo_takip_no ? 'Aşağıdaki takip numarası ile kargonuzu anlık olarak takip edebilirsiniz.' : ''}
      </div>
    `)}
    ${takipSection}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Teslim Edildi
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisTeslimEdildiHTML(data: { siparis_no: string; ad_soyad: string }): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.akdagelektronik.com'

  return emailShell(`
    ${header('Siparişiniz Teslim Edildi', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#22c55e', '🎉', 'Siparişiniz başarıyla teslim edildi.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişiniz teslim edilmiştir.
        Alışverişiniz için teşekkür ederiz! 🙏<br><br>
        Ürün veya hizmetlerimiz hakkında herhangi bir sorunuz varsa bizimle iletişime geçmekten çekinmeyin.
      </div>
    `)}
    <div style="background:#141414;border:1px solid #222;padding:20px 24px;margin-bottom:16px;text-align:center">
      <div style="color:#888;font-size:12px;margin-bottom:14px">Yeni alışveriş için sizi bekliyoruz</div>
      <a href="${siteUrl}/urunler" style="display:inline-block;padding:12px 28px;background:#DA291C;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:2px;text-transform:uppercase;letter-spacing:0.05em">
        Alışverişe Devam Et →
      </a>
    </div>
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — İptal
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisIptalHTML(data: { siparis_no: string; ad_soyad: string }): string {
  return emailShell(`
    ${header('Siparişiniz İptal Edildi', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#ef4444', '❌', 'Siparişiniz iptal edilmiştir.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişiniz iptal edilmiştir.<br><br>
        Bu işlemin hatalı olduğunu düşünüyorsanız veya daha fazla bilgi almak istiyorsanız lütfen bizimle iletişime geçin.
      </div>
    `)}
    ${infoBox(`
      ${label('Bize Ulaşın')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        📞 <a href="tel:+903522316915" style="color:#DA291C;text-decoration:none">+90 352 231 69 15</a><br>
        📧 <a href="mailto:info@akdagelektronik.com" style="color:#DA291C;text-decoration:none">info@akdagelektronik.com</a>
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Ödeme Onaylandı (PayTR)
// ═══════════════════════════════════════════════════════════════════════════════

export function odemeOnaylandiHTML(data: {
  siparis_no: string
  ad_soyad: string
  toplam_tutar: number
}): string {
  return emailShell(`
    ${header('Ödemeniz Onaylandı', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#22c55e', '💳', 'Kredi/banka kartı ödemesi başarıyla alındı.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişinizin ödemesi başarıyla onaylanmıştır.<br><br>
        Ödeme Tutarı: <strong style="color:#DA291C;font-size:18px">${data.toplam_tutar.toLocaleString('tr-TR')} ₺</strong><br><br>
        Siparişiniz en kısa sürede hazırlanarak kargoya verilecektir.
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Dekont Alındı
// ═══════════════════════════════════════════════════════════════════════════════

export function dekontAlindiHTML(data: { siparis_no: string; ad_soyad: string }): string {
  return emailShell(`
    ${header('Dekontunuz Alındı', `Sipariş No: <strong style="color:#DA291C">${data.siparis_no}</strong>`)}
    ${statusBadge('#f59e0b', '📄', 'Ödeme dekontu sistemimize iletildi.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>${data.siparis_no}</strong> numaralı siparişinize ait ödeme dekontu sistemimize ulaşmıştır.<br><br>
        Ekibimiz en kısa sürede dekontu inceleyerek siparişinizi onaylayacaktır.
        Onay sonrasında ayrıca bilgilendirileceksiniz.
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMİN E-POSTASI — Yeni Sipariş Bildirimi
// ═══════════════════════════════════════════════════════════════════════════════

export function adminBildirimHTML(data: SiparisEmailData): string {
  const urunlerHTML = data.urunler.map(u =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#ccc;font-size:13px">${u.ad} ×${u.adet}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#ccc;font-size:13px;text-align:right">${(u.fiyat * u.adet).toLocaleString('tr-TR')} ₺</td>
    </tr>`
  ).join('')

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.akdagelektronik.com'

  return `<!DOCTYPE html>
<html lang="tr">
<body style="${BASE_STYLE}">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
  <div style="background:#DA291C;padding:16px 24px;margin-bottom:16px">
    <div style="color:#fff;font-size:18px;font-weight:900;text-transform:uppercase">🔔 Yeni Sipariş!</div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:2px">${data.siparis_no}</div>
  </div>
  <div style="background:#141414;border:1px solid #222;padding:16px 24px;margin-bottom:12px">
    <div style="color:#fff;font-size:15px;font-weight:700">${data.ad_soyad}</div>
    <div style="color:#888;font-size:13px">${data.email} | ${data.telefon}</div>
    ${data.is_bayi ? `<div style="color:#DA291C;font-size:12px;margin-top:4px">🏢 Bayi: ${data.bayi_adi}</div>` : ''}
  </div>
  <div style="background:#141414;border:1px solid #222;margin-bottom:12px">
    <table style="width:100%;border-collapse:collapse">${urunlerHTML}
      <tr>
        <td style="padding:12px;background:#1a1a1a;color:#888;font-size:11px;text-transform:uppercase">Toplam</td>
        <td style="padding:12px;background:#1a1a1a;color:#DA291C;font-size:18px;font-weight:900;text-align:right">${data.toplam_tutar.toLocaleString('tr-TR')} ₺</td>
      </tr>
    </table>
  </div>
  <div style="text-align:center;padding:16px 0">
    <a href="${siteUrl}/admin" style="display:inline-block;padding:12px 28px;background:#DA291C;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:2px">
      Admin Paneline Git →
    </a>
  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMİN E-POSTASI — Dekont Bildirimi
// ═══════════════════════════════════════════════════════════════════════════════

export function dekontAdminHTML(data: {
  siparis_no: string
  ad_soyad: string
  dekont_url: string
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.akdagelektronik.com'

  return `<!DOCTYPE html>
<html lang="tr">
<body style="${BASE_STYLE}">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
  <div style="background:#DA291C;padding:16px 24px;margin-bottom:16px">
    <div style="color:#fff;font-size:18px;font-weight:900;text-transform:uppercase">📄 Yeni Dekont Yüklendi</div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:2px">${data.siparis_no}</div>
  </div>
  <div style="background:#141414;border:1px solid #222;padding:16px 24px;margin-bottom:12px">
    <div style="color:#888;font-size:11px;text-transform:uppercase;margin-bottom:6px">Müşteri</div>
    <div style="color:#fff;font-size:15px;font-weight:700">${data.ad_soyad}</div>
    <div style="color:#888;font-size:13px;margin-top:4px">Sipariş No: ${data.siparis_no}</div>
  </div>
  <div style="background:#141414;border:1px solid #222;padding:16px 24px;margin-bottom:12px">
    <div style="color:#888;font-size:11px;text-transform:uppercase;margin-bottom:12px">Dekontu inceleyin ve siparişi onaylayın</div>
    <a href="${data.dekont_url}" style="display:inline-block;padding:10px 20px;background:#1a1a1a;border:1px solid #DA291C;color:#DA291C;text-decoration:none;font-weight:700;font-size:13px;margin-right:8px">
      Dekontu Gör →
    </a>
    <a href="${siteUrl}/admin" style="display:inline-block;padding:10px 20px;background:#DA291C;color:#fff;text-decoration:none;font-weight:700;font-size:13px;margin-top:8px">
      Admin Paneli →
    </a>
  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMİN E-POSTASI — İletişim Formu
// ═══════════════════════════════════════════════════════════════════════════════

export function iletisimAdminHTML(data: {
  ad: string
  soyad?: string | null
  telefon?: string | null
  email: string
  konu?: string | null
  mesaj: string
}): string {
  const adSoyad = [data.ad, data.soyad].filter(Boolean).join(' ')
  return `<!DOCTYPE html>
<html lang="tr">
<body style="${BASE_STYLE}">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="background:#DA291C;padding:14px 20px;margin-bottom:16px">
    <div style="color:#fff;font-size:16px;font-weight:900;text-transform:uppercase">📩 Yeni İletişim Mesajı</div>
  </div>
  <div style="background:#141414;border:1px solid #222;padding:20px;color:#ccc;font-size:14px;line-height:1.6">
    <p style="margin:0 0 8px"><strong style="color:#fff">Gönderen:</strong> ${adSoyad}</p>
    <p style="margin:0 0 8px"><strong style="color:#fff">E-posta:</strong> <a href="mailto:${data.email}" style="color:#DA291C">${data.email}</a></p>
    ${data.telefon ? `<p style="margin:0 0 8px"><strong style="color:#fff">Telefon:</strong> ${data.telefon}</p>` : ''}
    ${data.konu ? `<p style="margin:0 0 8px"><strong style="color:#fff">Konu:</strong> ${data.konu}</p>` : ''}
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2a2a2a;white-space:pre-wrap;color:#aaa">${data.mesaj}</div>
  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Bayi Hesabı Onaylandı
// ═══════════════════════════════════════════════════════════════════════════════

export function bayiOnaylandiHTML(data: {
  firma_adi: string
  yetkili_adi: string
  panel_url: string
  otp_url?: string
  is_yeni_kullanici?: boolean
}): string {
  const sifreSection = data.is_yeni_kullanici && data.otp_url ? `
    ${infoBox(`
      ${label('Şifrenizi Belirleyin')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Bayi panelinize giriş yapabilmek için önce <strong style="color:#fff">şifrenizi belirlemeniz</strong> gerekmektedir.<br><br>
        Aşağıdaki butona tıklayın, e-posta adresinizi girin. Size gelen <strong style="color:#DA291C">6 haneli doğrulama kodunu</strong> girerek şifrenizi belirleyebilirsiniz.
      </div>
    `)}
    <div style="background:#141414;border:1px solid #222;padding:20px 24px;margin-bottom:16px;text-align:center">
      <a href="${data.otp_url}" style="display:inline-block;padding:12px 28px;background:#DA291C;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:2px;text-transform:uppercase;letter-spacing:0.05em">
        Şifremi Belirle →
      </a>
    </div>
  ` : `
    <div style="background:#141414;border:1px solid #222;padding:20px 24px;margin-bottom:16px;text-align:center">
      <div style="color:#888;font-size:12px;margin-bottom:14px">Bayi panelinize giriş yapmak için aşağıdaki butona tıklayın</div>
      <a href="${data.panel_url}" style="display:inline-block;padding:12px 28px;background:#DA291C;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:2px;text-transform:uppercase;letter-spacing:0.05em">
        Bayi Paneline Git →
      </a>
    </div>
  `

  return emailShell(`
    ${header('Bayi Hesabınız Onaylandı 🎉', 'Akdağ Elektronik Bayi Ağı')}
    ${statusBadge('#22c55e', '✅', 'Bayi başvurunuz onaylandı. Hoş geldiniz!')}
    ${infoBox(`
      ${label('Bayi Bilgileri')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Firma: <strong style="color:#fff">${data.firma_adi}</strong><br>
        Yetkili: <strong style="color:#fff">${data.yetkili_adi}</strong>
      </div>
    `)}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.yetkili_adi}</strong>,<br><br>
        <strong>${data.firma_adi}</strong> firması adına yaptığınız bayi başvurusu onaylanmıştır.<br><br>
        Artık bayi fiyatlarına erişebilir, özel teklif oluşturabilir ve siparişlerinizi takip edebilirsiniz.
      </div>
    `)}
    ${sifreSection}
  `)
}


// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Bayi Hesabı Askıya Alındı
// ═══════════════════════════════════════════════════════════════════════════════

export function bayiAskiyaAlindiHTML(data: {
  firma_adi: string
  yetkili_adi: string
}): string {
  return emailShell(`
    ${header('Bayi Hesabınız Askıya Alındı', 'Akdağ Elektronik Bayi Ağı')}
    ${statusBadge('#f59e0b', '⚠️', 'Bayi hesabınız geçici olarak askıya alınmıştır.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.yetkili_adi}</strong>,<br><br>
        <strong>${data.firma_adi}</strong> firmasına ait bayi hesabınız geçici olarak askıya alınmıştır.<br><br>
        Bu konuda daha fazla bilgi almak için lütfen bizimle iletişime geçin.
      </div>
    `)}
    ${infoBox(`
      ${label('Bize Ulaşın')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        📞 <a href="tel:+903522316915" style="color:#DA291C;text-decoration:none">+90 352 231 69 15</a><br>
        📧 <a href="mailto:info@akdagelektronik.com" style="color:#DA291C;text-decoration:none">info@akdagelektronik.com</a>
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAYİ E-POSTASI — Toplu Kampanya / Duyuru
// ═══════════════════════════════════════════════════════════════════════════════

export function kampanyaHTML(data: {
  baslik: string
  icerik: string
  resim_url?: string
  link_url?: string
}): string {
  const resimSection = data.resim_url ? `
    <div style="margin-bottom:20px;text-align:center">
      <img src="${data.resim_url}" alt="${data.baslik}" style="max-width:100%;height:auto;border-radius:4px;border:1px solid #222" />
    </div>
  ` : ''

  const linkSection = data.link_url ? `
    <div style="margin-top:24px;text-align:center">
      <a href="${data.link_url}" style="display:inline-block;padding:14px 32px;background:#DA291C;color:#fff;text-decoration:none;font-weight:900;font-size:15px;border-radius:2px;text-transform:uppercase;letter-spacing:0.05em">
        Hemen İncele →
      </a>
    </div>
  ` : ''

  // İçerik satır sonlarını (newline) <br> tag'ine çevirelim
  const formatliIcerik = data.icerik.replace(/\\n/g, '<br>')

  return emailShell(`
    ${header(data.baslik, 'Özel Kampanya ve Duyuru')}
    
    <div style="background:#141414;border:1px solid #222;padding:24px;margin-bottom:16px">
      ${resimSection}
      
      <div style="color:#ddd;font-size:15px;line-height:1.8;white-space:pre-wrap;">${formatliIcerik}</div>
      
      ${linkSection}
    </div>
    
    <div style="text-align:center;margin-top:20px;margin-bottom:10px">
      <div style="color:#888;font-size:12px">Bizi tercih ettiğiniz için teşekkür ederiz.</div>
      <div style="color:#DA291C;font-size:14px;font-weight:700;margin-top:4px">Akdağ Elektronik B2B Bayi Portalı</div>
    </div>
  `)
}
