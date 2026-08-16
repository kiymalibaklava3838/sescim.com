'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle, ArrowRight, Building, User, Phone, Mail, MapPin, MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function BayiBasvuruPage() {
  const [form, setForm] = useState({
    firma_adi: '',
    yetkili_adi: '',
    telefon: '',
    email: '',
    sehir: '',
    mesaj: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.firma_adi || !form.yetkili_adi || !form.telefon || !form.email || !form.sehir) {
      setError('Lütfen zorunlu alanları doldurun.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.from('bayi_basvurular').insert({
      firma_adi: form.firma_adi,
      yetkili_adi: form.yetkili_adi,
      telefon: form.telefon,
      email: form.email,
      sehir: form.sehir,
      mesaj: form.mesaj,
    })

    setLoading(false)
    if (err) {
      setError(`Gönderim hatası: ${err.message}`)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-400" />
          </div>
          <h1 className="font-display font-black text-3xl uppercase text-white mb-3">Başvurunuz Alındı!</h1>
          <p className="font-body text-white/40 text-base leading-relaxed mb-8">
            Bayi başvurunuz incelemeye alınmıştır. En kısa sürede{' '}
            <strong className="text-white">{form.email}</strong> adresinize geri dönüş yapılacaktır.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="btn-primary text-sm">
              Ana Sayfaya Dön
              <ArrowRight size={14} />
            </Link>
            <Link href="/bayi" className="btn-outline text-sm">
              Bayi Girişi
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-8 pb-24">
      {/* Header */}
      <div className="bg-[#0A0A0A] border-b border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Bayi Ağımıza Katılın</span>
          </div>
          <h1 className="font-display font-black text-5xl md:text-6xl uppercase text-white leading-none mb-4">
            BAYİ<br /><span className="text-brand-red">BAŞVURUSU</span>
          </h1>
          <p className="font-body text-white/40 text-base max-w-xl leading-relaxed">
            Akdağ Elektronik bayi ağına katılarak özel fiyatlar, öncelikli teknik destek ve daha fazla avantajdan yararlanın.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-16 grid md:grid-cols-3 gap-16">
        {/* Avantajlar */}
        <div>
          <h2 className="font-display font-bold text-xl uppercase text-white tracking-wide mb-8 red-line">
            Bayi Avantajları
          </h2>
          <div className="space-y-4">
            {[
              { icon: '💰', title: 'Özel Bayi Fiyatları', desc: 'Tüm ürünlerde özel indirimli fiyatlar.' },
              { icon: '📦', title: 'Stok Önceliği', desc: 'Yeni ürünlerde stok önceliği hakkı.' },
              { icon: '🎯', title: 'Teknik Destek', desc: 'Öncelikli teknik destek hattı.' },
              { icon: '📋', title: 'Katalog Erişimi', desc: 'Güncel fiyat listesi ve kataloglara erişim.' },
              { icon: '🤝', title: 'Bölgesel Temsil', desc: 'Bölgenizde yetkili bayi unvanı.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 bg-[#141414] border border-white/5 p-4">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div>
                  <div className="font-display font-bold text-sm uppercase text-white tracking-wide">{item.title}</div>
                  <div className="font-body text-white/35 text-xs mt-1 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="md:col-span-2">
          <h2 className="font-display font-bold text-xl uppercase text-white tracking-wide mb-8 red-line">
            Başvuru Formu
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                  <Building size={11} className="inline mr-1" />Firma Adı *
                </label>
                <input type="text" value={form.firma_adi} onChange={(e) => set('firma_adi', e.target.value)}
                  className="input-dark" placeholder="Firma Adı Ltd. Şti." />
              </div>
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                  <User size={11} className="inline mr-1" />Yetkili Adı *
                </label>
                <input type="text" value={form.yetkili_adi} onChange={(e) => set('yetkili_adi', e.target.value)}
                  className="input-dark" placeholder="Ad Soyad" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                  <Phone size={11} className="inline mr-1" />Telefon *
                </label>
                <input type="tel" value={form.telefon} onChange={(e) => set('telefon', e.target.value)}
                  className="input-dark" placeholder="+90 5xx xxx xx xx" />
              </div>
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                  <Mail size={11} className="inline mr-1" />E-posta *
                </label>
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                  className="input-dark" placeholder="firma@email.com" />
              </div>
            </div>

            <div>
              <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                <MapPin size={11} className="inline mr-1" />Şehir *
              </label>
              <input type="text" value={form.sehir} onChange={(e) => set('sehir', e.target.value)}
                className="input-dark" placeholder="İstanbul, Ankara, İzmir..." />
            </div>

            <div>
              <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                <MessageSquare size={11} className="inline mr-1" />Mesaj / Ek Bilgi
              </label>
              <textarea value={form.mesaj} onChange={(e) => set('mesaj', e.target.value)}
                rows={4} className="input-dark resize-none"
                placeholder="Firmanız hakkında kısa bilgi verebilirsiniz..." />
            </div>

            {error && (
              <div className="bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-sm font-body">
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="btn-primary w-full justify-center text-sm disabled:opacity-40">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight size={15} />}
              {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
            </button>

            <p className="font-body text-white/20 text-xs text-center">
              Başvurunuz incelendikten sonra sistem üzerinden hesap oluşturmanız için bilgilendirileceksiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
