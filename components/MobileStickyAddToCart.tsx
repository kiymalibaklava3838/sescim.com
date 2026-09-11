'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Check, ShoppingBag } from 'lucide-react'
import { addToCart, getCartCount } from '@/lib/cart'
import { dovizToTL, type KurData } from '@/lib/kur'
import { getKurClient } from '@/lib/kur-client'
import { useCartStore } from '@/store/useCartStore'

interface Props {
  product: {
    id: string
    ad: string
    kategori: string
    slug?: string
    fotograflar: string[]
    fiyat: number
    indirimli_fiyat?: number | null
    para_birimi?: string
    stok_durumu?: string
    sescim_fiyat?: number
    sescim_indirimli_fiyat?: number | null
    fiyat_sorunuz?: boolean
  }
}

export default function MobileStickyAddToCart({ product }: Props) {
  const [added, setAdded] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [kur, setKur] = useState<KurData>({ USD: 38.0, EUR: 41.0, guncelleme: null })
  const { toggleDrawer } = useCartStore()

  useEffect(() => {
    getKurClient().then(setKur).catch(() => {})
    const updateCount = () => setCartCount(getCartCount())
    updateCount()
    window.addEventListener('cart-updated', updateCount)
    return () => window.removeEventListener('cart-updated', updateCount)
  }, [])

  const pb = product.para_birimi || 'TRY'
  const rawPrice = product.sescim_indirimli_fiyat ?? product.sescim_fiyat ?? product.indirimli_fiyat ?? product.fiyat
  const priceTL = dovizToTL(rawPrice, pb, kur)

  const isTukendi = product.stok_durumu === 'tukendi'

  const handleAdd = () => {
    if (isTukendi || product.fiyat_sorunuz) return

    addToCart({
      id: product.id,
      ad: product.ad,
      kategori: product.kategori,
      fotograf: product.fotograflar?.[0] || '',
      fiyat: priceTL,
      fiyat_doviz: rawPrice,
      para_birimi: pb,
      indirimli_fiyat: product.sescim_indirimli_fiyat ? priceTL : null,
      indirimli_fiyat_doviz: product.sescim_indirimli_fiyat || null,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const shareText = encodeURIComponent(
    `Merhaba, sescim.com'da incelediğim "${product.ad}" ürünü için distribütör özel fiyat teklifi almak istiyorum.\nÜrün: https://sescim.com/urun/${product.slug || product.id}`
  )

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_25px_rgba(0,0,0,0.1)] pb-safe transition-transform duration-300">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        
        {/* Fiyat & Taksit Alanı */}
        {product.fiyat_sorunuz ? (
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[9px] font-display uppercase tracking-widest text-amber-700 font-bold leading-tight">
              DİSTRİBÜTÖR KURALI
            </span>
            <div className="font-display font-black text-base text-slate-900 uppercase tracking-tight truncate">
              FİYAT SORUNUZ
            </div>
            <span className="text-[9px] text-slate-500 font-medium leading-none">
              Özel teklif için ulaşın
            </span>
          </div>
        ) : (
          <div className="flex flex-col min-w-0 pr-1">
            <span className="text-[10px] font-display uppercase tracking-widest text-slate-400 font-bold leading-tight">
              Peşin Fiyat
            </span>
            <div className="font-display font-black text-lg text-brand-red tracking-tight truncate">
              {priceTL.toLocaleString('tr-TR')} ₺
            </div>
            <span className="text-[9px] text-slate-500 font-medium leading-none">
              12x taksit imkanı
            </span>
          </div>
        )}

        {/* Butonlar Grubu */}
        <div className="flex items-center gap-2 shrink-0">
          
          {product.fiyat_sorunuz ? (
            <a
              href={`https://wa.me/905323934370?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Fiyat Teklifi Al</span>
            </a>
          ) : (
            <>
              {/* Sepet İkonu (Canlı Adet Rozetli) */}
              <button
                type="button"
                onClick={toggleDrawer}
                className="relative w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 transition-colors shadow-xs"
                aria-label="Sepeti Aç"
              >
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-xs">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>

              {/* WhatsApp Danışma */}
              <a
                href={`https://wa.me/905323934370?text=${shareText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 transition-colors shadow-xs"
                title="WhatsApp ile Bilgi Al"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>

              {/* Sepete Ekle Butonu */}
              <button
                onClick={handleAdd}
                disabled={isTukendi}
                className={`h-11 px-5 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  isTukendi
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-brand-red hover:bg-brand-red-dark text-white'
                }`}
              >
                {added ? (
                  <>
                    <Check size={16} />
                    <span>Eklendi</span>
                  </>
                ) : isTukendi ? (
                  <span>Tükendi</span>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    <span>Sepete Ekle</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
