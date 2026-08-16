'use client'

import { useState } from 'react'
import { Phone } from 'lucide-react'

export default function IletisimForm() {
  const [form, setForm] = useState({
    ad: '',
    soyad: '',
    telefon: '',
    email: '',
    konu: '',
    mesaj: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ad.trim() || !form.email.trim() || !form.mesaj.trim()) {
      setError('Ad, e-posta ve mesaj zorunludur.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/iletisim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) {
        setError(data.error || 'Gönderilemedi.')
        return
      }
      setDone(true)
    } catch {
      setLoading(false)
      setError('Bağlantı hatası.')
    }
  }

  if (done) {
    return (
      <div className="bg-green-500/10 border border-green-500/20 p-6 text-center">
        <p className="font-display font-bold text-green-400 text-sm uppercase tracking-widest mb-2">Teşekkürler</p>
        <p className="font-body text-white/50 text-sm">Mesajınız alındı. En kısa sürede size dönüş yapacağız.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Ad</label>
          <input
            name="ad"
            type="text"
            className="input-dark"
            placeholder="Adınız"
            required
            value={form.ad}
            onChange={(e) => set('ad', e.target.value)}
          />
        </div>
        <div>
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Soyad</label>
          <input
            name="soyad"
            type="text"
            className="input-dark"
            placeholder="Soyadınız"
            value={form.soyad}
            onChange={(e) => set('soyad', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Telefon</label>
        <input
          name="telefon"
          type="tel"
          className="input-dark"
          placeholder="+90 5xx xxx xx xx"
          value={form.telefon}
          onChange={(e) => set('telefon', e.target.value)}
        />
      </div>
      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">E-posta</label>
        <input
          name="email"
          type="email"
          className="input-dark"
          placeholder="email@ornek.com"
          required
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>
      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Konu</label>
        <select
          name="konu"
          className="input-dark appearance-none cursor-pointer"
          value={form.konu}
          onChange={(e) => set('konu', e.target.value)}
        >
          <option value="">Konu seçin</option>
          <option>Ses Sistemleri</option>
          <option>Işık Sistemleri</option>
          <option>Görüntü Sistemleri</option>
          <option>AKUSTEK Okul Saati</option>
          <option>Servis & Teknik Destek</option>
          <option>Diğer</option>
        </select>
      </div>
      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Mesaj</label>
        <textarea
          name="mesaj"
          rows={5}
          className="input-dark resize-none"
          placeholder="Mesajınızı buraya yazın..."
          required
          value={form.mesaj}
          onChange={(e) => set('mesaj', e.target.value)}
        />
      </div>
      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-sm font-body">{error}</div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-sm disabled:opacity-40">
        {loading ? 'Gönderiliyor...' : 'Mesaj Gönder'}
      </button>

      <div className="text-center pt-2">
        <p className="text-white/20 text-xs mb-3">veya</p>
        <a href="tel:+903522316915" className="btn-outline w-full justify-center text-sm">
          <Phone size={14} />
          Hemen Arayın: +90 352 231 69 15
        </a>
      </div>
    </form>
  )
}
