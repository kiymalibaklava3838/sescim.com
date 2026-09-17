import Link from 'next/link'
import { Tag, ArrowRight } from 'lucide-react'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ProductGrid from '@/components/ProductGrid'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
import { isQuoteOnlyProduct } from '@/lib/distributor-rules'
import { Metadata } from 'next'

export async function generateMetadata({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }): Promise<Metadata> {
  const q = searchParams.q as string || ''
  return {
    title: q ? `"${q}" için Arama Sonuçları` : 'Arama',
    description: q ? `"${q}" arama sonuçları sescim.com'da.` : 'Ürün arama',
  }
}

export default async function AramaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const q = searchParams.q as string || ''
  
  let products: any[] = []
  
  if (q.trim()) {
    const supabase = await createAkdagServerClient()
    const sescimDb = await createServerSupabaseClient()

    const [akdagRes, sescimRes] = await Promise.all([
      supabase.from('urunler').select(LIGHT_PRODUCT_FIELDS).or(`ad.ilike.%${q}%,marka.ilike.%${q}%,kategori.ilike.%${q}%`),
      sescimDb ? sescimDb.from('urunler').select('id, slug, ad, kategori:kategori_id, alt_kategori:alt_kategori_id, fotograflar, fiyat, indirimli_fiyat, bayi_fiyati, para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, is_featured, sescim_fiyat, sescim_indirimli_fiyat, sescim_aktif, created_at').or(`ad.ilike.%${q}%,marka.ilike.%${q}%,kategori_id.ilike.%${q}%`) : Promise.resolve({ data: [] })
    ])

    const sData = (sescimRes.data || []).map((p: any) => ({
      ...p,
      sescim_fiyat: p.sescim_fiyat ?? p.fiyat ?? null,
      sescim_aktif: p.sescim_aktif !== false
    }))
    const aData = akdagRes.data || []
    const combined = [...sData, ...aData]
      
    if (combined && combined.length > 0) {
      try {
        const { getSescimPricingMap } = await import('@/lib/sescim-pricing')
        const urunIds = combined.map((p: any) => p.id)
        const pricingMap = await getSescimPricingMap(urunIds)
        products = combined.map((p: any) => {
          const pricing = pricingMap.get(p.id)
          return {
            ...p,
            sescim_fiyat: pricing?.sescim_fiyat ?? p.sescim_fiyat ?? null,
            sescim_indirimli_fiyat: pricing?.sescim_indirimli_fiyat ?? p.sescim_indirimli_fiyat ?? null,
            sescim_aktif: pricing?.sescim_aktif ?? p.sescim_aktif ?? true,
            fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: pricing?.fiyat_sorunuz })
          }
        }).filter(p => p.sescim_aktif !== false)
      } catch {
        products = combined.map((p: any) => ({
          ...p,
          fiyat_sorunuz: isQuoteOnlyProduct({ marka: p.marka, fiyat_sorunuz: p.fiyat_sorunuz })
        }))
      }
    } else {
      products = []
    }
  }

  const matchingBrands = Array.from(new Set(products.map((p: any) => p.marka).filter(Boolean))) as string[]
  const exactBrand = matchingBrands.find(b => b.toLowerCase() === q.trim().toLowerCase())
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 min-h-[60vh]">
      <div className="mb-8">
        <h1 className="font-display font-black text-2xl md:text-3xl uppercase tracking-wide text-slate-800 mb-2">
          ARAMA SONUÇLARI
        </h1>
        {q ? (
          <p className="font-body text-slate-500">
            &quot;<span className="font-bold text-slate-800">{q}</span>&quot; için {products.length} ürün bulundu.
          </p>
        ) : (
          <p className="font-body text-slate-500">Lütfen aramak istediğiniz kelimeyi girin.</p>
        )}
      </div>

      {exactBrand && (
        <div className="mb-8 p-4 sm:p-5 bg-gradient-to-r from-red-50 to-orange-50/50 border border-red-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-brand-red text-white flex items-center justify-center shrink-0 shadow-sm">
              <Tag size={22} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 font-display">
                {exactBrand} Marka Sayfası
              </div>
              <div className="text-xs sm:text-sm text-slate-500 font-body">
                Tüm {exactBrand} profesyonel ürünleri, teknik modelleri ve serileri
              </div>
            </div>
          </div>
          <Link
            href={`/urunler?marka=${encodeURIComponent(exactBrand)}`}
            className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold font-display uppercase tracking-wider transition-colors inline-flex items-center justify-center gap-2 shrink-0 shadow-xs"
          >
            Marka Sayfasına Git
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
      
      <ProductGrid 
        products={products}
        searchQuery={q}
      />
    </div>
  )
}
