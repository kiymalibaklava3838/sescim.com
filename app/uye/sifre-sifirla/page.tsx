'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function SifreSifirlaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const supabase = useRef(createClient()).current

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/uye/sifre-guncelle`,
    })
    if (err) setError(err.message)
    else setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-6 py-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/">
            <Image src="/logo.png" alt="sescim.com" width={150} height={50} className="object-contain h-12 w-auto mx-auto mb-8" />
          </Link>
          <h1 className="font-display font-black text-2xl uppercase text-white">Şifremi Unuttum</h1>
          <p className="font-body text-white/40 text-sm mt-2">E-posta adresinize sıfırlama linki gönderilecek.</p>
        </div>

        <div className="bg-[#141414] border border-white/8 p-8">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle size={40} className="text-green-400 mx-auto mb-4" />
              <h3 className="font-display font-black text-lg text-white mb-2">E-posta Gönderildi!</h3>
              <p className="font-body text-white/40 text-sm">Mailinizi kontrol edin ve sıfırlama linkine tıklayın.</p>
              <Link href="/uye" className="mt-6 inline-flex items-center gap-2 text-brand-red font-display font-semibold text-xs tracking-widest uppercase hover:opacity-80">
                Girişe Dön
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/50 block mb-2">E-posta Adresiniz</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ornek@email.com"
                    className="w-full bg-[#0F0F0F] border border-white/10 text-white pl-11 pr-4 py-3.5 text-sm font-body focus:outline-none focus:border-brand-red/50 transition-colors" />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm font-body">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-brand-red text-white font-display font-bold text-sm tracking-widest uppercase py-4 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'LINK GÖNDER'}
              </button>
              <div className="text-center">
                <Link href="/uye" className="text-white/30 text-xs hover:text-brand-red transition-colors font-body">
                  Giriş sayfasına dön
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
