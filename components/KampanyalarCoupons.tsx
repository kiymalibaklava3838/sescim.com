'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import CouponCard from '@/components/CouponCard'
import { Ticket, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Kupon {
  id: string
  kod: string
  indirim_tipi: 'yuzde' | 'sabit'
  indirim_miktari: number
  min_tutar: number | null
  gecerlilik_tarihi: string | null
  aktif: boolean
  aciklama?: string | null
  ozel_mi?: boolean
  kategori?: string | null
  max_kullanim?: number | null
  kullanim_sayisi?: number
}

interface Props {
  initialCoupons: Kupon[]
}

export default function KampanyalarCoupons({ initialCoupons }: Props) {
  const [coupons, setCoupons] = useState<Kupon[]>(initialCoupons || [])
  const [loading, setLoading] = useState(false)

  const filterPublicCoupons = (list: any[]): Kupon[] => {
    const now = Date.now()
    return list.filter((k) => {
      // Yalnızca aktif kuponlar
      if (!k.aktif) return false
      // Özel/Gizli (Instagram veya kişiye özel) kuponları genel sayfada gösterme
      if (k.ozel_mi === true) return false
      // Süresi dolmuş kuponları gösterme
      if (k.gecerlilik_tarihi && new Date(k.gecerlilik_tarihi).getTime() < now) return false
      // Kullanım limiti dolmuş kuponları gösterme
      if (k.max_kullanim && (k.kullanim_sayisi || 0) >= k.max_kullanim) return false
      return true
    })
  }

  const loadCoupons = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('kuponlar')
        .select('*')
        .eq('aktif', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setCoupons(filterPublicCoupons(data))
      }
    } catch (e) {
      console.error('Kuponlar yüklenemedi:', e)
    }
  }

  useEffect(() => {
    loadCoupons()

    // Sayfaya dönüldüğünde (focus) kupon listesini tazele
    const handleFocus = () => loadCoupons()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  if (coupons.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <Ticket size={30} className="text-slate-300" />
        </div>
        <h3 className="font-display font-bold text-lg text-slate-800 mb-1">
          Şu Anda Yayında Olan Genel Kupon Bulunmuyor
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 font-body max-w-md mx-auto mb-6 leading-relaxed">
          Instagram sayfamızdaki (<span className="text-brand-red font-semibold">@sescim</span>) veya kampanya duyurularımızdaki özel kodları hesabınıza ekleyerek indirimlerden yararlanabilirsiniz.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/hesabim"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red text-white text-xs font-display font-bold uppercase tracking-wider rounded-xl hover:bg-red-700 transition-colors shadow-sm"
          >
            Kupon Kodu Tanımla (Hesabım) <ArrowRight size={14} />
          </Link>
          <Link
            href="/firsatlar"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 text-xs font-display font-bold uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors"
          >
            Fırsat Ürünlerini İncele
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {coupons.map((coupon) => {
        const discountText =
          coupon.indirim_tipi === 'yuzde'
            ? `%${coupon.indirim_miktari} İndirim`
            : `${coupon.indirim_miktari.toLocaleString('tr-TR')} ₺ İndirim`

        return (
          <CouponCard
            key={coupon.id || coupon.kod}
            code={coupon.kod}
            discountText={discountText}
            description={coupon.aciklama || 'Tüm siparişlerinizde sepet aşamasında anında indirim.'}
            minAmount={coupon.min_tutar}
            validUntil={coupon.gecerlilik_tarihi}
            kategori={coupon.kategori}
          />
        )
      })}
    </div>
  )
}
