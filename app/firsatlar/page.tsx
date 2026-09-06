import { Metadata } from 'next'
import Link from 'next/link'
import { Tag, Sparkles, ArrowRight, ShieldCheck, Flame, Zap } from 'lucide-react'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import ProductGrid from '@/components/ProductGrid'
import DealCountdown from '@/components/DealCountdown'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Günün Fırsatları & Flaş İndirimler | Sescim',
  description: 'Seçili profesyonel ses sistemleri, stüdyo monitörleri, sahne ışıkları ve DJ ekipmanlarında günün fırsatları ve flaş indirimler.',
}

export default async function FirsatlarPage() {
  const akdagSupabase = await createAkdagServerClient()
  const sescimSupabase = await createServerSupabaseClient()

  // 1. Sescim'deki aktif flaş indirimleri çek
  let flasUrunIds: string[] = []
  let enYakinBitis: string | undefined = undefined

  if (sescimSupabase) {
    try {
      const { data: flasData } = await sescimSupabase
        .from('flas_indirimler')
        .select('*')
        .eq('aktif', true)
        .gt('bitis_tarihi', new Date().toISOString())
        .order('bitis_tarihi', { ascending: true })

      if (flasData && flasData.length > 0) {
        flasUrunIds = flasData.map((f: any) => f.urun_id)
        enYakinBitis = flasData[0].bitis_tarihi
      }
    } catch (e) {
      console.error('Flas indirimler fetch error:', e)
    }
  }

  // 2. Akdağ / Sescim ürünlerini çek
  let products: any[] = []

  if (flasUrunIds.length > 0) {
    const { data } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .in('id', flasUrunIds)) as any
    products = data || []
  }

  // Eğer özel flaş indirim listesi az ise genel indirimli ürünleri de ekle
  if (products.length < 12) {
    const { data: indirimliUrunler } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .not('indirimli_fiyat', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)) as any

    if (indirimliUrunler) {
      const existingIds = new Set(products.map(p => p.id))
      for (const u of (indirimliUrunler as any[])) {
        if (!existingIds.has(u.id)) {
          products.push(u)
          existingIds.add(u.id)
        }
      }
    }
  }

  // Eğer hala ürün yoksa en popüler ürünleri fırsat olarak sun
  if (products.length === 0) {
    const { data: defaultProducts } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .order('created_at', { ascending: false })
      .limit(16)) as any
    products = defaultProducts || []
  }

  // Sescim özel fiyatlarını eşle
  if (products.length > 0) {
    const urunIds = products.map((p: any) => p.id)
    const pricingMap = await getSescimPricingMap(urunIds)
    products = products.map((p: any) => {
      const pricing = pricingMap.get(p.id)
      return {
        ...p,
        sescim_fiyat: pricing?.sescim_fiyat ?? null,
        sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.indirimli_fiyat ?? null,
        sescim_aktif: pricing?.sescim_aktif ?? true,
      }
    }).filter(p => p.sescim_aktif !== false)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 font-body text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-display font-semibold uppercase tracking-widest text-slate-400 mb-6">
          <Link href="/" className="hover:text-brand-red transition-colors">Ana Sayfa</Link>
          <span>/</span>
          <span className="text-brand-red">Günün Fırsatları</span>
        </div>

        {/* Flaş İndirim Geri Sayım Bandı */}
        <DealCountdown targetDate={enYakinBitis} />

        {/* Güven ve Teslimat Bilgilendirme Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 bg-red-50 text-brand-red rounded-lg">
              <Zap size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Anında İndirim</div>
              <div className="text-[11px] text-slate-500">Sepette ekstra sürpriz fiyatlar</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Distribütör Garantisi</div>
              <div className="text-[11px] text-slate-500">2 Yıl resmi garanti güvencesi</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Tag size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Taksit İmkanı</div>
              <div className="text-[11px] text-slate-500">Tüm kartlara taksit seçenekleri</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
              <Flame size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-xs uppercase text-slate-800">Hızlı Kargo</div>
              <div className="text-[11px] text-slate-500">Aynı gün kargoya teslimat</div>
            </div>
          </div>
        </div>

        {/* Ürün Listesi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h1 className="font-display font-black text-2xl uppercase text-slate-900">
                Fırsat Ürünleri ({products.length})
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Stoklarla sınırlı güncel kampanya ve fırsat ürünleri.
              </p>
            </div>
            <Link 
              href="/urunler" 
              className="inline-flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-brand-red hover:underline"
            >
              Tüm Kataloğu Gör <ArrowRight size={14} />
            </Link>
          </div>

          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  )
}
