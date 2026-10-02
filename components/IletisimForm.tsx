'use client'

import { useState } from 'react'
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function IletisimForm() {
  const [formData, setFormData] = useState({
    ad: '',
    email: '',
    telefon: '',
    konu: '',
    mesaj: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ad.trim() || !formData.email.trim() || !formData.mesaj.trim()) {
      setError('Lütfen Ad Soyad, E-posta ve Mesaj alanlarını doldurunuz.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/iletisim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Mesaj gönderilemedi.')
      }

      setIsSubmitted(true)
      setFormData({ ad: '', email: '', telefon: '', konu: '', mesaj: '' })
    } catch (err: any) {
      setError(err.message || 'Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.')
    } finally {
      setLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">Mesajınız Başarıyla Alındı!</h3>
        <p className="text-slate-500 max-w-sm text-sm">
          Mesajınız ilgili teknik birimimize iletildi. En kısa sürede sizinle iletişime geçeceğiz. Teşekkür ederiz.
        </p>
        <button
          type="button"
          onClick={() => setIsSubmitted(false)}
          className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
        >
          Yeni Mesaj Gönder
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="ad" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Ad Soyad *
        </label>
        <input
          type="text"
          id="ad"
          required
          value={formData.ad}
          onChange={(e) => setFormData({ ...formData, ad: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all text-sm"
          placeholder="Adınız Soyadınız"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            E-posta *
          </label>
          <input
            type="email"
            id="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all text-sm"
            placeholder="ornek@email.com"
          />
        </div>
        <div>
          <label htmlFor="telefon" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Telefon
          </label>
          <input
            type="tel"
            id="telefon"
            value={formData.telefon}
            onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all text-sm"
            placeholder="05xx xxx xx xx"
          />
        </div>
      </div>

      <div>
        <label htmlFor="konu" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Konu
        </label>
        <input
          type="text"
          id="konu"
          value={formData.konu}
          onChange={(e) => setFormData({ ...formData, konu: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all text-sm"
          placeholder="Mesajınızın konusu"
        />
      </div>

      <div>
        <label htmlFor="mesaj" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
          Mesaj *
        </label>
        <textarea
          id="mesaj"
          required
          rows={4}
          value={formData.mesaj}
          onChange={(e) => setFormData({ ...formData, mesaj: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all resize-none text-sm"
          placeholder="Mesajınızı veya proje detayınızı buraya yazın..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-red hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Gönderiliyor...</span>
          </>
        ) : (
          <>
            <Send size={18} />
            <span>Mesaj Gönder</span>
          </>
        )}
      </button>
    </form>
  )
}
