/**
 * Merkezi e-posta gönderici yardımcı modülü (Resend API).
 * Gönderici: sescim.com <info@sescim.com>
 * RESEND_API_KEY girildiğinde otomatik olarak gerçek gönderime başlar.
 */

const SENDER_EMAIL = process.env.EMAIL_FROM || 'sescim.com <info@sescim.com>'

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_resend_api_key') {
    console.log(`[sendEmail (Simülasyon)] RESEND_API_KEY henüz girilmedi. E-posta simüle edildi:
- Kimden: ${SENDER_EMAIL}
- Kime: ${to}
- Konu: ${subject}`)
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      console.error('[sendEmail] Resend API hatası:', errData)
      return
    }

    const data = await res.json()
    console.log(`[sendEmail] E-posta başarıyla gönderildi (${data.id}). Alıcı: ${to}`)
  } catch (err) {
    console.error('[sendEmail] E-posta iletim hatası:', (err as Error).message)
  }
}

export async function sendBulkEmail(toAddresses: string[], subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_resend_api_key') {
    console.log(`[sendBulkEmail (Simülasyon)] RESEND_API_KEY henüz girilmedi. Toplu simülasyon (${toAddresses.length} alıcı). Konu: ${subject}`)
    return
  }

  try {
    // Resend batch endpoint veya paralel gönderim
    await Promise.allSettled(
      toAddresses.map((email) => sendEmail(email, subject, html))
    )
  } catch (err) {
    console.error('[sendBulkEmail] Toplu e-posta hatası:', (err as Error).message)
  }
}
