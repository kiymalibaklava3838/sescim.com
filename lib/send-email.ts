/**
 * Merkezi e-posta gönderici yardımcı modülü.
 * Tüm API route'ları bu fonksiyonu kullanır.
 */

/** Resend API'dan dönen hata nesnesi */
interface ResendError {
  name?: string
  message?: string
  statusCode?: number
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[sendEmail] RESEND_API_KEY tanımlı değil, e-posta atlandı.')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Akdağ Elektronik <siparis@akdagelektronik.com>',
      to,
      subject,
      html,
    }),
  })

  if (!res.ok) {
    let errBody: ResendError = {}
    try { errBody = await res.json() } catch { /* json parse edilemezse ignore */ }
    const errMsg = errBody.message || await res.text().catch(() => 'Bilinmeyen hata')
    console.error(`[sendEmail] Resend API hatası (${res.status}): ${errMsg} | Alıcı: ${to} | Konu: ${subject}`)
    throw new Error(`[sendEmail] E-posta gönderilemedi (${res.status}): ${errMsg}`)
  }
}

/**
 * Toplu e-posta gönderimi (Kampanya ve Duyurular için).
 * Resend Batch API kullanarak gönderir (Her istekte max 100 e-posta).
 */
export async function sendBulkEmail(toAddresses: string[], subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[sendBulkEmail] RESEND_API_KEY tanımlı değil, toplu gönderim atlandı.')
    return
  }

  // Resend Batch API max 100 e-posta destekler
  const CHUNK_SIZE = 100;
  
  for (let i = 0; i < toAddresses.length; i += CHUNK_SIZE) {
    const chunk = toAddresses.slice(i, i + CHUNK_SIZE)
    const chunkIndex = i / CHUNK_SIZE + 1
    
    const payload = chunk.map(email => ({
      from: 'Akdağ Elektronik Kampanya <siparis@akdagelektronik.com>',
      to: email,
      subject,
      html,
    }))

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errBody: ResendError = {}
        try { errBody = await res.json() } catch { /* ignore */ }
        const errMsg = errBody.message || await res.text().catch(() => 'Bilinmeyen hata')
        console.error(`[sendBulkEmail] Resend Batch API hatası (Chunk ${chunkIndex}, Status ${res.status}): ${errMsg}`)
        // Toplu gönderimde tek chunk hatası tüm gönderimi kesmez, devam eder
      }
    } catch (error) {
      console.error(`[sendBulkEmail] İstek hatası (Chunk ${chunkIndex}):`, error)
    }
  }
}
