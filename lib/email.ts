import { BANK_ACCOUNTS } from './bank-accounts'
import { getSiteUrl } from './site-url'

// ─── Ortak Stil ve Yardımcılar ───────────────────────────────────────────────

const BASE_STYLE = `margin:0;padding:0;background-color:#0b0b0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e5e5`

function emailShell(content: string): string {
  const siteUrl = getSiteUrl()

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <title>sescim.com</title>
</head>
<body style="${BASE_STYLE}">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0b0b0b;padding:28px 12px">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#141414;border:1px solid #262626;border-radius:12px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5)">
          <!-- BRAND HEADER -->
          <tr>
            <td style="padding:28px 28px 20px;border-bottom:1px solid #222;background-color:#111">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${siteUrl}" style="text-decoration:none;display:inline-block">
                      <span style="font-size:26px;font-weight:900;letter-spacing:1px;color:#ffffff;font-family:Arial,Helvetica,sans-serif">SES<span style="color:#DA291C">CİM</span><span style="color:#737373;font-size:15px;font-weight:400">.com</span></span>
                    </a>
                    <div style="color:#888;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;margin-top:3px">Yeni Nesil Müzik Market</div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display:inline-block;padding:4px 10px;border-radius:20px;background-color:rgba(218,41,28,0.12);color:#DA291C;border:1px solid rgba(218,41,28,0.3);font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
                      Akdağ Elektronik Güvencesiyle
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:28px">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#0e0e0e;border-top:1px solid #222;padding:28px 24px;text-align:center">
              <div style="margin-bottom:14px">
                <a href="${siteUrl}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;margin:0 10px">Ana Sayfa</a>
                <span style="color:#333">•</span>
                <a href="${siteUrl}/siparis-takip" style="color:#DA291C;text-decoration:none;font-weight:700;font-size:13px;margin:0 10px">Sipariş Takibi</a>
                <span style="color:#333">•</span>
                <a href="${siteUrl}/iletisim" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;margin:0 10px">İletişim</a>
              </div>

              <div style="margin-bottom:12px">
                <a href="tel:+903522316915" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">📞 +90 352 231 69 15</a>
                <span style="color:#444;margin:0 8px">|</span>
                <a href="mailto:info@sescim.com" style="color:#DA291C;font-size:14px;font-weight:600;text-decoration:none">✉️ info@sescim.com</a>
              </div>

              <div style="color:#666;font-size:11px;line-height:1.6;margin-bottom:8px">
                Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri
              </div>

              <div style="color:#444;font-size:10px;line-height:1.5">
                © ${new Date().getFullYear()} sescim.com — Akdağ Elektronik San. ve Tic. Ltd. Şti.<br>
                Bu otomatik bir bilgilendirme e-postasıdır.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function header(baslik: string, alt?: string): string {
  return `
  <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #222">
    <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0 0 6px 0;letter-spacing:-0.01em">${baslik}</h1>
    ${alt ? `<div style="color:#a3a3a3;font-size:13px;margin:0">${alt}</div>` : ''}
  </div>`
}

function infoBox(content: string): string {
  return `<div style="background-color:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:18px 20px;margin-bottom:18px">${content}</div>`
}

function label(text: string): string {
  return `<div style="color:#737373;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;margin-bottom:8px">${text}</div>`
}

function statusBadge(renk: string, ikon: string, metin: string): string {
  return `
  <div style="background-color:${renk}18;border:1px solid ${renk}44;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
    <span style="font-size:20px;line-height:1">${ikon}</span>
    <span style="color:${renk};font-size:14px;font-weight:700">${metin}</span>
  </div>`
}

// ─── Sipariş Ürün Tablosu ─────────────────────────────────────────────────────

export interface SiparisItem {
  ad: string
  fiyat: number
  adet: number
  fotograf?: string
}

function urunTablosu(urunler: SiparisItem[], toplam_tutar: number): string {
  const satirlar = urunler.map(u => `
    <tr>
      <td style="padding:12px 10px;border-bottom:1px solid #222;color:#ffffff;font-size:13px;font-weight:500">
        <div style="display:flex;align-items:center;gap:10px">
          ${u.fotograf ? `<img src="${u.fotograf}" alt="${u.ad}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #333;background:#fff" />` : ''}
          <span>${u.ad}</span>
        </div>
      </td>
      <td style="padding:12px 10px;border-bottom:1px solid #222;color:#a3a3a3;font-size:13px;text-align:center">×${u.adet}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #222;color:#ffffff;font-size:13px;font-weight:700;text-align:right">${(u.fiyat * u.adet).toLocaleString('tr-TR')} ₺</td>
    </tr>`).join('')

  return `
  <div style="background-color:#181818;border:1px solid #262626;border-radius:8px;margin-bottom:20px;overflow:hidden">
    <div style="padding:12px 18px;background-color:#1f1f1f;border-bottom:1px solid #262626">
      ${label('Sipariş Kalemleri')}
    </div>
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead>
        <tr style="background-color:#161616">
          <th style="padding:10px 10px;color:#737373;font-size:10px;text-align:left;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Ürün</th>
          <th style="padding:10px 10px;color:#737373;font-size:10px;text-align:center;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Adet</th>
          <th style="padding:10px 10px;color:#737373;font-size:10px;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Tutar</th>
        </tr>
      </thead>
      <tbody>${satirlar}</tbody>
      <tfoot>
        <tr style="background-color:#1a1a1a">
          <td colspan="2" style="padding:14px 12px;color:#888;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Toplam Tutar</td>
          <td style="padding:14px 12px;color:#DA291C;font-size:18px;font-weight:900;text-align:right">${toplam_tutar.toLocaleString('tr-TR')} ₺</td>
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
  const siteUrl = getSiteUrl()
  const odemeLabel: Record<string, string> = {
    kredi_karti: 'Kredi / Banka Kartı',
    kart: 'Kredi / Banka Kartı',
    havale: 'Havale / EFT',
    whatsapp: 'WhatsApp Siparişi',
  }

  const bankAccountsHTML = BANK_ACCOUNTS.map(bank => `
    <div style="margin-top:10px;padding:12px 14px;background-color:#141414;border-left:3px solid #DA291C;border-radius:4px">
      <div style="color:#888;font-size:10px;text-transform:uppercase;font-weight:700;margin-bottom:3px">${bank.bankName} ${bank.branch ? `(${bank.branch})` : ''}</div>
      <div style="color:#ddd;font-size:13px;line-height:1.6">
        IBAN: <strong style="color:#DA291C;letter-spacing:0.5px">${bank.iban}</strong><br>
        Alıcı: <strong style="color:#fff">${bank.accountHolder}</strong>
      </div>
    </div>`).join('')

  return emailShell(`
    ${header('Siparişiniz Alındı! 🎵', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#22c55e', '✅', 'Siparişiniz başarıyla alındı. En kısa sürede işleme alınacaktır.')}

    ${infoBox(`
      ${label('Müşteri ve Teslimat Bilgisi')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        <strong style="color:#fff;font-size:15px">${data.ad_soyad}</strong><br>
        ✉️ ${data.email}<br>
        📞 ${data.telefon}
        ${data.is_bayi ? `<br>🏢 Bayi: <strong style="color:#DA291C">${data.bayi_adi}</strong>` : ''}
      </div>
    `)}

    ${urunTablosu(data.urunler, data.toplam_tutar)}

    ${infoBox(`
      ${label('Ödeme Detayı')}
      <div style="color:#ddd;font-size:14px">
        Yöntem: <strong style="color:#fff">${odemeLabel[data.odeme_tipi] || data.odeme_tipi}</strong>
      </div>
      ${data.odeme_tipi === 'havale' ? `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2a2a2a">
        <div style="color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Banka Hesap Bilgilerimiz</div>
        ${bankAccountsHTML}
        <div style="margin-top:12px;padding:10px 14px;background-color:rgba(218,41,28,0.1);border-radius:4px;border:1px dashed #DA291C;font-size:12px;color:#DA291C">
          ⚠️ <strong>Önemli:</strong> Lütfen havale/EFT açıklama kısmına yalnızca <strong>${data.siparis_no}</strong> yazınız.
        </div>
      </div>` : ''}
    `)}

    ${data.notlar ? infoBox(`
      ${label('Sipariş Notunuz')}
      <div style="color:#ccc;font-size:13px;font-style:italic">"${data.notlar}"</div>
    `) : ''}

    <div style="text-align:center;padding:12px 0">
      <a href="${siteUrl}/siparis-takip?kod=${data.siparis_no}" style="display:inline-block;padding:14px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:6px;box-shadow:0 4px 14px rgba(218,41,28,0.3)">
        Sipariş Durumunu Takip Et →
      </a>
    </div>
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Sipariş Onaylandı (admin tarafından)
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisOnaylandiHTML(data: { siparis_no: string; ad_soyad: string }): string {
  const siteUrl = getSiteUrl()
  return emailShell(`
    ${header('Siparişiniz Onaylandı 🎉', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#3b82f6', '🔵', 'Siparişiniz operasyon ekibimiz tarafından onaylandı.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişiniz onaylanmış olup depo hazırlık sürecine alınmıştır.
        Ürününüz en yüksek korumayla özenle ambalajlanacak ve kargoya teslim edilecektir.<br><br>
        Kargoya verildiğinde takip numaranız e-posta ve SMS yoluyla paylaşılacaktır.
      </div>
    `)}
    <div style="text-align:center;padding:12px 0">
      <a href="${siteUrl}/siparis-takip?kod=${data.siparis_no}" style="display:inline-block;padding:12px 24px;background-color:#222;border:1px solid #333;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;border-radius:6px">
        Siparişimi Takip Et
      </a>
    </div>
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Sipariş Hazırlanıyor
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisHazirlaniyorHTML(data: { siparis_no: string; ad_soyad: string }): string {
  const siteUrl = getSiteUrl()
  return emailShell(`
    ${header('Siparişiniz Paketleniyor 📦', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#f59e0b', '📦', 'Siparişiniz teknik ekibimizce kontrol edilip paketleniyor.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişinizdeki müzik ekipmanlarınız son kalite kontrolleri yapılarak darbeye dayanıklı şekilde paketlenmektedir.
        Günün kargo sevkiyat saatinde anlaşmalı kargo firmamıza teslim edilecektir.
      </div>
    `)}
    <div style="text-align:center;padding:8px 0">
      <a href="${siteUrl}/siparis-takip?kod=${data.siparis_no}" style="display:inline-block;padding:12px 24px;background-color:#222;border:1px solid #333;color:#ffffff;text-decoration:none;font-weight:600;font-size:13px;border-radius:6px">
        Sipariş Detayı
      </a>
    </div>
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
  const siteUrl = getSiteUrl()
  const takip = data.kargo_takip_no ? kargoTakipLinki(data.kargo_takip_no) : null

  const takipSection = data.kargo_takip_no ? `
    ${infoBox(`
      ${label('Kargo Takip Bilgileri')}
      <div style="color:#ddd;font-size:14px;margin-bottom:14px">
        Kargo Takip Kodu: <strong style="color:#DA291C;font-size:16px;font-family:monospace;letter-spacing:1px">${data.kargo_takip_no}</strong>
        ${takip ? `<br><span style="color:#888;font-size:13px">Kargo Firması: <strong style="color:#fff">${takip.firma}</strong></span>` : ''}
      </div>
      ${takip ? `
      <div style="text-align:center;padding:6px 0">
        <a href="${takip.url}" style="display:inline-block;padding:14px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:6px;box-shadow:0 4px 14px rgba(218,41,28,0.3)">
          🚚 Kargonuzu Canlı Takip Edin →
        </a>
      </div>` : ''}
    `)}` : ''

  return emailShell(`
    ${header('Siparişiniz Yola Çıktı! 🚚', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#8b5cf6', '🚀', 'Siparişiniz kargo şubesine teslim edildi ve yola çıktı.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişiniz başarıyla kargoya verilmiştir.
        Kargonuz teslimat adresinize ulaştırılmak üzere hareket halindedir.
      </div>
    `)}
    ${takipSection}
    <div style="text-align:center;padding:8px 0">
      <a href="${siteUrl}/siparis-takip?kod=${data.siparis_no}" style="color:#888;font-size:12px;text-decoration:underline">
        Sescim Sipariş Takip Sayfasına Git
      </a>
    </div>
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Teslim Edildi
// ═══════════════════════════════════════════════════════════════════════════════

export function siparisTeslimEdildiHTML(data: { siparis_no: string; ad_soyad: string }): string {
  const siteUrl = getSiteUrl()

  return emailShell(`
    ${header('Siparişiniz Teslim Edildi 🎉', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#22c55e', '✨', 'Siparişiniz adresinize başarıyla ulaştı.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişiniz kargo görevlisi tarafından teslim edilmiştir.
        Bizi tercih ettiğiniz için teşekkür eder, müzik dolu güzel günlerde keyifle kullanmanızı dileriz! 🎶<br><br>
        Herhangi bir soru veya destek talebiniz olursa her zaman buradayız.
      </div>
    `)}
    <div style="background-color:#181818;border:1px solid #262626;border-radius:8px;padding:24px;margin-bottom:18px;text-align:center">
      <div style="color:#fff;font-size:15px;font-weight:700;margin-bottom:8px">Yeni Ekipmanlar ve Fırsatlar Sizi Bekliyor</div>
      <div style="color:#888;font-size:13px;margin-bottom:18px">Stüdyo ve sahne ekipmanlarında haftanın öne çıkan fırsatlarını keşfedin.</div>
      <a href="${siteUrl}/urunler" style="display:inline-block;padding:12px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px">
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
    ${header('Siparişiniz İptal Edildi', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#ef4444', '❌', 'Siparişiniz iptal edilmiştir.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişiniz talebiniz veya ödeme zaman aşımı nedeniyle iptal edilmiştir.<br><br>
        Eğer kartınızdan veya hesabınızdan herhangi bir çekim gerçekleştiyse, tutar bankanızın işlem süresine bağlı olarak 1-3 iş günü içinde iade edilecektir.
      </div>
    `)}
    ${infoBox(`
      ${label('Destek & İletişim')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Bu işlemde bir yanlışlık olduğunu düşünüyorsanız müşteri hizmetlerimizle iletişime geçebilirsiniz:<br>
        📞 <a href="tel:+903522316915" style="color:#DA291C;text-decoration:none;font-weight:600">+90 352 231 69 15</a><br>
        ✉️ <a href="mailto:info@sescim.com" style="color:#DA291C;text-decoration:none;font-weight:600">info@sescim.com</a>
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
  const siteUrl = getSiteUrl()
  return emailShell(`
    ${header('Ödemeniz Başarıyla Alındı 💳', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#22c55e', '💳', 'Kart ödemeniz güvenli altyapımız (PayTR) üzerinden tahsil edildi.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişinize ait <strong style="color:#DA291C;font-size:16px">${data.toplam_tutar.toLocaleString('tr-TR')} ₺</strong> tutarındaki kart ödemeniz başarıyla tamamlandı.<br><br>
        Siparişiniz depomuzda hazırlanarak en kısa sürede kargoya teslim edilecektir.
      </div>
    `)}
    <div style="text-align:center;padding:10px 0">
      <a href="${siteUrl}/siparis-takip?kod=${data.siparis_no}" style="display:inline-block;padding:12px 26px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px">
        Siparişimi Takip Et →
      </a>
    </div>
  `)
}

export function odemeAdminBildirimHTML(data: {
  siparis_no: string
  ad_soyad: string
  email?: string
  telefon?: string
  toplam_tutar: number
  urunler?: Array<{ ad: string; adet: number; fiyat: number }>
}): string {
  const siteUrl = getSiteUrl()
  const urunlerHTML = (data.urunler || []).map(u =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #262626;color:#ccc;font-size:13px">${u.ad} ×${u.adet}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #262626;color:#fff;font-size:13px;font-weight:700;text-align:right">${(u.fiyat * u.adet).toLocaleString('tr-TR')} ₺</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="tr">
<body style="${BASE_STYLE}">
<div style="max-width:540px;margin:0 auto;padding:24px 16px">
  <div style="background-color:#22c55e;padding:18px 24px;border-radius:8px 8px 0 0">
    <div style="color:#ffffff;font-size:20px;font-weight:900;text-transform:uppercase">💳 PayTR Ödemesi Alındı!</div>
    <div style="color:rgba(255,255,255,0.95);font-size:13px;margin-top:4px">Sipariş No: <strong>#${data.siparis_no}</strong></div>
  </div>
  <div style="background-color:#141414;border:1px solid #262626;padding:20px 24px;margin-bottom:14px">
    <div style="color:#fff;font-size:16px;font-weight:700">${data.ad_soyad}</div>
    ${data.email || data.telefon ? `<div style="color:#888;font-size:13px;margin-top:4px">✉️ ${data.email || ''} | 📞 ${data.telefon || ''}</div>` : ''}
    <div style="color:#22c55e;font-size:13px;font-weight:700;margin-top:6px">✅ PayTR üzerinden kredi kartı tahsilatı başarıyla yapıldı.</div>
  </div>
  ${data.urunler && data.urunler.length > 0 ? `
  <div style="background-color:#141414;border:1px solid #262626;margin-bottom:16px;border-radius:6px;overflow:hidden">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${urunlerHTML}
      <tr>
        <td style="padding:14px 12px;background-color:#1a1a1a;color:#888;font-size:11px;text-transform:uppercase;font-weight:700">Tahsil Edilen Tutar</td>
        <td style="padding:14px 12px;background-color:#1a1a1a;color:#22c55e;font-size:18px;font-weight:900;text-align:right">${data.toplam_tutar.toLocaleString('tr-TR')} ₺</td>
      </tr>
    </table>
  </div>` : ''}
  <div style="text-align:center;padding:10px 0">
    <a href="${siteUrl}/admin" style="display:inline-block;padding:12px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:6px">
      Siparişi Admin Panelinde İncele →
    </a>
  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — Dekont Alındı
// ═══════════════════════════════════════════════════════════════════════════════

export function dekontAlindiHTML(data: { siparis_no: string; ad_soyad: string }): string {
  return emailShell(`
    ${header('Dekontunuz Alındı 📄', `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#f59e0b', '📄', 'Ödeme dekontunuz finans departmanımıza ulaştı.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişinize ait yüklediğiniz ödeme dekontu sistemimize ulaşmıştır.<br><br>
        Finans yetkilimiz havale/EFT mutabakatını yaptıktan hemen sonra siparişiniz onaylanacak ve hazırlık süreci başlayacaktır.
      </div>
    `)}
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÜŞTERİ E-POSTASI — İade / Değişim Talebi Alındı
// ═══════════════════════════════════════════════════════════════════════════════

export function iadeTalebiAlindiHTML(data: {
  siparis_no: string
  ad_soyad: string
  iade_kodu: string
  kargo_kodu: string
  talep_tipi?: string
}): string {
  const tip = data.talep_tipi === 'degisim' ? 'Değişim' : 'İade'

  return emailShell(`
    ${header(`${tip} Talebiniz Alındı 🔄`, `Sipariş No: <strong style="color:#DA291C">#${data.siparis_no}</strong>`)}
    ${statusBadge('#3b82f6', '📦', `${tip} talebiniz işleme alınmış ve ücretsiz kargo anlaşma kodunuz oluşturulmuştur.`)}

    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.ad_soyad}</strong>,<br><br>
        <strong>#${data.siparis_no}</strong> numaralı siparişiniz için oluşturduğunuz ${tip.toLowerCase()} talebi kayıt altına alınmıştır.
      </div>
    `)}

    <div style="background-color:rgba(218,41,28,0.08);border:1px dashed #DA291C;border-radius:8px;padding:20px;margin-bottom:20px;text-align:center">
      <div style="color:#a3a3a3;font-size:11px;text-transform:uppercase;font-weight:700;letter-spacing:0.1em;margin-bottom:6px">
        Yurtiçi Kargo Ücretsiz Gönderi Anlaşma Kodunuz
      </div>
      <div style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:2px;font-family:monospace;margin:6px 0">
        ${data.kargo_kodu}
      </div>
      <div style="color:#888;font-size:12px">
        Sescim İade Takip No: <strong style="color:#DA291C">${data.iade_kodu}</strong>
      </div>
    </div>

    ${infoBox(`
      ${label('Kargo Teslimat Adımları')}
      <ol style="margin:0;padding-left:20px;color:#ccc;font-size:13px;line-height:1.8">
        <li>Ürünü orijinal ambalajı, kutusu, aksesuarları ve faturasıyla birlikte güvenli şekilde paketleyin.</li>
        <li>Size en yakın <strong style="color:#fff">Yurtiçi Kargo</strong> şubesine gidin.</li>
        <li>Görevliye yukarıdaki <strong style="color:#DA291C">${data.kargo_kodu}</strong> nolu Sescim anlaşma kodunu belirtin.</li>
        <li>Kargo görevlisine herhangi bir ücret ödemeden paketinizi teslim edin.</li>
      </ol>
    `)}

    <div style="color:#737373;font-size:11px;line-height:1.6;text-align:center">
      Ürün depomuza ulaştığında teknik kontrolü sağlanır ve 2 iş günü içerisinde ücret iadesi / ürün değişimi tamamlanır.
    </div>
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMİN E-POSTASI — Yeni Sipariş Bildirimi
// ═══════════════════════════════════════════════════════════════════════════════

export function adminBildirimHTML(data: SiparisEmailData): string {
  const siteUrl = getSiteUrl()
  const urunlerHTML = data.urunler.map(u =>
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #262626;color:#ccc;font-size:13px">${u.ad} ×${u.adet}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #262626;color:#fff;font-size:13px;font-weight:700;text-align:right">${(u.fiyat * u.adet).toLocaleString('tr-TR')} ₺</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="tr">
<body style="${BASE_STYLE}">
<div style="max-width:540px;margin:0 auto;padding:24px 16px">
  <div style="background-color:#DA291C;padding:18px 24px;border-radius:8px 8px 0 0">
    <div style="color:#ffffff;font-size:20px;font-weight:900;text-transform:uppercase">🔔 Yeni Sescim Siparişi!</div>
    <div style="color:rgba(255,255,255,0.9);font-size:13px;margin-top:4px">Sipariş No: <strong>#${data.siparis_no}</strong></div>
  </div>
  <div style="background-color:#141414;border:1px solid #262626;padding:20px 24px;margin-bottom:14px">
    <div style="color:#fff;font-size:16px;font-weight:700">${data.ad_soyad}</div>
    <div style="color:#888;font-size:13px;margin-top:4px">✉️ ${data.email} | 📞 ${data.telefon}</div>
    <div style="color:#aaa;font-size:12px;margin-top:6px">Ödeme: <strong style="color:#DA291C">${data.odeme_tipi}</strong></div>
    ${data.is_bayi ? `<div style="color:#DA291C;font-size:12px;margin-top:4px">🏢 Bayi: ${data.bayi_adi}</div>` : ''}
  </div>
  <div style="background-color:#141414;border:1px solid #262626;margin-bottom:16px;border-radius:6px;overflow:hidden">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${urunlerHTML}
      <tr>
        <td style="padding:14px 12px;background-color:#1a1a1a;color:#888;font-size:11px;text-transform:uppercase;font-weight:700">Toplam Tutar</td>
        <td style="padding:14px 12px;background-color:#1a1a1a;color:#DA291C;font-size:18px;font-weight:900;text-align:right">${data.toplam_tutar.toLocaleString('tr-TR')} ₺</td>
      </tr>
    </table>
  </div>
  <div style="text-align:center;padding:10px 0">
    <a href="${siteUrl}/admin" style="display:inline-block;padding:12px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:6px">
      Siparişi Admin Panelinde İncele →
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
  const siteUrl = getSiteUrl()

  return `<!DOCTYPE html>
<html lang="tr">
<body style="${BASE_STYLE}">
<div style="max-width:540px;margin:0 auto;padding:24px 16px">
  <div style="background-color:#DA291C;padding:18px 24px;border-radius:8px 8px 0 0">
    <div style="color:#ffffff;font-size:18px;font-weight:900;text-transform:uppercase">📄 Havale Dekontu Yüklendi</div>
    <div style="color:rgba(255,255,255,0.9);font-size:13px;margin-top:4px">Sipariş No: <strong>#${data.siparis_no}</strong></div>
  </div>
  <div style="background-color:#141414;border:1px solid #262626;padding:20px 24px;margin-bottom:14px">
    <div style="color:#888;font-size:11px;text-transform:uppercase;margin-bottom:6px">Müşteri</div>
    <div style="color:#fff;font-size:16px;font-weight:700">${data.ad_soyad}</div>
  </div>
  <div style="background-color:#141414;border:1px solid #262626;padding:20px 24px;margin-bottom:14px;text-align:center">
    <a href="${data.dekont_url}" target="_blank" style="display:inline-block;padding:12px 24px;background-color:#1a1a1a;border:1px solid #DA291C;color:#DA291C;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px;margin-right:8px">
      📥 Dekont Belgesini Aç
    </a>
    <a href="${siteUrl}/admin" style="display:inline-block;padding:12px 24px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;border-radius:6px">
      Admin Paneli
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
  <div style="background-color:#DA291C;padding:16px 22px;border-radius:8px 8px 0 0">
    <div style="color:#ffffff;font-size:17px;font-weight:900;text-transform:uppercase">📩 Sescim İletişim Mesajı</div>
  </div>
  <div style="background-color:#141414;border:1px solid #262626;padding:20px;color:#ccc;font-size:14px;line-height:1.6">
    <p style="margin:0 0 8px"><strong style="color:#fff">Gönderen:</strong> ${adSoyad}</p>
    <p style="margin:0 0 8px"><strong style="color:#fff">E-posta:</strong> <a href="mailto:${data.email}" style="color:#DA291C">${data.email}</a></p>
    ${data.telefon ? `<p style="margin:0 0 8px"><strong style="color:#fff">Telefon:</strong> ${data.telefon}</p>` : ''}
    ${data.konu ? `<p style="margin:0 0 8px"><strong style="color:#fff">Konu:</strong> ${data.konu}</p>` : ''}
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #2a2a2a;white-space:pre-wrap;color:#e5e5e5;background-color:#0d0d0d;padding:16px;border-radius:6px">${data.mesaj}</div>
  </div>
</div>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAYİ E-POSTALARI — Onaylandı & Askıya Alındı
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
        Bayi panelinize erişim için <strong style="color:#fff">şifrenizi belirlemeniz</strong> gerekmektedir.<br><br>
        Aşağıdaki butona tıklayarak tek kullanımlık doğrulama bağlantısı ile şifrenizi tanımlayabilirsiniz.
      </div>
    `)}
    <div style="text-align:center;padding:14px 0">
      <a href="${data.otp_url}" style="display:inline-block;padding:14px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:6px">
        Şifremi Belirle →
      </a>
    </div>
  ` : `
    <div style="text-align:center;padding:14px 0">
      <a href="${data.panel_url}" style="display:inline-block;padding:14px 28px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:6px">
        Bayi Paneline Giriş Yap →
      </a>
    </div>
  `

  return emailShell(`
    ${header('Bayi Hesabınız Onaylandı 🎉', 'sescim.com B2B Bayi Ağı')}
    ${statusBadge('#22c55e', '✅', 'Bayi başvurunuz onaylandı. Sescim B2B ağına hoş geldiniz!')}
    ${infoBox(`
      ${label('Bayi Yetkili Bilgileri')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Firma: <strong style="color:#fff">${data.firma_adi}</strong><br>
        Yetkili: <strong style="color:#fff">${data.yetkili_adi}</strong>
      </div>
    `)}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.yetkili_adi}</strong>,<br><br>
        <strong>${data.firma_adi}</strong> adına oluşturduğunuz bayi kaydı onaylanmıştır.
        Artık toptan ve bayi fiyatlarımıza erişebilir, özel sipariş listesi oluşturabilir ve anlık stok durumlarını görebilirsiniz.
      </div>
    `)}
    ${sifreSection}
  `)
}

export function bayiAskiyaAlindiHTML(data: {
  firma_adi: string
  yetkili_adi: string
}): string {
  return emailShell(`
    ${header('Bayi Hesabınız Askıya Alındı', 'sescim.com B2B Bayi Ağı')}
    ${statusBadge('#f59e0b', '⚠️', 'Bayi hesabınız inceleme amacıyla geçici olarak askıya alınmıştır.')}
    ${infoBox(`
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        Sayın <strong style="color:#fff">${data.yetkili_adi}</strong>,<br><br>
        <strong>${data.firma_adi}</strong> firmasına ait bayi hesabınız askıya alınmıştır.<br><br>
        Ayrıntılı bilgi almak veya hesabınızı yeniden aktif etmek için müşteri temsilcimizle iletişime geçebilirsiniz.
      </div>
    `)}
    ${infoBox(`
      ${label('İletişim')}
      <div style="color:#ddd;font-size:14px;line-height:1.8">
        📞 <a href="tel:+903522316915" style="color:#DA291C;text-decoration:none">+90 352 231 69 15</a><br>
        ✉️ <a href="mailto:info@sescim.com" style="color:#DA291C;text-decoration:none">info@sescim.com</a>
      </div>
    `)}
  `)
}

export function kampanyaHTML(data: {
  baslik: string
  icerik: string
  resim_url?: string
  link_url?: string
}): string {
  const resimSection = data.resim_url ? `
    <div style="margin-bottom:20px;text-align:center">
      <img src="${data.resim_url}" alt="${data.baslik}" style="max-width:100%;height:auto;border-radius:6px;border:1px solid #262626" />
    </div>
  ` : ''

  const linkSection = data.link_url ? `
    <div style="margin-top:24px;text-align:center">
      <a href="${data.link_url}" style="display:inline-block;padding:14px 32px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:900;font-size:14px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em">
        Fırsatları İncele →
      </a>
    </div>
  ` : ''

  const formatliIcerik = data.icerik.replace(/\\n/g, '<br>')

  return emailShell(`
    ${header(data.baslik, 'Özel Kampanya ve Duyuru')}
    
    <div style="background-color:#181818;border:1px solid #262626;border-radius:8px;padding:24px;margin-bottom:18px">
      ${resimSection}
      <div style="color:#ddd;font-size:15px;line-height:1.8;white-space:pre-wrap">${formatliIcerik}</div>
      ${linkSection}
    </div>
  `)
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERK EDİLMİŞ SEPET HATIRLATMA E-POSTASI
// ═══════════════════════════════════════════════════════════════════════════════

export function terkedilmisSepetHTML(data: {
  ad_soyad?: string
  urunler: Array<{ ad: string; fiyat: number; adet: number; fotograf?: string }>
  toplam_tutar: number
  sepet_url: string
  kupon_kodu?: string
}): string {
  const urunListesiHtml = data.urunler.map(u => `
    <div style="display:flex;align-items:center;padding:12px;background-color:#1a1a1a;border:1px solid #2a2a2a;margin-bottom:10px;border-radius:6px">
      ${u.fotograf ? `<img src="${u.fotograf}" alt="${u.ad}" style="width:52px;height:52px;object-fit:cover;border-radius:4px;margin-right:12px;background:#fff;border:1px solid #333" />` : ''}
      <div style="flex:1">
        <div style="color:#ffffff;font-size:14px;font-weight:600">${u.ad}</div>
        <div style="color:#888;font-size:12px;margin-top:2px">Adet: ${u.adet} × ${(u.fiyat).toLocaleString('tr-TR')} ₺</div>
      </div>
      <div style="color:#DA291C;font-weight:700;font-size:14px">${(u.fiyat * u.adet).toLocaleString('tr-TR')} ₺</div>
    </div>
  `).join('')

  return emailShell(`
    ${header('Sepetinizde Ürünler Sizi Bekliyor! 🎸', 'Sizin için ürünleri ayırdık')}

    <div style="background-color:#181818;border:1px solid #262626;border-radius:8px;padding:24px;margin-bottom:18px">
      <div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:8px">
        Merhaba ${data.ad_soyad || 'Değerli Müziksever'},
      </div>
      <div style="color:#a3a3a3;font-size:14px;line-height:1.6;margin-bottom:20px">
        Sescim'de sepetinize eklediğiniz profesyonel ses ve müzik ekipmanlarını tamamlamadığınızı fark ettik. Stoklarımız sınırlı olduğundan ürünlerinizi kaçırmamanız için hatırlatmak istedik.
      </div>

      <div style="margin-bottom:18px">
        ${urunListesiHtml}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background-color:#1f1f1f;border:1px solid #333;border-radius:6px;margin-bottom:20px">
        <span style="color:#888;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700">Sepet Toplamı:</span>
        <span style="color:#ffffff;font-size:18px;font-weight:900">${data.toplam_tutar.toLocaleString('tr-TR')} ₺</span>
      </div>

      ${data.kupon_kodu ? `
        <div style="background-color:rgba(218,41,28,0.08);border:1px dashed #DA291C;padding:16px;text-align:center;border-radius:6px;margin-bottom:24px">
          <div style="color:#ccc;font-size:12px;margin-bottom:4px">Alışverişinizi Tamamlamanız İçin Özel İndirim Kodunuz:</div>
          <div style="color:#DA291C;font-size:22px;font-weight:900;letter-spacing:0.12em;font-family:monospace">${data.kupon_kodu}</div>
          <div style="color:#888;font-size:11px;margin-top:4px">Ödeme adımında kupon kodunuzu girerek ekstra indirimden faydalanabilirsiniz.</div>
        </div>
      ` : ''}

      <div style="text-align:center;margin-top:20px">
        <a href="${data.sepet_url}" style="display:inline-block;padding:16px 36px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 4px 16px rgba(218,41,28,0.4)">
          Sepetime Dön ve Siparişi Tamamla →
        </a>
      </div>

      <div style="text-align:center;margin-top:18px;color:#666;font-size:11px">
        🚚 ₺1.999 Üzeri Ücretsiz Kargo • 🛡️ Akdağ Elektronik Güvencesi • ⚡ Hızlı Sevkiyat
      </div>
    </div>
  `)
}

export function stokBildirimHTML(data: {
  ad_soyad?: string
  urun_adi: string
  urun_url: string
  fiyat?: number
}): string {
  return emailShell(`
    ${header('Müjde! Beklediğiniz Ürün Stokta! 🔔', 'Stok bildirim talebiniz güncellendi')}

    <div style="background-color:#181818;border:1px solid #262626;border-radius:8px;padding:24px;margin-bottom:18px">
      <div style="color:#fff;font-size:16px;font-weight:700;margin-bottom:8px">
        Merhaba ${data.ad_soyad || 'Değerli Müşterimiz'},
      </div>
      <div style="color:#a3a3a3;font-size:14px;line-height:1.6;margin-bottom:20px">
        Daha önce stok takibine aldığınız <strong>"${data.urun_adi}"</strong> ürünü yeniden sescim.com stoklarında satışa sunulmuştur.
      </div>

      <div style="background-color:#1f1f1f;border:1px solid #333;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center">
        <div style="color:#ffffff;font-size:18px;font-weight:800;margin-bottom:6px">${data.urun_adi}</div>
        ${data.fiyat ? `<div style="color:#DA291C;font-size:20px;font-weight:900">${data.fiyat.toLocaleString('tr-TR')} ₺</div>` : ''}
      </div>

      <div style="text-align:center;margin-top:20px">
        <a href="${data.urun_url}" style="display:inline-block;padding:16px 36px;background-color:#DA291C;color:#ffffff;text-decoration:none;font-weight:800;font-size:15px;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 4px 16px rgba(218,41,28,0.4)">
          Ürünü İncele ve Satın Al →
        </a>
      </div>

      <div style="text-align:center;margin-top:18px;color:#666;font-size:11px">
        Stoklar hızla tükenebilir. Kaçırmamak için siparişinizi hemen oluşturabilirsiniz.
      </div>
    </div>
  `)
}

