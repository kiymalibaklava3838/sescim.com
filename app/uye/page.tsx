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
              src="/logo.png" 
              alt="sescim.com" 
              width={200} 
              height={67} 
              className="object-contain mb-10 h-16 w-auto drop-shadow-lg brightness-0 invert" 
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
              <Image src="/logo.png" alt="sescim.com" width={160} height={50} className="object-contain h-12 w-auto invert" />
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
