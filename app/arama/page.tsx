import { createAkdagServerClient } from '@/lib/supabase-akdag'
import ProductGrid from '@/components/ProductGrid'
import { LIGHT_PRODUCT_FIELDS } from '@/lib/product-queries'
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
    const { data } = await supabase
      .from('urunler')
      .select(LIGHT_PRODUCT_FIELDS)
      .ilike('ad', `%${q}%`)
      
    products = data || []
  }
  
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
      
      <ProductGrid 
        products={products}
        searchQuery={q}
      />
    </div>
  )
}
