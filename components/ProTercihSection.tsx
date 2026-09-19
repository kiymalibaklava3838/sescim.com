import { getProTercihProducts } from '@/lib/pro-tercih'
import { getKur, dovizToTL, formatFiyat } from '@/lib/kur'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Award, Headphones, Package, Sparkles } from 'lucide-react'
import { StaggerContainer, StaggerItem } from './MotionComponents'

export default async function ProTercihSection() {
  const products = await getProTercihProducts()
  if (!products || products.length === 0) return null

  const kur = await getKur()
  // 4 veya 8'li grid için uygun adette göster
  const displayCount = Math.min(products.length, 8)
  const displayProducts = products.slice(0, displayCount)

  return (
    <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Arka plan stüdyo ambiyans ışığı */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Üst Başlık & Açıklama */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-slate-800 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Award size={14} className="text-amber-400" />
              <span>Stüdyo & Canlı Performans Standardı</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Profesyonellerin Tercihi
            </h2>
            <p className="text-slate-400 text-sm md:text-base mt-2 max-w-2xl">
              Türkiye&apos;nin önde gelen ses mühendisleri, müzik prodüktörleri ve sahne ekiplerinin stüdyo ve canlı konserlerde güvendiği referans ekipmanlar.
            </p>
          </div>

          <Link
            href="/urunler"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors group"
          >
            Tüm Pro Kataloğu Keşfet
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Ürün Listesi */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayProducts.map((product) => {
            const pb = product.para_birimi || 'TRY'
            const aktifFiyat = product.sescim_fiyat ?? product.fiyat
            const indirimli = product.sescim_indirimli_fiyat ?? null

            const aktifFiyatTL = aktifFiyat ? dovizToTL(aktifFiyat, pb, kur) : null
            const normalFiyatTL = dovizToTL(product.fiyat ?? 0, pb, kur)
            const indirimliFiyatTL = indirimli ? dovizToTL(indirimli, pb, kur) : null

            return (
              <StaggerItem key={product.id} className="flex flex-col h-full">
                <div className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl overflow-hidden group transition-all duration-300 flex flex-col h-full shadow-lg hover:shadow-amber-500/5">
                  {/* Görsel Alanı */}
                  <Link
                    href={`/urun/${product.slug || product.id}`}
                    prefetch={true}
                    className="block relative aspect-square bg-slate-950/60 p-5 overflow-hidden"
                  >
                    {product.fotograflar && product.fotograflar.length > 0 ? (
                      <Image
                        src={product.fotograflar[0]}
                        alt={product.ad}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Package size={48} />
                      </div>
                    )}

                    {/* Pro Tercih Rozeti */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-md">
                        <Sparkles size={10} />
                        PRO TERCİH
                      </span>
                    </div>

                    {/* İndirim Varsa Rozet */}
                    {indirimliFiyatTL && aktifFiyatTL && indirimliFiyatTL < aktifFiyatTL && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          FIRSAT
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* İçerik */}
                  <div className="p-4 flex flex-col flex-1 border-t border-slate-700/50">
                    {/* Marka & Kategori */}
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-amber-400 tracking-wide uppercase">
                        {product.marka || 'REFERANS'}
                      </span>
                      {product.stok_durumu === 'tukendi' ? (
                        <span className="text-slate-500 text-[11px]">Tükendi</span>
                      ) : (
                        <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Stokta
                        </span>
                      )}
                    </div>

                    {/* Ürün Adı */}
                    <Link
                      href={`/urun/${product.slug || product.id}`}
                      className="font-medium text-slate-100 text-sm hover:text-amber-400 line-clamp-2 transition-colors mb-3 flex-1"
                    >
                      {product.ad}
                    </Link>

                    {/* Fiyat & Aksiyon */}
                    <div className="pt-3 border-t border-slate-700/60 mt-auto">
                      {product.fiyat_sorunuz ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400">Pro Fiyatlama</span>
                          <Link
                            href={`/urun/${product.slug || product.id}`}
                            className="text-xs font-semibold text-amber-400 hover:text-amber-300 py-1 px-2.5 rounded bg-amber-500/10 border border-amber-500/20"
                          >
                            Teklif İste
                          </Link>
                        </div>
                      ) : (
                        <div className="flex items-end justify-between">
                          <div>
                            {indirimliFiyatTL && indirimliFiyatTL < (aktifFiyatTL || normalFiyatTL) ? (
                              <>
                                <span className="text-xs text-slate-400 line-through block">
                                  {formatFiyat((aktifFiyatTL || normalFiyatTL) ?? 0, 'TRY')}
                                </span>
                                <span className="text-base font-bold text-amber-400">
                                  {formatFiyat(indirimliFiyatTL, 'TRY')}
                                </span>
                              </>
                            ) : (
                              <span className="text-base font-bold text-white">
                                {formatFiyat((aktifFiyatTL || normalFiyatTL) ?? 0, 'TRY')}
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/urun/${product.slug || product.id}`}
                            className="text-xs font-medium text-slate-300 group-hover:text-white bg-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950 px-3 py-1.5 rounded-md transition-colors"
                          >
                            İncele
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}
