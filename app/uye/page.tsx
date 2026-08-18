'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import type { User } from '@supabase/supabase-js'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2, User as UserIcon, Phone } from 'lucide-react'

export default function UyePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'giris' | 'kayit'>('giris')
  
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
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState(false)
  const [regSubmitting, setRegSubmitting] = useState(false)

  const supabase = useRef(createClient()).current

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/uye/panel`,
      },
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  useEffect(() => {
    if (!loading && user) router.push('/uye/panel')
  }, [user, loading, router])

  const handleGiris = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('E-posta veya şifre hatalı. Lütfen tekrar deneyin.')
    } else {
      router.push('/uye/panel')
    }
    setSubmitting(false)
  }

  const handleKayit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (!regAd || !regSoyad || !regEmail || !regPass) { setRegError('Lütfen tüm alanları doldurun.'); return }
    if (regPass.length < 6) { setRegError('Şifre en az 6 karakter olmalıdır.'); return }
    setRegSubmitting(true)
    const { error: err } = await supabase.auth.signUp({
      email: regEmail,
      password: regPass,
      options: { data: { full_name: `${regAd} ${regSoyad}`, phone: regTel } }
    })
    if (err) {
      setRegError(err.message || 'Kayıt sırasında bir hata oluştu.')
    } else {
      setRegSuccess(true)
    }
    setRegSubmitting(false)
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
            Türkiye'nin En Büyük Ses, Işık ve Görüntü Marketi
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
            <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">
              Hoş Geldiniz
            </h2>
            <p className="text-slate-500 font-body text-sm">
              Devam etmek için giriş yapın veya yeni bir hesap oluşturun.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6 relative">
            <button
              onClick={() => { setTab('giris'); setError('') }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative ${
                tab === 'giris' 
                  ? 'text-brand-red' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Giriş Yap
              {tab === 'giris' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />
              )}
            </button>
            <button
              onClick={() => { setTab('kayit'); setRegError(''); setRegSuccess(false) }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-300 relative ${
                tab === 'kayit' 
                  ? 'text-brand-red' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Üye Ol
              {tab === 'kayit' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-red" />
              )}
            </button>
          </div>

          <div className="mb-6">
            <button 
              onClick={handleGoogleLogin}
              type="button"
              className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-sm mb-6"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google ile Devam Et
            </button>
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-medium tracking-wider">veya e-posta ile</span>
              <div className="flex-grow border-t border-slate-200"></div>
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
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
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
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                    <input 
                      type={showPass ? 'text' : 'password'} 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      required 
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body" 
                    />
                    <button 
                      type="button" 
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
                  <Link href="/uye/sifre-sifirla" className="text-sm font-medium text-brand-red hover:text-red-700 transition-colors">
                    Şifremi unuttum
                  </Link>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20 hover:shadow-md hover:shadow-brand-red/30"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : 'GİRİŞ YAP'}
                </button>
              </form>
            )}

            {/* Register Form */}
            {tab === 'kayit' && (
              regSuccess ? (
                <div className="text-center py-10 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Mail size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-2xl font-display font-bold text-slate-800 mb-3">Kayıt Başarılı!</h3>
                  <p className="text-slate-500 font-body leading-relaxed max-w-sm mx-auto">
                    Hesabınız oluşturuldu. E-posta adresinize gönderilen doğrulama bağlantısına tıklayarak giriş yapabilirsiniz.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleKayit} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Ad
                      </label>
                      <div className="group relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all duration-300 bg-white">
                        <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                        <input 
                          type="text" 
                          value={regAd} 
                          onChange={e => setRegAd(e.target.value)} 
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
                          value={regSoyad} 
                          onChange={e => setRegSoyad(e.target.value)} 
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
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                      <input 
                        type="email" 
                        value={regEmail} 
                        onChange={e => setRegEmail(e.target.value)} 
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
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                      <input 
                        type="tel" 
                        value={regTel} 
                        onChange={e => setRegTel(e.target.value)} 
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
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-red transition-colors" />
                      <input 
                        type={showPass ? 'text' : 'password'} 
                        value={regPass} 
                        onChange={e => setRegPass(e.target.value)} 
                        required 
                        placeholder="En az 6 karakter"
                        className="w-full pl-11 pr-12 py-3 bg-transparent text-slate-800 placeholder-slate-300 focus:outline-none text-sm font-body" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPass(!showPass)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {regError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm font-body p-3 bg-red-50 rounded-lg border border-red-100">
                      <AlertCircle size={16} className="shrink-0" /> 
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="text-xs text-slate-500 font-body leading-relaxed">
                    Kayıt olarak <Link href="/gizlilik-politikasi" className="font-medium text-slate-700 hover:text-brand-red underline underline-offset-2">Gizlilik Politikası</Link>'nı ve{' '}
                    <Link href="/mesafeli-satis-sozlesmesi" className="font-medium text-slate-700 hover:text-brand-red underline underline-offset-2">Kullanıcı Sözleşmesi</Link>'ni kabul etmiş olursunuz.
                  </div>

                  <button 
                    type="submit" 
                    disabled={regSubmitting}
                    className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-4 rounded-lg transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20 hover:shadow-md hover:shadow-brand-red/30"
                  >
                    {regSubmitting ? <Loader2 size={20} className="animate-spin" /> : 'ÜCRETSİZ ÜYE OL'}
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
