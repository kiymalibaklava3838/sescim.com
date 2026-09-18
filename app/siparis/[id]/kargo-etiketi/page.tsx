import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft, Printer, Truck, AlertTriangle, ShieldCheck, Box, Umbrella, ArrowUp, CheckCircle2 } from 'lucide-react'
import BarcodeSvg from '@/components/BarcodeSvg'
import { SHIPPING_CONFIG } from '@/lib/shipping'

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

export default async function KargoEtiketiPage({ params }: Props) {
  const db = supabaseAdmin()
  const orderId = params.id

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
  const kargoFirmasi = order.kargo_firmasi || SHIPPING_CONFIG.DEFAULT_CARRIER
  const takipNo = order.kargo_takip_no || order.siparis_no

  // Şehir ve İlçe ayrıştır
  const adresLines = (order.teslimat_adresi || '').split('\n')
  const sehirIlceLine = adresLines[adresLines.length - 1] || ''

  const formattedDate = new Date(order.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white text-slate-900 font-sans">
      
      {/* Üst Yönetici Kontrol Çubuğu (Yazdırmada Gizlenir) */}
      <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-brand-red bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-xs transition-colors"
        >
          <ArrowLeft size={14} /> Sipariş Yönetimine Dön
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            // @ts-ignore
            formAction="print"
            className="inline-flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-lg shadow-sm transition-all cursor-pointer"
            id="print-btn"
          >
            <Printer size={15} /> Kargo Fişini Yazdır
          </button>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('print-btn')?.addEventListener('click', () => {
              window.print();
            });
          `,
        }}
      />

      {/* KARGO ETİKETİ / SEVK FİŞİ KONTEYNERİ (100x150 mm ve A4 uyumlu) */}
      <div className="max-w-[125mm] mx-auto bg-white border-2 border-black p-4 sm:p-5 shadow-lg print:shadow-none print:border-2 print:border-black print:p-4 print:max-w-full print:m-0 print:w-full">
        
        {/* 1. Üst Başlık & Kargo Firması */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-black gap-3">
          <div>
            <div className="font-display font-black text-2xl tracking-tight leading-none uppercase">
              SESCİM<span className="text-red-600">.COM</span>
            </div>
            <div className="text-[10px] font-bold tracking-wider text-slate-600 uppercase mt-0.5">
              PRO SES VE MÜZİK SİSTEMLERİ
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block bg-black text-white font-display font-black text-sm uppercase px-3 py-1 rounded-sm">
              {kargoFirmasi}
            </div>
            <div className="text-[9px] font-bold text-slate-700 uppercase mt-0.5 tracking-wider">
              STANDART ADRESE TESLİM
            </div>
          </div>
        </div>

        {/* 2. Barkod Alanı */}
        <div className="py-3 border-b-2 border-black flex flex-col items-center justify-center bg-slate-50/50">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            GÖNDERİ TAKİP BARKODU
          </div>
          <BarcodeSvg value={takipNo} height={50} showText={true} className="w-full max-w-[280px]" />
        </div>

        {/* 3. ALICI BİLGİLERİ (KURYELER İÇİN EN KRİTİK BÜYÜK ALAN) */}
        <div className="py-3 border-b-2 border-black">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-display font-black uppercase tracking-widest bg-black text-white px-2 py-0.5">
              ALICI (TESLİMAT ADRESİ)
            </span>
            <span className="font-mono text-xs font-bold text-slate-600">
              Sipariş: #{order.siparis_no}
            </span>
          </div>

          {/* ŞEHİR / İLÇE VURGUSU */}
          {sehirIlceLine && (
            <div className="bg-slate-100 p-2 my-1.5 border border-slate-300 font-display font-black text-base sm:text-lg uppercase text-slate-900 tracking-wide">
              📍 {sehirIlceLine}
            </div>
          )}

          <div className="space-y-1 mt-2 text-xs">
            <div className="font-display font-bold text-sm sm:text-base text-slate-900 uppercase">
              {order.firma_unvani || order.ad_soyad}
            </div>
            
            <div className="font-mono font-bold text-slate-800 text-xs sm:text-sm">
              📞 Tel: {order.telefon || '—'}
            </div>

            <div className="font-body text-xs text-slate-800 leading-snug whitespace-pre-line pt-1">
              {order.teslimat_adresi || 'Adres bilgisi girilmedi'}
            </div>
          </div>
        </div>

        {/* 4. GÖNDERİCİ (ÇIKIŞ DEPOSU) BİLGİLERİ */}
        <div className="py-2.5 border-b border-black text-[11px] bg-slate-50/30">
          <div className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-0.5">
            GÖNDERİCİ (ÇIKIŞ DEPOSU)
          </div>
          <div className="font-bold text-slate-900">
            {SHIPPING_CONFIG.SENDER.title} ({SHIPPING_CONFIG.SENDER.brand})
          </div>
          <div className="text-slate-700">
            {SHIPPING_CONFIG.SENDER.address} — {SHIPPING_CONFIG.SENDER.city}
          </div>
          <div className="text-slate-600 text-[10px]">
            Tel: {SHIPPING_CONFIG.SENDER.phone} • {SHIPPING_CONFIG.SENDER.taxOffice}
          </div>
        </div>

        {/* 5. SEVKİYAT VE PAKETLEME ÖZETİ */}
        <div className="py-2.5 border-b-2 border-black grid grid-cols-4 gap-2 text-center text-xs">
          <div className="border border-slate-300 p-1.5">
            <div className="text-[9px] font-bold text-slate-500 uppercase">Tarih</div>
            <div className="font-mono font-bold text-slate-800 text-[11px] mt-0.5">{formattedDate}</div>
          </div>
          <div className="border border-slate-300 p-1.5">
            <div className="text-[9px] font-bold text-slate-500 uppercase">Koli Adedi</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">1 PK</div>
          </div>
          <div className="border border-slate-300 p-1.5">
            <div className="text-[9px] font-bold text-slate-500 uppercase">Tahmini Desi</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">2-5 DS</div>
          </div>
          <div className="border border-black bg-slate-900 text-white p-1.5">
            <div className="text-[9px] font-bold text-slate-300 uppercase">Ödeme Tipi</div>
            <div className="font-bold text-[10px] mt-0.5 uppercase tracking-wider text-green-400">ÖDENDİ</div>
          </div>
        </div>

        {/* 6. PAKET İÇERİĞİ KONTROL TABLOSU */}
        <div className="py-2.5 border-b border-black text-[11px]">
          <div className="text-[9px] font-bold uppercase text-slate-500 tracking-widest mb-1.5">
            KOLİ İÇERİĞİ ({urunler.length} KALEM)
          </div>
          <div className="space-y-1 max-h-[140px] overflow-hidden">
            {urunler.map((u, i) => (
              <div key={i} className="flex justify-between items-center text-slate-800 text-[11px] border-b border-slate-100 pb-0.5">
                <span className="truncate pr-2 font-medium">
                  {i + 1}. {u.ad}
                </span>
                <span className="font-mono font-bold shrink-0">
                  ×{u.adet}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. HASSAS LOJİSTİK UYARI ROZETLERİ (KIRILABİLİR ELEKTRONİK) */}
        <div className="py-2 border-b-2 border-black grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col items-center justify-center p-1 border border-black bg-amber-50">
            <AlertTriangle size={16} className="text-amber-600 mb-0.5" />
            <span className="text-[9px] font-black uppercase text-amber-900 leading-tight">
              HASSAS SES EKİPMANI
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 border border-black bg-red-50">
            <Box size={16} className="text-brand-red mb-0.5" />
            <span className="text-[9px] font-black uppercase text-red-900 leading-tight">
              KIRILABİLİR / DÜŞÜRME
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-1 border border-black bg-blue-50">
            <Umbrella size={16} className="text-blue-600 mb-0.5" />
            <span className="text-[9px] font-black uppercase text-blue-900 leading-tight">
              NEMDEN KORUYUNUZ
            </span>
          </div>
        </div>

        {/* 8. KURYE TESLİM VE İMZA ALANI */}
        <div className="pt-2 text-[10px] text-slate-600">
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <div>Kurye Teslim Tarih/Saat: __________________</div>
              <div>Teslim Alan Adı Soyadı: __________________</div>
            </div>
            <div className="text-right">
              <div className="border border-slate-300 w-24 h-10 flex items-center justify-center text-[9px] text-slate-400">
                İMZA / KAŞE
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
