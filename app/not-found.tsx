import Link from 'next/link'
import { AlertTriangle, Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="relative inline-block mb-10">
          <div className="absolute inset-0 bg-brand-red blur-[100px] opacity-20" />
          <AlertTriangle size={80} className="text-brand-red relative z-10" />
        </div>
        
        <h1 className="font-display font-black text-6xl md:text-8xl text-white uppercase tracking-tighter mb-4">404</h1>
        <p className="font-display font-bold text-xl text-white/60 uppercase tracking-widest mb-8">Sayfa Bulunamadı</p>
        
        <div className="w-12 h-1 bg-brand-red mx-auto mb-8" />
        
        <p className="font-body text-white/30 mb-12 leading-relaxed">
          Aradığınız sayfa silinmiş, ismi değiştirilmiş veya geçici olarak kullanım dışı kalmış olabilir. 
          Kataloğumuza göz atarak aradığınız ürünü bulabilirsiniz.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="btn-primary w-full sm:w-auto justify-center px-10">
            <Home size={16} /> ANA SAYFAYA DÖN
          </Link>
          <Link href="/urunler" className="btn-outline w-full sm:w-auto justify-center px-10">
            <Search size={16} /> ÜRÜN ARA
          </Link>
        </div>
      </div>
    </div>
  )
}
