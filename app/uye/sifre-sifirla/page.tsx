'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, KeyRound, AlertCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react'

export default function SifreSifirlaPage() {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  
  // Step 1 states
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  // Step 2 states
  const [otpCode, setOtpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const supabase = useRef(createClient()).current

  // Adım 1: Sescim markalı e-posta ile 6 haneli doğrulama kodu gönder
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError('Lütfen e-posta adresinizi girin.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/sifre-sifirla/kod-gonder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Kod gönderilemedi. Lütfen tekrar deneyin.')
        return
      }

      setStep('otp')
      setResendTimer(60)
      const timerInterval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Kodu Yeniden Gönder
  const handleResendCode = async () => {
    if (resendTimer > 0 || loading) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/sifre-sifirla/kod-gonder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Kod gönderilemedi.')
      } else {
        setResendTimer(60)
        const timerInterval = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) {
              clearInterval(timerInterval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      }
    } catch (e: any) {
      setError(e.message || 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  // Adım 2: 6 Haneli Kodu Doğrula ve Yeni Şifreyi Kaydet
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanToken = otpCode.trim()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanToken || cleanToken.length < 6) {
      setError('Lütfen e-postanıza gelen 6 haneli doğrulama kodunu eksiksiz girin.')
      return
    }

    if (newPassword.length < 6) {
      setError('Yeni şifreniz en az 6 karakter olmalıdır.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/sifre-sifirla/kod-dogrula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanToken,
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Şifre güncellenemedi.')
        setResetLoading(false)
        return
      }

      // Şifre güncellendi! Oturumu anında başlat ve doğrudan yönlendir
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: newPassword,
      })

      if (loginErr) {
        router.push('/uye')
      } else {
        router.push('/hesabim')
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.')
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <Image
              src="/sescimtam.svg"
              alt="sescim.com"
              width={160}
              height={54}
              className="h-10 w-auto mx-auto object-contain"
              priority
            />
          </Link>
          <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            {step === 'email' ? 'Şifremi Unuttum' : 'Doğrulama Kodunu Girin'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-body">
            {step === 'email'
              ? 'E-posta adresinize 6 haneli doğrulama kodu göndereceğiz.'
              : `${email} adresinize gönderilen kodu ve yeni şifrenizi girin.`}
          </p>
        </div>

        {step === 'email' ? (
          /* Adım 1: E-posta Giriş Formu */
          <form onSubmit={handleSendCode} className="space-y-4 animate-in fade-in duration-300">
            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-body">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                E-posta Adresiniz
              </label>
              <div className="relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all bg-white">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ornek@email.com"
                  className="w-full pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-300 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-3.5 rounded-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Kod Gönderiliyor...</span>
                </>
              ) : (
                'DOĞRULAMA KODU GÖNDER'
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/uye"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-red transition-colors"
              >
                <ArrowLeft size={14} /> Giriş sayfasına dön
              </Link>
            </div>
          </form>
        ) : (
          /* Adım 2: OTP Kod & Yeni Şifre Formu */
          <form onSubmit={handleVerifyAndReset} className="space-y-4 animate-in fade-in duration-300">
            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-body">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  6 Haneli Doğrulama Kodu
                </label>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || loading}
                  className="text-xs text-brand-red hover:underline font-medium disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  {resendTimer > 0 ? `${resendTimer}s sonra tekrar iste` : 'Kodu Tekrar Gönder'}
                </button>
              </div>
              <div className="relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all bg-white">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="123456"
                  className="w-full pl-11 pr-4 py-3 text-sm font-mono tracking-widest text-slate-800 placeholder-slate-300 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Yeni Şifre
              </label>
              <div className="relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all bg-white">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="En az 6 karakter"
                  className="w-full pl-11 pr-12 py-3 text-sm text-slate-800 placeholder-slate-300 bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Yeni Şifre (Tekrar)
              </label>
              <div className="relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all bg-white">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Şifreyi tekrar girin"
                  className="w-full pl-11 pr-12 py-3 text-sm text-slate-800 placeholder-slate-300 bg-transparent focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-3.5 rounded-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20 mt-2"
            >
              {resetLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Şifre Güncelleniyor...</span>
                </>
              ) : (
                'ŞİFREYİ KAYDET VE GİRİŞ YAP'
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError('')
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-red transition-colors"
              >
                <ArrowLeft size={14} /> Farklı bir e-posta adresi dene
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
