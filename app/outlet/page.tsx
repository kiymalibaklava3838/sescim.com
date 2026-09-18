import { Metadata } from 'next'
import Link from 'next/link'
import { Tag, ShieldCheck, Box, Wrench, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { getSescimPricingMap } from '@/lib/sescim-pricing'
import ProductGrid from '@/components/ProductGrid'

export const revalidate = 1800 // 30 dakika Vercel Edge CDN önbelleği

export const metadata: Metadata = {
  title: 'Outlet & Teşhir Ürünleri',
  description: '1 Yıl garantili, test edilmiş teşhir, kutusu açık ve seri sonu profesyonel ses-ışık ekipmanları en uygun fiyatlarla Sescim Outlet\'te.',
}

export default async function OutletPage() {
  const akdagSupabase = await createAkdagServerClient()
  const sescimSupabase = await createServerSupabaseClient()

  let outletUrunIds: string[] = []
  let outletDetailsMap = new Map<string, any>()

  if (sescimSupabase) {
    try {
      // 1. outlet_urunler tablosu
      const { data: directOutlets } = await sescimSupabase
        .from('outlet_urunler')
        .select('*')
        .eq('aktif', true)

      if (directOutlets && directOutlets.length > 0) {
        directOutlets.forEach((o: any) => {
          outletUrunIds.push(o.urun_id)
          outletDetailsMap.set(o.urun_id, o)
        })
      }

      // 2. sescim_fiyatlar is_outlet = true
      const { data: pricingOutlets } = await sescimSupabase
        .from('sescim_fiyatlar')
        .select('*')
        .eq('is_outlet', true)
        .eq('sescim_aktif', true)

      if (pricingOutlets && pricingOutlets.length > 0) {
        pricingOutlets.forEach((p: any) => {
          if (!outletDetailsMap.has(p.urun_id)) {
            outletUrunIds.push(p.urun_id)
            outletDetailsMap.set(p.urun_id, {
              urun_id: p.urun_id,
              outlet_fiyat: p.sescim_indirimli_fiyat || p.sescim_fiyat,
              durum_aciklamasi: p.outlet_durum || 'Teşhir / B-Stock'
            })
          }
        })
      }
    } catch (e) {
      console.error('Outlet fetch error:', e)
    }
  }

  let products: any[] = []

  if (outletUrunIds.length > 0) {
    const { data } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .in('id', outletUrunIds)) as any
    products = data || []
  }

  // Eğer özel outlet ürünü henüz girilmemişse, seri sonu ve yüksek indirimli ürünleri outlet vitrinine al
  if (products.length < 8) {
    const { data: indirimli } = (await akdagSupabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .not('indirimli_fiyat', 'is', null)
      .order('fiyat', { ascending: true })
      .limit(16)) as any

    if (indirimli) {
      const existing = new Set(products.map(p => p.id))
      for (const item of (indirimli as any[])) {
        if (!existing.has(item.id)) {
          products.push(item)
          existing.add(item.id)
        }
      }
    }
  }

  // Fiyatları bağla
  if (products.length > 0) {
    const urunIds = products.map((p: any) => p.id)
    const pricingMap = await getSescimPricingMap(urunIds)
    products = products.map((p: any) => {
      const pricing = pricingMap.get(p.id)
      const outletMeta = outletDetailsMap.get(p.id)
      return {
        ...p,
        sescim_fiyat: pricing?.sescim_fiyat ?? p.fiyat,
        sescim_indirimli_fiyat: outletMeta?.outlet_fiyat ?? pricing?.sescim_indirimli_fiyat ?? p.indirimli_fiyat ?? null,
        kullanim_alani: outletMeta?.durum_aciklamasi || 'Teşhir / Seri Sonu Fırsatı',
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
          <span className="text-brand-red">Outlet & Teşhir</span>
        </div>

        {/* Hero Header */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-display font-bold uppercase tracking-wider mb-4 border border-white/20 text-emerald-400">
              <CheckCircle2 size={14} /> Resmi Distribütör Garantili
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-black uppercase tracking-tight text-white mb-4">
              Sescim Outlet & Teşhir Fırsatları
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Müşteri iadesi, ambalajı açılmış, vitrin teşhir veya seri sonu profesyonel ses ve ışık ekipmanları; uzmanlarımız tarafından kontrol edilmiş, eksiksiz kutu içeriği ve 1 yıl garantiyle en avantajlı fiyatlarla sizlerle.
            </p>
          </div>
        </div>

        {/* 3'lü Güvence Bandı */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl flex-shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase text-slate-900">1 Yıl Distribütör Garantisi</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Tüm outlet ürünlerimiz resmi faturalı ve 1 yıl yetkili servis güvencesi altındadır.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
              <Box size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase text-slate-900">Eksiksiz Kutu & Aksesuar</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Cihazların tüm orijinal kablo, adaptör ve montaj aparatları eksiksiz teslim edilir.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-brand-red/10 text-brand-red rounded-xl flex-shrink-0">
              <Wrench size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase text-slate-900">Uzman Testinden Geçmiş</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ses mühendislerimiz tarafından tüm akustik ve elektronik testleri yapılmıştır.
              </p>
            </div>
          </div>
        </div>

        {/* Ürün Listesi */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display font-black text-2xl uppercase text-slate-900">
                Outlet Seçkisi ({products.length} Ürün)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Sınırlı stoklarla hemen teslim avantajlı ürünler.
              </p>
            </div>
            <Link 
              href="/urunler" 
              className="inline-flex items-center gap-1.5 text-xs font-display font-bold uppercase tracking-wider text-brand-red hover:underline"
            >
              Sıfır Ürün Kataloğu <ArrowRight size={14} />
            </Link>
          </div>

          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  )
}
