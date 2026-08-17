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
  // Sescim.com için e-posta gönderimi geçici olarak iptal edildi.
  // Çünkü mevcut e-posta altyapısı (sender adresleri) Akdağ Elektronik'e ait.
  console.log(`[sendEmail] E-posta gönderimi devre dışı (Sescim). Alıcı: ${to}, Konu: ${subject}`)
  return
}

export async function sendBulkEmail(toAddresses: string[], subject: string, html: string): Promise<void> {
  // Sescim.com için e-posta gönderimi geçici olarak iptal edildi.
  console.log(`[sendBulkEmail] Toplu E-posta gönderimi devre dışı (Sescim). Alıcı sayısı: ${toAddresses.length}, Konu: ${subject}`)
  return
}
