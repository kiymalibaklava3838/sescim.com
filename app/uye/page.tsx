'use client'

import { Suspense, useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, User as UserIcon, Phone, Check } from 'lucide-react'

function sanitizeNextPath(raw: string | null): string {
  if (!raw) return '/hesabim'
  const trimmed = raw.trim()
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    trimmed.startsWith('/uye')
  ) {
    return '/hesabim'
  }
  if (trimmed.startsWith('/uye/panel')) return '/hesabim'
  return trimmed
}

function evaluatePasswordStrength(pass: string): { score: number; label: string; color: string; barColor: string } {
  if (!pass) return { score: 0, label: '', color: '', barColor: 'bg-slate-200' }
  let score = 0
  if (pass.length >= 6) score += 1
  if (pass.length >= 8) score += 1
  if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1
  if (/\d/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass)) score += 1

  if (score <= 2) {
    return { score: 1, label: 'Zayıf', color: 'text-red-600', barColor: 'bg-red-500' }
  }
  if (score <= 3) {
    return { score: 2, label: 'Orta', color: 'text-amber-600', barColor: 'bg-amber-500' }
  }
  return { score: 3, label: 'Güçlü', color: 'text-emerald-600', barColor: 'bg-emerald-500' }
}

function UyePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialTab = searchParams.get('tab') === 'kayit' ? 'kayit' : 'giris'
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get('next') || searchParams.get('redirect')),
    [searchParams]
  )
  const urlError = searchParams.get('error')

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'giris' | 'kayit'>(initialTab)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Giris form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Kayit form
  const [regAd, setRegAd] = useState('')
  const [regSoyad, setRegSoyad] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regTel, setRegTel] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPassConfirm, setRegPassConfirm] = useState('')
  const [kvkkAccepted, setKvkkAccepted] = useState(false)
  const [regError, setRegError] = useState('')
  const [regSubmitting, setRegSubmitting] = useState(false)

  const supabase = useRef(createClient()).current
  const passwordStrength = useMemo(() => evaluatePasswordStrength(regPass), [regPass])

  // URL'deki tab değişirse senkronize et
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'kayit') setTab('kayit')
    else if (t === 'giris') setTab('giris')
  }, [searchParams])

  // OAuth callback'ten hata ile dönüldüyse mesaj göster
  useEffect(() => {
    if (urlError === 'oauth_failed') {
      setError('Google ile giriş sırasında bir sorun oluştu. Lütfen tekrar deneyin.')
    }
  }, [urlError])

  const handleGoogleLogin = async () => {
    if (googleLoading) return
    setError('')
    setRegError('')
    setGoogleLoading(true)

    try {
      const origin =
        typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
          ? window.location.origin
          : typeof window !== 'undefined'
            ? window.location.origin
            : 'https://www.sescim.com'

      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      })

      if (oauthErr) {
        const msg = translateAuthError(oauthErr.message)
        if (tab === 'kayit') setRegError(msg)
        else setError(msg)
        setGoogleLoading(false)
      }
    } catch {
      const msg = 'Google ile bağlantı kurulamadı. Lütfen tekrar deneyin.'
      if (tab === 'kayit') setRegError(msg)
      else setError(msg)
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath)
    }
  }, [user, loading, router, nextPath])

  const translateAuthError = (msg: string): string => {
    if (!msg) return 'Bir hata oluştu. Lütfen tekrar deneyin.'
    const lower = msg.toLowerCase()
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Bu e-posta adresiyle kayıtlı bir hesap zaten var. Lütfen giriş yapın veya şifrenizi sıfırlayın.'
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'E-posta adresi veya şifre hatalı. Lütfen kontrol edip tekrar deneyin.'
    }
    if (lower.includes('password should be at least')) {
      return 'Şifreniz en az 6 karakter olmalıdır.'
    }
    if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
      return 'Lütfen geçerli bir e-posta adresi girin.'
    }
    if (
      lower.includes('rate limit') ||
      lower.includes('too many requests') ||
      lower.includes('over_email_send_rate_limit')
    ) {
      return 'Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.'
    }
    if (lower.includes('email not confirmed')) {
      return 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki onay linkine tıklayın.'
    }
    return msg
  }

  const handleGiris = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Lütfen tüm alanları doldurun.')
      return
    }
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
    if (err) {
      setError(translateAuthError(err.message))
      setSubmitting(false)
    } else {
      router.replace(nextPath)
      router.refresh()
    }
  }

  const handleKayit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    const cleanAd = regAd.trim()
    const cleanSoyad = regSoyad.trim()
    const cleanEmail = regEmail.trim().toLowerCase()
    const cleanTel = regTel.trim()

    if (!cleanAd || !cleanSoyad || !cleanEmail || !regPass) {
      setRegError('Lütfen tüm zorunlu alanları doldurun.')
      return
    }
    if (regPass.length < 6) {
      setRegError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    if (regPass !== regPassConfirm) {
      setRegError('Girdiğiniz şifreler birbiriyle eşleşmiyor.')
      return
    }
    if (!kvkkAccepted) {
      setRegError('Devam etmek için Gizlilik Politikası ve Üyelik Sözleşmesini onaylamanız gerekir.')
      return
    }

    setRegSubmitting(true)

    try {
      const res = await fetch('/api/auth/kayit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad: cleanAd,
          soyad: cleanSoyad,
          email: cleanEmail,
          telefon: cleanTel,
          password: regPass,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setRegError(translateAuthError(data.error || 'Kayıt sırasında bir hata oluştu.'))
        setRegSubmitting(false)
        return
      }

      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: regPass,
      })

      if (loginErr) {
        setTab('giris')
        setEmail(cleanEmail)
        setPassword(regPass)
        setError('Hesabınız oluşturuldu. Lütfen şifrenizle giriş yapın.')
        setRegSubmitting(false)
      } else {
        router.replace(nextPath)
        router.refresh()
      }
    } catch (err: any) {
      setRegError(err.message || 'Kayıt işlemi sırasında bir hata oluştu.')
      setRegSubmitting(false)
    }
  }

  if (loading || user) {
    return (
      <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-150px)] grid lg:grid-cols-2 bg-white">
      {/* Left Column (Desktop Only) */}
      <div className="hidden lg:flex relative flex-col items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070"
          alt="Sahneyi Sen Yönet"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 z-10" />
        <div className="relative z-20 flex flex-col items-center text-center px-12">
          <Link href="/">
            <Image
              src="/sescimtam.svg"
              alt="sescim.com"
              width={200}
              height={67}
              className="object-contain mb-10 h-16 w-auto drop-shadow-lg brightness-0 invert"
              priority
            />
          </Link>
          <h1 className="text-4xl xl:text-5xl font-display font-black text-white mb-6 tracking-tight drop-shadow-md">
            Sahneyi Sen Yönet.
          </h1>
          <p className="text-lg text-white/80 max-w-md font-body drop-shadow-md">
            Türkiye&apos;nin En Büyük Ses, Işık ve Görüntü Marketi
          </p>
        </div>
      </div>

      {/* Right Column (Form Area) */}
      <div className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <Link href="/">
              <Image src="/sescimtam.svg" alt="sescim.com" width={160} height={50} className="object-contain h-12 w-auto" />
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">Hoş Geldiniz</h2>
            <p className="text-slate-500 font-body text-sm">
              Devam etmek için giriş yapın veya yeni bir hesap oluşturun.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6 relative">
            <button
              type="button"
              onClick={() => {
                setTab('giris')
                setError('')
              }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative ${
                tab === 'giris' ? 'text-brand-red' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Giriş Yap
              {tab === 'giris' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('kayit')
                setRegError('')
              }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative ${
                tab === 'kayit' ? 'text-brand-red' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Üye Ol
              {tab === 'kayit' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />}
            </button>
          </div>

          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              type="button"
              disabled={googleLoading || submitting || regSubmitting}
              className="w-full bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-sm mb-6"
            >
              {googleLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin text-slate-500" />
                  <span>Google&apos;a yönlendiriliyor...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Google ile Devam Et</span>
                </>
              )}
            </button>
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-medium tracking-wider">
                veya e-posta ile
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>
          </div>

          <div className="relative">
            {/* Login Form */}
            {tab === 'giris' && (
              <form onSubmit={handleGiris} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    E-posta
                  </label>
                  <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                    />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="ornek@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Şifre
                  </label>
                  <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                    />
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                    />
                    <button
                      type="button"
                      aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-body p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Link
                    href="/uye/sifre-sifirla"
                    className="text-sm font-medium text-brand-red hover:text-red-700 transition-colors"
                  >
                    Şifremi unuttum
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={submitting || googleLoading}
                  className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20 hover:shadow-md hover:shadow-brand-red/30"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : 'GİRİŞ YAP'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {tab === 'kayit' && (
              <form onSubmit={handleKayit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Ad
                    </label>
                    <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                      <UserIcon
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                      />
                      <input
                        type="text"
                        autoComplete="given-name"
                        value={regAd}
                        onChange={(e) => setRegAd(e.target.value)}
                        required
                        placeholder="Adınız"
                        className="w-full pl-11 pr-4 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Soyad
                    </label>
                    <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                      <input
                        type="text"
                        autoComplete="family-name"
                        value={regSoyad}
                        onChange={(e) => setRegSoyad(e.target.value)}
                        required
                        placeholder="Soyadınız"
                        className="w-full px-4 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    E-posta
                  </label>
                  <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                    />
                    <input
                      type="email"
                      autoComplete="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                      placeholder="ornek@email.com"
                      className="w-full pl-11 pr-4 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Telefon (İsteğe Bağlı)
                  </label>
                  <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                    <Phone
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                    />
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={regTel}
                      onChange={(e) => setRegTel(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full pl-11 pr-4 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Şifre
                  </label>
                  <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                    />
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      required
                      minLength={6}
                      placeholder="En az 6 karakter"
                      className="w-full pl-11 pr-12 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                    />
                    <button
                      type="button"
                      aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {regPass && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 flex gap-1 h-1.5">
                        {[1, 2, 3].map((lvl) => (
                          <div
                            key={lvl}
                            className={`flex-1 rounded-full transition-colors ${
                              passwordStrength.score >= lvl ? passwordStrength.barColor : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-[11px] font-semibold ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Şifre (Tekrar)
                  </label>
                  <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors"
                    />
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={regPassConfirm}
                      onChange={(e) => setRegPassConfirm(e.target.value)}
                      required
                      minLength={6}
                      placeholder="Şifrenizi tekrar girin"
                      className="w-full pl-11 pr-10 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body"
                    />
                    {regPassConfirm && regPass === regPassConfirm && (
                      <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                    )}
                  </div>
                </div>

                {regError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-body p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={(e) => setKvkkAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red accent-brand-red shrink-0"
                  />
                  <span className="text-xs text-slate-500 font-body leading-relaxed">
                    <Link
                      href="/gizlilik-politikasi"
                      target="_blank"
                      className="font-medium text-slate-700 hover:text-brand-red underline underline-offset-2"
                    >
                      Gizlilik Politikası ve KVKK Aydınlatma Metni
                    </Link>
                    &apos;ni ve{' '}
                    <Link
                      href="/mesafeli-satis-sozlesmesi"
                      target="_blank"
                      className="font-medium text-slate-700 hover:text-brand-red underline underline-offset-2"
                    >
                      Üyelik Sözleşmesi
                    </Link>
                    &apos;ni okudum, kabul ediyorum.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={regSubmitting || googleLoading}
                  className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20 hover:shadow-md hover:shadow-brand-red/30"
                >
                  {regSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'ÜCRETSİZ ÜYE OL'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UyePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
        </div>
      }
    >
      <UyePageContent />
    </Suspense>
  )
}
