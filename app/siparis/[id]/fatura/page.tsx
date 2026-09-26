import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, Clock, Package, Download } from 'lucide-react'
import PrintInvoiceButton from '@/components/PrintInvoiceButton'

export const dynamic = 'force-dynamic'

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

interface Props {
  params: { id: string }
}

export default async function SiparisFaturaPage({ params }: Props) {
  const db = supabaseAdmin()
  const orderId = params.id

  // ID veya siparis_no ile ara
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
  let query = db.from('siparisler').select('*')
  if (isUUID) {
    query = query.or(`id.eq.${orderId},siparis_no.eq.${orderId}`)
  } else {
    query = query.eq('siparis_no', orderId)
  }

  const { data: order, error } = await query.single()

  if (error || !order) {
    notFound()
  }

  let urunler: any[] = Array.isArray(order.urunler) ? order.urunler : []
  if (urunler.length === 0) {
    const { data: kalemler } = await db.from('siparis_kalemleri').select('*').eq('siparis_id', order.id)
    if (kalemler && kalemler.length > 0) {
      urunler = kalemler.map((k: any) => ({
        ad: k.urun_adi,
        adet: Number(k.adet || 1),
        fiyat: Number(k.birim_fiyat || 0)
      }))
    }
  }
  const kdvOrani = 0.20 // %20 KDV
  const toplamTutar = Number(order.toplam_tutar) || 0
  const kdvHaricToplam = toplamTutar / (1 + kdvOrani)
  const kdvTutari = toplamTutar - kdvHaricToplam

  const formattedDate = new Date(order.created_at).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 print:p-0 print:bg-white text-slate-800">
      {/* Yazdırma Kontrol Barı (Ekranda görünür, yazdırmada gizlenir) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/hesabim"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-red transition-colors bg-white px-4 py-2.5 rounded-md border border-slate-200 shadow-sm"
        >
          <ArrowLeft size={16} /> Siparişlerime Dön
        </Link>
        <PrintInvoiceButton />
      </div>

      {/* A4 Fatura & Bilgi Fişi Konteyneri */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-lg rounded-lg p-8 sm:p-12 print:shadow-none print:border-none print:p-6 print:max-w-full">
        {/* Üst Başlık & Logo */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 border-b-2 border-slate-900 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-display font-black text-3xl tracking-tighter text-slate-900 uppercase">
                SESCİM<span className="text-brand-red">.COM</span>
              </span>
            </div>
            <p className="text-xs text-slate-700 font-bold mt-1">
              Mustafa Akdağ - Akdağ Elektronik
            </p>
            <p className="text-[11px] text-slate-500">
              Cumhuriyet Mah. Sur Cad. No:17/A Melikgazi / KAYSERİ
            </p>
            <p className="text-[11px] text-slate-500">
              Tel: +90 (352) 231 69 15 • Vergi Dairesi: Erciyes Vergi Dairesi • V.No: 0200327808
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="inline-block bg-slate-900 text-white font-display font-black text-xs uppercase tracking-widest px-3 py-1 rounded mb-2">
              SİPARİŞ BİLGİ FİŞİ / PROFORMA
            </div>
            <div className="font-mono text-lg font-bold text-brand-red">
              #{order.siparis_no}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tarih: {formattedDate}
            </div>
            <div className="text-xs font-semibold text-slate-700 mt-0.5 capitalize">
              Ödeme: {order.odeme_tipi === 'havale' ? 'Banka Havalesi / EFT' : 'Kredi Kartı (Online 3D Secure)'}
            </div>
          </div>
        </div>

        {/* Müşteri ve Teslimat Bilgileri */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-200 text-xs">
          <div>
            <span className="font-display font-bold uppercase tracking-wider text-slate-400 block mb-2 text-[10px]">
              ALICI &amp; TESLİMAT BİLGİLERİ
            </span>
            <div className="font-bold text-sm text-slate-900 mb-1">
              {order.ad_soyad || 'Müşteri'}
            </div>
            <p className="text-slate-600 leading-relaxed">
              {order.teslimat_adresi || 'Adres bilgisi belirtilmedi.'}
            </p>
            <p className="text-slate-600 mt-2">
              <strong>Telefon:</strong> {order.telefon || '—'}
            </p>
            <p className="text-slate-600">
              <strong>E-posta:</strong> {order.email || '—'}
            </p>
          </div>

          <div>
            <span className="font-display font-bold uppercase tracking-wider text-slate-400 block mb-2 text-[10px]">
              FATURA BİLGİLERİ
            </span>
            {order.fatura_tipi === 'kurumsal' || (order.fatura_adresi && order.fatura_adresi.includes('[Kurumsal Fatura]')) ? (
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900">
                  {order.firma_unvani || order.fatura_adresi || order.ad_soyad}
                </div>
                {order.vergi_dairesi && (
                  <p className="text-slate-600">
                    <strong>Vergi Dairesi:</strong> {order.vergi_dairesi}
                  </p>
                )}
                {order.vergi_no && (
                  <p className="text-slate-600">
                    <strong>Vergi Numarası:</strong> {order.vergi_no}
                  </p>
                )}
                <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-semibold mt-1">
                  Kurumsal E-Fatura
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900">
                  {order.ad_soyad || 'Bireysel Müşteri'}
                </div>
                <p className="text-slate-600">T.C. Kimlik / Bireysel Fatura</p>
                <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-semibold mt-1">
                  Bireysel E-Arşiv Fatura
                </span>
              </div>
            )}

            {order.kargo_takip_no && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Kargo Bilgisi</span>
                <span className="font-medium text-slate-800">
                  {order.kargo_firmasi || 'Yurtiçi Kargo'}: <strong className="font-mono">{order.kargo_takip_no}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Kalemler Tablosu */}
        <div className="py-8">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-slate-500 font-display font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-2">#</th>
                <th className="py-3 px-2">Ürün Açıklaması</th>
                <th className="py-3 px-2 text-center">Adet</th>
                <th className="py-3 px-2 text-right">Birim Fiyat</th>
                <th className="py-3 px-2 text-right">KDV (%20)</th>
                <th className="py-3 px-2 text-right">Toplam (KDV Dahil)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {urunler.map((u, i) => {
                const itemTotal = (Number(u.fiyat) || 0) * (Number(u.adet) || 1)
                const itemKdvHaric = itemTotal / 1.2
                const itemKdv = itemTotal - itemKdvHaric

                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-3 px-2 font-medium text-slate-900 max-w-sm">
                      {u.ad}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-800">
                      {u.adet}
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-700">
                      {(Number(u.fiyat) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-slate-500">
                      {itemKdv.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                    <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">
                      {itemTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Fatura Toplamları & Dipnot */}
        <div className="flex flex-col sm:flex-row justify-between items-start pt-6 border-t-2 border-slate-200 gap-8">
          <div className="max-w-md text-[11px] text-slate-500 space-y-2">
            <p className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
              YASAL BİLGİLENDİRME &amp; GARANTİ KOŞULLARI:
            </p>
            <p className="leading-relaxed">
              İşbu sipariş fişi, Sescim.com üzerinden verilen siparişin dökümüdür. Resmi E-Arşiv / E-Faturanız
              GİB entegrasyonuyla sistemde kayıtlı e-posta adresinize iletilmektedir.
            </p>
            <p className="leading-relaxed">
              Tüm ürünler Akdağ Elektronik distribütörlüğünde <strong>2 Yıl Resmi Garanti</strong> kapsamındadır.
              Cayma hakkı ve iade talepleriniz için sipariş tarihinden itibaren 14 gün içinde Hesabım menüsünden iade
              başvurusu oluşturabilirsiniz.
            </p>
          </div>

          <div className="w-full sm:w-72 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Ara Toplam (KDV Hariç):</span>
              <span className="font-mono font-semibold">{kdvHaricToplam.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>

            {order.indirim_tutari && Number(order.indirim_tutari) > 0 && (
              <div className="flex justify-between text-brand-red">
                <span>Kupon / Özel İndirim:</span>
                <span className="font-mono font-bold">-{Number(order.indirim_tutari).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Hesaplanan KDV (%20):</span>
              <span className="font-mono font-semibold">{kdvTutari.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Kargo Bedeli:</span>
              {order.kargo_ucreti && Number(order.kargo_ucreti) > 0 ? (
                <span className="font-mono font-semibold text-slate-900">{Number(order.kargo_ucreti).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
              ) : (
                <span className="font-semibold text-emerald-600 uppercase text-[11px]">Ücretsiz Kargo</span>
              )}
            </div>

            <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline">
              <span className="font-display font-black text-sm text-slate-900 uppercase">ÖDENEN TOPLAM:</span>
              <span className="font-mono font-black text-xl text-brand-red">
                {toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </span>
            </div>
          </div>
        </div>

        {/* Alt Kaşe & Onay */}
        <div className="mt-12 pt-8 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <div>
            <span>Sescim Elektronik E-Ticaret Otomasyonu</span> • www.sescim.com
          </div>
          <div className="text-right">
            <span>Kaşe / İmza Yeri</span>
          </div>
        </div>
      </div>
    </div>
  )
}
