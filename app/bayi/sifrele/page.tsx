'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, CheckCircle, AlertCircle, Loader } from 'lucide-react'

type Status = 'loading' | 'ready' | 'error' | 'success'

function SifreBelirleContent() {
  const [status, setStatus] = useState<Status>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const supabase = useRef(createClient()).current

  // OTP akışında kullanıcı buraya oturum açmış olarak gelir.
  // Sadece aktif session olup olmadığını kontrol ediyoruz.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        setStatus('ready')
      }
    })

    supabase.auth.getSession().then((res: any) => {
      const session = res.data.session;
      if (session) {
        setStatus('ready')
      } else {
        setStatus('error')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async () => {
    setFormError('')
    if (password.length < 8) { setFormError('Şifre en az 8 karakter olmalıdır.'); return }
    if (password !== confirm) { setFormError('Şifreler eşleşmiyor.'); return }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) { setFormError(`Hata: ${error.message}`); return }

    setStatus('success')
    setTimeout(() => { window.location.href = '/bayi' }, 2000)
  }

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : password.length < 14 ? 3 : 4
  const strengthLabel = ['', 'Çok zayıf', 'Zayıf', 'Orta', 'Güçlü']
  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Akdağ Elektronik</span>
            <div className="w-8 h-px bg-brand-red" />
          </div>
          <h1 className="font-display font-black text-3xl uppercase text-white">
            {status === 'success' ? 'Şifre Güncellendi' : 'Yeni Şifre Belirle'}
          </h1>
          <p className="font-body text-white/30 text-sm mt-2">
            {status === 'loading' ? 'Oturum doğrulanıyor...' :
             status === 'ready' ? 'Hesabınız için güçlü bir şifre belirleyin.' :
             status === 'success' ? 'Panele yönlendiriliyorsunuz...' :
             'Bir sorun oluştu.'}
          </p>
        </div>

        <div className="bg-[#141414] border border-white/8 p-8"
          style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>

          {/* Yükleniyor */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader size={32} className="text-brand-red animate-spin" />
              <p className="font-body text-white/40 text-sm text-center">
                Güvenli bağlantı kontrol ediliyor...
              </p>
            </div>
          )}

          {/* Hata: Oturum bulunamadı */}
          {status === 'error' && (
            <div className="flex flex-col gap-5 py-4">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 p-4 rounded-sm">
                <AlertCircle size={18} className="text-brand-red flex-shrink-0 mt-0.5" />
                <p className="font-body text-red-400/90 text-sm leading-relaxed">
                  Oturum bulunamadı. Lütfen şifre sıfırlama adımlarını tekrar tamamlayın.
                </p>
              </div>
              <a href="/bayi/sifre-sifirla" className="btn-primary w-full justify-center text-sm text-center">
                Şifre Sıfırlamaya Başla
              </a>
              <a href="/bayi" className="btn-outline text-sm w-full justify-center text-center">
                Giriş Sayfasına Dön
              </a>
            </div>
          )}

          {/* Başarılı */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle size={48} className="text-green-400" />
              <p className="font-body text-white/40 text-sm">Bayi panelinize yönlendiriliyorsunuz...</p>
            </div>
          )}

          {/* Şifre Formu */}
          {status === 'ready' && (
            <div className="space-y-5">
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Yeni Şifre</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-dark pr-12 w-full"
                    placeholder="En az 8 karakter"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Güç göstergesi */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 transition-all duration-300 ${strength >= i ? strengthColor[strength] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="font-body text-white/25 text-xs">{strengthLabel[strength]}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">Şifre Tekrar</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`input-dark w-full ${confirm && confirm !== password ? 'border-red-500/50' : ''}`}
                  placeholder="Şifreyi tekrar girin"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
                {confirm && confirm !== password && (
                  <p className="font-body text-red-400/70 text-xs mt-1">Şifreler eşleşmiyor</p>
                )}
              </div>

              {formError && (
                <div className="flex items-start gap-2 bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-xs font-body">
                  <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={saving || !password || !confirm}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {saving ? 'Kaydediliyor...' : 'Şifremi Kaydet ve Giriş Yap'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Next.js 14 — useSearchParams() Suspense boundary gerektirir
export default function SifreBelirle() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader size={32} className="text-brand-red animate-spin" />
      </div>
    }>
      <SifreBelirleContent />
    </Suspense>
  )
}