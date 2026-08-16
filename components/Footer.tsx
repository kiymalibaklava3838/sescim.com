'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Phone, Mail, Instagram, Youtube, Twitter, ShieldCheck } from 'lucide-react'
import { KATEGORILER } from '@/lib/categories'

export default function Footer() {
  const displayCategories = KATEGORILER.slice(0, 8)

  return (
    <footer className="bg-white border-t border-slate-200">
      {/* Footer top: Newsletter */}
      <div className="bg-slate-50 py-12 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Kampanyalardan Haberdar Ol</h3>
            <p className="text-sm text-slate-500 mt-1">Yeni ürünler ve özel fırsatlar için e-bültene abone ol.</p>
          </div>
          <form className="flex w-full max-w-md" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="E-posta adresin"
              className="flex-1 border border-slate-300 rounded-l-md px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red"
            />
            <button type="submit" className="bg-brand-red hover:bg-red-700 text-white font-semibold text-sm px-6 py-3 rounded-r-md transition-colors">
              ABONE OL
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand & Socials */}
        <div className="md:col-span-1">
          <Link href="/" className="inline-block mb-6">
            <Image src="/logo.png" alt="sescim.com" width={140} height={48} className="object-contain h-10 w-auto" />
          </Link>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Türkiye'nin lider ses, ışık ve görüntü ekipmanları e-ticaret platformu. Profesyonel ve amatör kullanıcılar için binlerce ürün.
          </p>
          <div className="flex items-center gap-4">
            <a href="https://www.instagram.com/sescim" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-red transition-colors">
              <Instagram size={20} />
            </a>
            <a href="https://youtube.com/@sescim" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-red transition-colors">
              <Youtube size={20} />
            </a>
            <a href="https://twitter.com/sescim" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-brand-red transition-colors">
              <Twitter size={20} />
            </a>
          </div>
        </div>

        {/* Pages */}
        <div>
          <h4 className="font-bold text-slate-800 text-sm mb-6">Sayfalar</h4>
          <ul className="space-y-3">
            {[
              { label: 'Ana Sayfa', href: '/' },
              { label: 'Ürünler', href: '/urunler' },
              { label: 'Kampanyalar', href: '/kampanyalar' },
              { label: 'Hakkımızda', href: '/hakkimizda' },
              { label: 'İletişim', href: '/iletisim' },
              { label: 'Banka Hesaplarımız', href: '/banka-hesaplari' },
              { label: 'Mesafeli Satış Sözleşmesi', href: '/mesafeli-satis-sozlesmesi' },
              { label: 'İptal ve İade Koşulları', href: '/iptal-ve-iade' },
              { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
            ].map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="text-slate-500 hover:text-brand-red text-sm transition-colors">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Categories */}
        <div>
          <h4 className="font-bold text-slate-800 text-sm mb-6">Kategoriler</h4>
          <ul className="space-y-3">
            {displayCategories.map((item) => (
              <li key={item}>
                <Link href="/urunler" className="text-slate-500 hover:text-brand-red text-sm transition-colors">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-bold text-slate-800 text-sm mb-6">İletişim</h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3 text-slate-500 text-sm">
              <MapPin size={18} className="text-slate-400 shrink-0 mt-0.5" />
              <span>Cumhuriyet Mah. Sur Cad. No:17/A, Melikgazi / Kayseri</span>
            </li>
            <li>
              <a href="tel:+903522316915" className="flex items-center gap-3 text-slate-500 hover:text-brand-red text-sm transition-colors">
                <Phone size={18} className="text-slate-400 shrink-0" />
                +90 352 231 69 15
              </a>
            </li>
            <li>
              <a href="mailto:info@sescim.com" className="flex items-center gap-3 text-slate-500 hover:text-brand-red text-sm transition-colors">
                <Mail size={18} className="text-slate-400 shrink-0" />
                info@sescim.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="bg-slate-100 py-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>© {new Date().getFullYear()} sescim.com. Tüm hakları saklıdır.</span>
            <span className="hidden sm:inline-block w-1 h-1 bg-slate-300 rounded-full"></span>
            <a href="https://www.akdagelektronik.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-red flex items-center gap-1 hover:underline hover:text-brand-red/80 transition-colors">
              <ShieldCheck size={12} /> AKDAĞ ELEKTRONİK güvencesiyle.
            </a>
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/mesafeli-satis-sozlesmesi" className="hover:text-brand-red transition-colors">Mesafeli Satış Sözleşmesi</Link>
            <Link href="/iptal-ve-iade" className="hover:text-brand-red transition-colors">İptal ve İade</Link>
            <Link href="/gizlilik-politikasi" className="hover:text-brand-red transition-colors">Gizlilik Politikası</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
