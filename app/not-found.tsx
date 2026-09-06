import Link from 'next/link'
import { AlertTriangle, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[75vh] bg-slate-50 flex items-center justify-center px-6 py-20">
      <div className="text-center max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-12">
        <div className="w-20 h-20 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-red">
          <AlertTriangle size={40} className="text-brand-red" />
        </div>
        
        <h1 className="font-display font-black text-6xl md:text-7xl text-slate-900 uppercase tracking-tighter mb-2">404</h1>
        <p className="font-display font-bold text-lg text-slate-700 uppercase tracking-widest mb-6">Sayfa Bulunamadı</p>
        
        <div className="w-12 h-1 bg-brand-red mx-auto mb-6 rounded-full" />
        
        <p className="font-body text-slate-500 text-sm leading-relaxed mb-8">
          Aradığınız sayfa silinmiş, ismi değiştirilmiş veya geçici olarak kullanım dışı kalmış olabilir. 
          Kataloğumuza göz atarak aradığınız ürünü kolayca bulabilirsiniz.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary w-full sm:w-auto justify-center px-6 py-3 text-xs tracking-wider uppercase font-bold rounded-xl shadow-md">
            <Home size={15} /> ANA SAYFAYA DÖN
          </Link>
          <Link href="/urunler" className="btn-outline w-full sm:w-auto justify-center px-6 py-3 text-xs tracking-wider uppercase font-bold rounded-xl">
            <Search size={15} /> ÜRÜN ARA
          </Link>
        </div>
      </div>
    </div>
  )
}
