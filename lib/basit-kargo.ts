/**
 * sescim.com — Basit Kargo API (v2) İstemcisi
 * Resmi Basit Kargo API Entegrasyon Katmanı
 */

const BASIT_KARGO_BASE = 'https://basitkargo.com/api'
const DEFAULT_TIMEOUT_MS = 15_000

export interface BasitKargoErrorParams {
  status: number
  path: string
  body?: string
  message: string
}

/**
 * Basit Kargo API çağrılarında oluşan hataları yapılandırılmış nesne parametresiyle taşır.
 */
export class BasitKargoError extends Error {
  public readonly status: number
  public readonly path: string
  public readonly rawBody: string
  public readonly userMessage: string

  constructor(params: BasitKargoErrorParams) {
    super(params.message)
    this.name = 'BasitKargoError'
    this.status = params.status
    this.path = params.path
    this.rawBody = params.body || ''
    this.userMessage = params.message
  }
}


export interface BasitKargoPackage {
  height: number
  width: number
  depth: number
  weight: number
}

export interface BasitKargoItem {
  name: string
  code?: string
  quantity: string | number
}

export interface BasitKargoClient {
  name: string
  phone: string
  email?: string
  city: string
  town: string
  address: string
}

export interface CreateOrderBarcodePayload {
  handlerCode: string
  type?: 'OUTGOING' | 'INCOMING'
  orderTotal?: number
  orderPaymentType?: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'COLLECT_ON_DELIVERY' | 'OTHER'
  content: {
    name: string
    code: string
    items?: BasitKargoItem[]
    packages: BasitKargoPackage[]
  }
  client: BasitKargoClient
}

export interface BasitKargoShipmentResponse {
  id: string
  barcode: string
  type: string
  status: string
  shipmentInfo?: {
    handler?: {
      name: string
      code: string
    }
    handlerShipmentCode?: string | null
    lastState?: string
  }
  priceInfo?: {
    shipmentFee: number
    extraFee?: number | null
    totalCost: number
  }
  orderTotal?: number
}

export interface HandlerQuote {
  desiKg: number
  handlerCode: string
  price: number
  cashOnDelivery?: boolean
  creditCardOnDelivery?: boolean
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  timeoutMs?: number
}

/**
 * Ortam değişkeninden API anahtarını alır.
 */
function getApiKey(): string {
  const key = process.env.BASIT_KARGO_API_KEY
  if (!key) {
    throw new Error('BASIT_KARGO_API_KEY ortam değişkeni tanımlanmamış.')
  }
  return key
}

/**
 * Ortak API istek yardımcısı.
 * - Yetkilendirme ve varsayılan Accept header'larını ekler.
 * - AbortSignal.timeout ile zaman aşımı (Timeout) kontrolü yapar.
 * - Hataları BasitKargoError ile güvenli ve nesne parametreli olarak yönetir.
 */
async function request(path: string, options: RequestOptions = {}): Promise<Response> {
  const { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = options
  const token = getApiKey()

  // AbortSignal.timeout desteği varsa kullan, yoksa AbortController fallback
  let timeoutSignal: AbortSignal
  let timeoutId: NodeJS.Timeout | undefined

  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    timeoutSignal = AbortSignal.timeout(timeoutMs)
  } else {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    timeoutSignal = controller.signal
  }

  // Caller signal'i ile timeout signal'ini birleştir
  const effectiveSignal = signal ?? timeoutSignal

  try {
    const res = await fetch(`${BASIT_KARGO_BASE}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...headers,
      },
      signal: effectiveSignal,
    })

    if (!res.ok) {
      const rawText = await res.text().catch(() => '')
      let parsedMessage = ''

      try {
        const json = JSON.parse(rawText)
        parsedMessage = json.message || json.error || ''
      } catch {
        // Ham metin JSON değilse yutulur
      }

      const friendlyMessage = parsedMessage
        ? `Basit Kargo (${res.status}): ${parsedMessage}`
        : `Basit Kargo API isteği başarısız oldu (${res.status})`

      throw new BasitKargoError({
        status: res.status,
        path,
        body: rawText,
        message: friendlyMessage,
      })
    }

    return res
  } catch (err: any) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      throw new BasitKargoError({
        status: 408,
        path,
        body: '',
        message: `Basit Kargo API isteği zaman aşımına uğradı (${Math.round(timeoutMs / 1000)}s).`,
      })
    }
    if (err instanceof BasitKargoError) {
      throw err
    }
    throw new BasitKargoError({
      status: 500,
      path,
      body: err.message,
      message: `Basit Kargo bağlantı hatası: ${err.message}`,
    })
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

/**
 * Türkiye telefon numarasını Basit Kargo standart formatına (10 hane: 5XXXXXXXXX) dönüştürür.
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '5550000000'
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length >= 12) {
    return digits.slice(2, 12)
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    return digits.slice(1, 11)
  }
  if (digits.length === 10) {
    return digits
  }
  return digits.slice(-10).padStart(10, '5')
}

/**
 * Serbest metin adresinden İl, İlçe ve Açık Adres ayrıştırır.
 */
export function parseAddress(addressText: string): { city: string; town: string; address: string } {
  if (!addressText) {
    return { city: 'Kayseri', town: 'Melikgazi', address: 'Adres belirtilmedi' }
  }

  const lines = addressText
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  let city = ''
  let town = ''
  let cleanAddress = addressText

  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1]
    const parts = lastLine.split(/[\/\-,]/).map(p => p.trim())
    if (parts.length >= 2) {
      town = parts[0]
      city = parts[1]
      cleanAddress = lines.slice(0, -1).join(' ') || lastLine
    } else if (parts.length === 1 && lines.length > 1) {
      city = parts[0]
      town = lines[lines.length - 2]
      cleanAddress = lines.slice(0, -2).join(' ') || lines[0]
    }
  }

  if (!city || !town) {
    const slashParts = addressText.split('/')
    if (slashParts.length >= 2) {
      town = slashParts[0].trim().split(' ').pop() || 'Merkez'
      city = slashParts[1].trim().split(' ')[0] || 'İstanbul'
    }
  }

  return {
    city: city || 'İstanbul',
    town: town || 'Merkez',
    address: cleanAddress || addressText,
  }
}

/**
 * Belirtilen Desi değerine göre standart koli ölçülerini hesaplar.
 * Formül: Desi = (En * Boy * Yükseklik) / 3000
 */
export function calculatePackageDimensions(desi: number): BasitKargoPackage {
  const safeDesi = Math.max(1, Number(desi) || 3)
  return {
    width: 20,
    height: 15,
    depth: Math.max(10, Math.round(safeDesi * 10)),
    weight: Math.max(1, Math.round(safeDesi * 0.5)),
  }
}

/**
 * Basit Kargo API üzerinden sipariş ve barkod oluşturur.
 * POST /v2/order/barcode
 */
export async function createBasitKargoOrder(params: {
  siparisNo: string
  adSoyad: string
  telefon: string
  email?: string
  adres: string
  toplamTutar: number
  handlerCode?: string
  desi?: number
  kalemler?: Array<{ ad: string; adet: number }>
}): Promise<BasitKargoShipmentResponse> {
  const { city, town, address } = parseAddress(params.adres)
  const phone = formatPhoneNumber(params.telefon)
  const desi = Math.max(1, params.desi || 3)
  const handlerCode = params.handlerCode || process.env.BASIT_KARGO_DEFAULT_HANDLER || 'HEPSIJET'

  const pkg = calculatePackageDimensions(desi)
  const items: BasitKargoItem[] = (params.kalemler || []).map(k => ({
    name: k.ad,
    quantity: k.adet || 1,
  }))

  const payload: CreateOrderBarcodePayload = {
    handlerCode,
    type: 'OUTGOING',
    orderTotal: Number(params.toplamTutar) || 0,
    orderPaymentType: 'CREDIT_CARD',
    content: {
      name: `Sipariş ${params.siparisNo}`,
      code: params.siparisNo,
      items: items.length > 0 ? items : [{ name: 'Elektronik / Ses Ürünü', quantity: 1 }],
      packages: [pkg],
    },
    client: {
      name: params.adSoyad || 'Müşteri',
      phone,
      email: params.email || undefined,
      city,
      town,
      address,
    },
  }

  const idempotencyKey = `sescim-${params.siparisNo.toLowerCase()}-${Date.now()}`

  const res = await request('/v2/order/barcode', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
    timeoutMs: 30_000,
  })

  return (await res.json()) as BasitKargoShipmentResponse
}

/**
 * Belirtilen Desi için tüm anlaşmalı kargo firmalarının anlık fiyatlarını sorgular.
 * GET /handlers/fee/desiKg/{desiKg}
 */
export async function getCarrierQuotes(desi: number = 3): Promise<HandlerQuote[]> {
  const safeDesi = Math.max(1, Math.round(desi))
  const res = await request(`/handlers/fee/desiKg/${safeDesi}`)
  return (await res.json()) as HandlerQuote[]
}

/**
 * Basit Kargo hesap bakiyesini sorgular.
 * Hem düz metin hem de JSON formatlarını ({ balance: 500 } vb.) güvenle destekler.
 * GET /firm/balance
 */
export async function getAccountBalance(): Promise<number> {
  const res = await request('/firm/balance')
  const text = (await res.text()).trim()

  let num: number | null = null

  // 1. JSON format kontrolü
  try {
    const json = JSON.parse(text)
    if (typeof json === 'number') {
      num = json
    } else if (typeof json?.balance === 'number') {
      num = json.balance
    } else if (typeof json?.balance === 'string' && json.balance.trim() !== '') {
      num = Number(json.balance)
    }
  } catch {
    // 2. Düz metin sayı kontrolü
    if (text !== '') {
      num = Number(text)
    }
  }

  // Boş metin ('') veya NaN / Infinity durumlarını kesin olarak ele
  if (num === null || !Number.isFinite(num)) {
    throw new BasitKargoError({
      status: res.status,
      path: '/firm/balance',
      body: text,
      message: 'Geçersiz bakiye verisi alındı.',
    })
  }

  return num
}

/**
 * Şubeye henüz teslim edilmemiş kargo barkodunu iptal eder.
 * DELETE /order/barcode/{barcode}
 */
export async function cancelBarcode(barcode: string): Promise<void> {
  await request(`/order/barcode/${encodeURIComponent(barcode)}`, {
    method: 'DELETE',
  })
}

/**
 * Sipariş etiketinin SVG içeriğini çeker.
 * GET /label/svg/{id}
 */
export async function fetchLabelSvg(orderId: string): Promise<string> {
  const res = await request(`/label/svg/${encodeURIComponent(orderId)}`, {
    headers: {
      Accept: 'image/svg+xml, text/plain, */*',
    },
  })
  return await res.text()
}
