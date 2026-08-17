import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createAkdagServerClient } from '@/lib/supabase-akdag'
import { Phone, Mail, ChevronRight, Bell } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ProductImageGallery from '@/components/ProductImageGallery'
import ShareButtons from '@/components/ShareButtons'
import AddToCartButton from '@/components/AddToCartButton'
import UrunFiyatGosterge from '@/components/UrunFiyatGosterge'
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { getBreadcrumbs } from '@/lib/categories'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getProductBySlug, getRelatedProducts, getCrossSellProducts } from '@/lib/product-service'
import { ProductCard } from '@/components/ProductGrid'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: product } = await getProductBySlug(params.slug)
  if (!product) return { title: 'Ürün Bulunamadı | Sescim.com' }

  const url = `${getSiteUrl()}/urun/${product.slug}`
  const description = (product.fiyat && product.fiyat > 0)
    ? `${product.ad} fiyatı: ${product.fiyat} ${product.para_birimi || 'TL'}. Detaylı bilgi için inceleyin.`
    : "Fiyat bilgisi için iletişime geçiniz."
  const image = product.fotograflar?.[0] || `${getSiteUrl()}/og-image.jpg`

  return {
    title: `${product.ad} | Sescim.com`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.ad,
      description,
      url,
      siteName: 'Sescim.com',
      images: [{ url: image, width: 1200, height: 630, alt: product.ad }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.ad,
      description,
      images: [image],
    },
  }
}

export default async function UrunDetayPage({ params }: Props) {
  const supabase = await createServerSupabaseClient()
  const { data: product } = await getProductBySlug(params.slug)
  if (!product) notFound()

  // SEO için: Eğer link UUID ile girilmişse ve ürünün bir slug'ı varsa, slug linkine yönlendir (301)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.slug)
  if (isUUID && product.slug) {
    redirect(`/urun/${product.slug}`)
  }



  const related = await getRelatedProducts(product.kategori, product.id)
  const crossSellData = await getCrossSellProducts(product.kategori)

  const stok = product.stok_durumu || 'stokta'
  const base = getSiteUrl()
  const currency = product.para_birimi || 'TRY'
  
  // Breadcrumb hiyerarşisi
  const breadcrumbs = getBreadcrumbs(product.kategori, product.alt_kategori, product.urun_tipi)

  const productJsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.ad,
    description: product.aciklama?.slice(0, 5000),
    image: product.fotograflar?.length ? product.fotograflar : undefined,
    sku: product.id,
  }

  if (product.fiyat && product.fiyat > 0) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: product.fiyat,
      priceCurrency: currency,
      availability:
        stok === 'tukendi'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: `${base}/urun/${product.slug}`,
    }
  }

  return (
    <div className="min-h-screen pt-8 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Tam Hiyerarşik Breadcrumb (Madde 1) */}
        <div className="flex flex-wrap items-center gap-y-2 text-slate-500 text-[11px] sm:text-xs font-display font-semibold uppercase tracking-widest mb-10 overflow-hidden">
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.href} className="flex items-center">
              <Link href={crumb.href} className="hover:text-brand-red transition-colors whitespace-nowrap">
                {crumb.name}
              </Link>
              {idx < breadcrumbs.length - 1 && (
                <ChevronRight size={12} className="mx-2 text-slate-300 flex-shrink-0" />
              )}
            </div>
          ))}
          <ChevronRight size={12} className="mx-2 text-slate-300 flex-shrink-0" />
          <span className="text-slate-600 truncate max-w-[200px] sm:max-w-xs">{product.ad}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-16">
          <ProductImageGallery images={product.fotograflar || []} alt={product.ad} />

          <div>
            <div className="font-display font-semibold text-xs tracking-widest uppercase text-brand-red mb-3">
              {product.urun_tipi || product.alt_kategori || product.kategori}
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl uppercase text-slate-900 leading-tight mb-4">{product.ad}</h1>
            <div className="w-12 h-0.5 bg-brand-red mb-6" />

            {/* Fiyat — client component ile kur dönüşümü */}
            <UrunFiyatGosterge
              fiyat={(product as any).sescim_fiyat ?? product.fiyat}
              indirimliFiyat={(product as any).sescim_indirimli_fiyat ?? null}
              paraBirimi={product.para_birimi || 'TRY'}
              fiyatGuncelleme={product.fiyat_guncelleme}
              urunAdi={product.ad}
            />

            {/* Stok */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${stok === 'stokta' ? 'bg-green-400' : stok === 'tukendi' ? 'bg-red-500' : 'bg-yellow-400'}`} />
              <span className="font-body text-sm text-slate-600">
                {stok === 'siparise_gore' ? (
                  'Siparişe Göre'
                ) : product.stok_adedi !== null && product.stok_adedi !== undefined ? (
                  product.stok_adedi > 20 ? 'Stokta: 20+ Adet' : `Stokta: ${product.stok_adedi} Adet`
                ) : (
                  stok === 'stokta' ? 'Stokta Mevcut' : stok === 'tukendi' ? 'Tükendi' : 'Siparişe Göre'
                )}
              </span>
            </div>

            <p className="font-body text-slate-600 text-base leading-relaxed mb-8 whitespace-pre-line">{product.aciklama}</p>

            <ShareButtons productName={product.ad} />

            {/* CTA */}
            <div className="border border-slate-200 bg-slate-50 p-6 space-y-3 mt-8">
              {product.fiyat && stok !== 'tukendi' ? (
                <AddToCartButton urun={{
                  id: product.id,
                  ad: product.ad,
                  kategori: product.kategori,
                  fotograflar: product.fotograflar || [],
                  fiyat: (product as any).sescim_fiyat ?? product.fiyat,
                  indirimli_fiyat: (product as any).sescim_indirimli_fiyat ?? null,
                  indirimli_fiyat_doviz: null,
                  para_birimi: product.para_birimi || 'TRY',
                }} />
              ) : stok === 'tukendi' ? (
                <div className="space-y-3">
                  <div className="font-display font-bold text-sm uppercase text-center text-slate-500 tracking-widest py-3 border border-slate-200 bg-white">
                    TÜKENDİ
                  </div>
                  {/* Stok Bildirim (Madde 7) */}
                  <button className="w-full btn-outline justify-center gap-2 text-xs py-3 group">
                    <Bell size={14} className="group-hover:animate-bounce" />
                    Stok Gelince Haber Ver
                  </button>
                </div>
              ) : null}
              
              <div className="grid grid-cols-2 gap-3">
                <a href="tel:+903522316915"
                  className="btn-outline text-xs justify-center py-3">
                  <Phone size={13} />
                  Hızlı Arama
                </a>
                <a href={`mailto:info@akdagelektronik.com?subject=${encodeURIComponent(`${product.ad} hakkında bilgi`)}`}
                  className="btn-outline text-xs justify-center py-3">
                  <Mail size={13} />E-posta
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Birlikte Alınanlar / Aksesuarlar */}
        {crossSellData && crossSellData.length > 0 && (
          <div className="mt-16 pt-12 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-slate-800" />
              <span className="font-display font-black text-sm tracking-[0.2em] uppercase text-slate-800">Sıkça Birlikte Alınanlar</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {crossSellData.map((r: any) => (
                <div key={r.id} className="h-full">
                  <ProductCard product={r} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benzer ürünler */}
        {related && related.length > 0 && (
          <div className="mt-16 pt-12 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-brand-red" />
              <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">BENZER ÜRÜNLER</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {related.map((r: any) => (
                <div key={r.id} className="h-full">
                  <ProductCard product={r} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
