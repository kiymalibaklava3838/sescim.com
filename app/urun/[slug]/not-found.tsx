import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'

export default function UrunNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-20 h-20 bg-[#141414] border border-white/5 flex items-center justify-center mx-auto mb-6">
          <Package size={36} className="text-white/10" />
        </div>
        <h1 className="font-display font-900 text-3xl uppercase text-white tracking-tight mb-3">Ürün Bulunamadı</h1>
        <p className="font-body text-white/30 mb-8">Bu ürün mevcut değil veya kaldırılmış olabilir.</p>
        <Link href="/urunler" className="btn-primary text-sm inline-flex">
          Ürünlere Dön
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
