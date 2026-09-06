import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Phone, Mail, ChevronRight, Bell, ShieldCheck, Truck, CreditCard } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ProductImageGallery from '@/components/ProductImageGallery'
import ShareButtons from '@/components/ShareButtons'
import AddToCartButton from '@/components/AddToCartButton'
import ProductFavoriteButton from '@/components/ProductFavoriteButton'
import UrunFiyatGosterge from '@/components/UrunFiyatGosterge'
import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { getBreadcrumbs } from '@/lib/categories'
import { getKur, dovizToTL } from '@/lib/kur'
import ProductFaq from '@/components/ProductFaq'
import ProductBadges from '@/components/ProductBadges'
import InstallmentTrigger from '@/components/InstallmentTrigger'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { getProductBySlug, getRelatedProducts, getCrossSellProducts } from '@/lib/product-service'
import { ProductCard } from '@/components/ProductGrid'
import RecentlyViewed from '@/components/RecentlyViewed'
import ProductViewTracker from '@/components/ProductViewTracker'
import StockNotifyButton from '@/components/StockNotifyButton'
import ProductReviews from '@/components/ProductReviews'
import SmartBundleBuilder from '@/components/SmartBundleBuilder'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: product } = await getProductBySlug(params.slug)
  if (!product) return { title: 'Ürün Bulunamadı | Sescim' }

  const url = `${getSiteUrl()}/urun/${product.slug}`
  const brand = product.marka || 'Akdağ Elektronik'
  
  // Arama motorları için zengin ve temiz açıklama (155 karakter)
  const cleanDescription = product.aciklama
    ? product.aciklama.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim().slice(0, 155)
    : `${product.ad}, ${brand} distribütör güvencesi ve en iyi fiyat avantajıyla Sescim'de. Hemen inceleyin, hızlı kargo ile güvenle sipariş verin.`

  const image = product.fotograflar?.[0] || `${getSiteUrl()}/logo.png`

  return {
    title: `${product.ad} | Sescim`,
    description: cleanDescription,
    alternates: { canonical: url },
    openGraph: {
      title: `${product.ad} | Sescim`,
      description: cleanDescription,
      url,
      siteName: 'Sescim',
      locale: 'tr_TR',
      images: [{ url: image, width: 1200, height: 630, alt: product.ad }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.ad} | Sescim`,
      description: cleanDescription,
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
  const kur = await getKur()
  const pb = product.para_birimi || 'TRY'

  // Fiyat hesaplama (TL)
  const activePriceRaw = (product as any).sescim_indirimli_fiyat ?? (product as any).sescim_fiyat ?? product.indirimli_fiyat ?? product.fiyat
  const priceTL = activePriceRaw ? dovizToTL(activePriceRaw, pb, kur) : null

  // Breadcrumb hiyerarşisi
  const breadcrumbs = getBreadcrumbs(product.kategori, product.alt_kategori, product.urun_tipi)

  // Onaylı yorumları ve puan ortalamasını çek
  let aggregateRating: any = undefined
  try {
    const { data: approvedReviews } = await supabase
      .from('urun_yorumlari')
      .select('puan')
      .eq('urun_id', product.id)
      .eq('onaylandi', true)

    if (approvedReviews && approvedReviews.length > 0) {
      const totalPuan = approvedReviews.reduce((acc: number, r: any) => acc + (r.puan || 5), 0)
      const avg = Number((totalPuan / approvedReviews.length).toFixed(1))
      aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: avg,
        reviewCount: approvedReviews.length,
        bestRating: 5,
        worstRating: 1,
      }
    }
  } catch (e) {
    // Yorum çekme hatası olursa şema aksamasın
  }

  const brandName = product.marka || 'Akdağ Elektronik'

  // Google Merchant ve SERP Uyumlu Product Schema
  const productJsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.ad,
    description: product.aciklama ? product.aciklama.slice(0, 5000) : product.ad,
    image: product.fotograflar?.length ? product.fotograflar : [`${base}/logo.png`],
    sku: product.id,
    mpn: (product as any).model_kodu || product.id,
    category: product.kategori,
    brand: {
      '@type': 'Brand',
      name: brandName,
    },
  }

  if (aggregateRating) {
    productJsonLd.aggregateRating = aggregateRating
  }

  if (priceTL && priceTL > 0) {
    productJsonLd.offers = {
      '@type': 'Offer',
      price: priceTL,
      priceCurrency: 'TRY',
      priceValidUntil: '2027-12-31',
      availability:
        stok === 'tukendi'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: `${base}/urun/${product.slug}`,
      itemCondition: (product as any).is_outlet ? 'https://schema.org/RefurbishedCondition' : 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Sescim',
        url: base,
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'TR',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: priceTL >= 1999 ? 0 : 99,
          currency: 'TRY',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'TR',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 0,
            maxValue: 1,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY',
          },
        },
      },
    }
  }

  // Google BreadcrumbList Schema (SERP URL Hiyerarşisi için)
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: base,
      },
      ...breadcrumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        position: idx + 2,
        name: crumb.name,
        item: `${base}${crumb.href}`,
      })),
      {
        '@type': 'ListItem',
        position: breadcrumbs.length + 2,
        name: product.ad,
        item: `${base}/urun/${product.slug}`,
      },
    ],
  }

  return (
    <div className="min-h-screen pt-8 pb-24">
      <ProductViewTracker product={{
        id: product.id,
        slug: product.slug,
        name: product.ad,
        image: product.fotograflar?.[0] || null,
        price: product.fiyat,
        currency: pb,
        timestamp: Date.now()
      }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
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
            <div className="w-12 h-0.5 bg-brand-red mb-4" />

            {/* Ürün Rozetleri & Aciliyet Tetikleyicileri */}
            <div className="mb-4">
              <ProductBadges
                stokAdedi={product.stok_adedi}
                kritikStok={product.kritik_stok ?? 5}
                stokDurumu={stok}
                fiyat={(product as any).sescim_fiyat ?? product.fiyat}
                indirimliFiyat={(product as any).sescim_indirimli_fiyat ?? product.indirimli_fiyat}
              />
            </div>

            {/* Fiyat — client component ile kur dönüşümü */}
            <UrunFiyatGosterge
              fiyat={(product as any).sescim_fiyat ?? product.fiyat}
              indirimliFiyat={(product as any).sescim_indirimli_fiyat ?? null}
              paraBirimi={product.para_birimi || 'TRY'}
              fiyatGuncelleme={product.fiyat_guncelleme}
              urunAdi={product.ad}
            />

            {/* Taksit Seçenekleri Modalı */}
            {priceTL && priceTL > 0 && (
              <div className="mb-4">
                <InstallmentTrigger
                  fiyat={priceTL}
                  urunAdi={product.ad}
                />
              </div>
            )}

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
            {/* CTA */}
            <div className="border border-slate-200 bg-slate-50 p-6 space-y-3 mt-8 rounded-2xl shadow-sm">
              {product.fiyat && stok !== 'tukendi' ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
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
                  </div>
                  <div className="sm:col-span-1">
                    <ProductFavoriteButton
                      product={{
                        id: product.id,
                        slug: product.slug,
                        ad: product.ad,
                        kategori: product.kategori,
                        fiyat: (product as any).sescim_fiyat ?? product.fiyat,
                        para_birimi: product.para_birimi,
                        fotograflar: product.fotograflar || [],
                        indirimli_fiyat: (product as any).sescim_indirimli_fiyat ?? null,
                        stok_durumu: product.stok_durumu,
                        stok_adedi: product.stok_adedi,
                        marka: product.marka,
                      }}
                    />
                  </div>
                </div>
              ) : stok === 'tukendi' ? (
                <div className="space-y-3">
                  <div className="font-display font-bold text-sm uppercase text-center text-slate-500 tracking-widest py-3 border border-slate-200 bg-white rounded-xl">
                    TÜKENDİ
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <StockNotifyButton urun_id={product.id} urun_ad={product.ad} />
                    <ProductFavoriteButton
                      product={{
                        id: product.id,
                        slug: product.slug,
                        ad: product.ad,
                        kategori: product.kategori,
                        fiyat: (product as any).sescim_fiyat ?? product.fiyat,
                        para_birimi: product.para_birimi,
                        fotograflar: product.fotograflar || [],
                        indirimli_fiyat: (product as any).sescim_indirimli_fiyat ?? null,
                        stok_durumu: product.stok_durumu,
                        stok_adedi: product.stok_adedi,
                        marka: product.marka,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {/* Ses Uzmanına Danış (WhatsApp) */}
              <a
                href={`https://wa.me/905323934370?text=${encodeURIComponent(
                  `Merhaba, sescim.com'da incelediğim "${product.ad}" ürünü hakkında teknik danışmanlık almak istiyorum.\nÜrün Linki: ${getSiteUrl()}/urun/${product.slug}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Ses Uzmanına Danış (WhatsApp)
              </a>
              
              <div className="grid grid-cols-2 gap-3">
                <a href="tel:+903522316915"
                  className="btn-outline text-xs justify-center py-2.5 rounded-xl">
                  <Phone size={13} />
                  Hızlı Arama
                </a>
                <a href={`mailto:info@sescim.com?subject=${encodeURIComponent(`${product.ad} hakkında bilgi`)}`}
                  className="btn-outline text-xs justify-center py-2.5 rounded-xl">
                  <Mail size={13} />E-posta
                </a>
              </div>

              {/* B2C Güven & Satın Alma Rozetleri */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200/80 text-[11px] text-slate-600 font-medium">
                <div className="flex items-center gap-1.5 justify-center text-center">
                  <Truck size={15} className="text-brand-red flex-shrink-0" />
                  <span>Hızlı Kargo</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center text-center border-x border-slate-200">
                  <ShieldCheck size={15} className="text-emerald-600 flex-shrink-0" />
                  <span>Distribütör Garantisi</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center text-center">
                  <CreditCard size={15} className="text-brand-red flex-shrink-0" />
                  <span>Taksit İmkanı</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sıkça Birlikte Alınanlar — Akıllı Bundle Motoru */}
        {crossSellData && crossSellData.length > 0 && (
          <SmartBundleBuilder
            mainProduct={product as any}
            accessories={crossSellData as any}
            kur={kur}
          />
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

        {/* Değerlendirmeler / Yorumlar */}
        <ProductReviews urun_id={product.id} />

        {/* Sıkça Sorulan Sorular & FAQPage Şeması */}
        <ProductFaq productName={product.ad} brandName={brandName} />

        <RecentlyViewed />
      </div>
    </div>
  )
}
