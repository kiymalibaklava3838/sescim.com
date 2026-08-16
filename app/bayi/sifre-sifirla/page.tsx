'use client'

import { useState, useRef, useEffect } from 'react'
import { Mail, ArrowLeft, CheckCircle, KeyRound, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Step = 'email' | 'otp'

export default function SifreSifirla() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const supabase = useRef(createClient()).current

  // Geri sayım sayacı (tekrar gönder için)
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // ── Adım 1: E-posta gönder ──────────────────────────────────────────────────
  const handleEmailSubmit = async () => {
    if (!email) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/sifre-sifirla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Bir hata oluştu.')
      setLoading(false)
      return
    }

    setStep('otp')
    setResendCooldown(60)
    setLoading(false)
    // İlk OTP kutusuna odaklan
    setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }

  // ── OTP Input yönetimi ──────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    // Yapıştırma desteği: 8 haneli kodu tek seferde yapıştır
    if (value.length === 8 && /^\d{8}$/.test(value)) {
      const newOtp = value.split('')
      setOtp(newOtp)
      otpRefs.current[7]?.focus()
      return
    }

    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')

    if (value && index < 7) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // ── Adım 2: OTP doğrula ────────────────────────────────────────────────────
  const handleOtpSubmit = async () => {
    const code = otp.join('')
    if (code.length !== 8) { setError('Lütfen 8 haneli kodu eksiksiz girin.'); return }
    setOtpLoading(true)
    setError('')

    const res = await fetch('/api/otp-dogrula', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), token: code }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Kod doğrulanamadı.')
      setOtpLoading(false)
      return
    }

    // Oturumu client'a yükle, ardından şifre sayfasına yönlendir
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })

    window.location.href = '/bayi/sifrele'
  }

  // ── Tekrar gönder ──────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setOtp(['', '', '', '', '', '', '', ''])

    const res = await fetch('/api/sifre-sifirla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    })

    if (res.ok) {
      setResendCooldown(60)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
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
          <h1 className="font-display font-black text-3xl uppercase text-white">Şifremi Unuttum</h1>
          <p className="font-body text-white/30 text-sm mt-2">
            {step === 'email'
              ? 'E-posta adresinizi girin, doğrulama kodunu gönderelim.'
              : `${email} adresine 6 haneli doğrulama kodu gönderildi.`}
          </p>
        </div>

        <div
          className="bg-[#141414] border border-white/8 p-8 space-y-5"
          style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
        >
          {/* ── Adım 1: E-posta ── */}
          {step === 'email' && (
            <>
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-2">
                  E-posta Adresi
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-dark pl-10"
                    placeholder="firma@email.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-sm font-body">
                  {error}
                </div>
              )}

              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email}
                className="btn-primary w-full justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Mail size={14} />}
                {loading ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
              </button>
            </>
          )}

          {/* ── Adım 2: OTP ── */}
          {step === 'otp' && (
            <>
              {/* OTP açıklama */}
              <div className="flex items-center gap-3 bg-white/4 border border-white/8 p-4">
                <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                <p className="font-body text-white/50 text-xs leading-relaxed">
                  Kod gönderildi. <span className="text-white/80">Spam klasörünü de kontrol etmeyi</span> unutmayın.
                </p>
              </div>

              {/* OTP Kutucukları */}
              <div>
                <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-3">
                  Doğrulama Kodu
                </label>
                <div className="flex gap-1 justify-between">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => e.target.select()}
                      className={`
                        w-full aspect-square text-center text-lg font-display font-black
                        bg-[#0A0A0A] border text-white outline-none transition-all duration-150
                        ${digit ? 'border-brand-red' : 'border-white/10'}
                        focus:border-brand-red focus:ring-1 focus:ring-brand-red/30
                      `}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-sm font-body">
                  {error}
                </div>
              )}

              <button
                onClick={handleOtpSubmit}
                disabled={otpLoading || otp.join('').length !== 8}
                className="btn-primary w-full justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {otpLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <KeyRound size={14} />}
                {otpLoading ? 'Doğrulanıyor...' : 'Kodu Onayla'}
              </button>

              {/* Tekrar gönder + E-posta değiştir */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="font-body text-white/30 hover:text-brand-red text-xs transition-colors flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={11} />
                  {resendCooldown > 0 ? `Tekrar gönder (${resendCooldown}s)` : 'Tekrar gönder'}
                </button>
                <button
                  onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '', '', '']); setError('') }}
                  className="font-body text-white/30 hover:text-brand-red text-xs transition-colors"
                >
                  E-posta değiştir
                </button>
              </div>
            </>
          )}

          {/* Giriş sayfasına dön */}
          <div className="text-center pt-2">
            <Link href="/bayi" className="font-body text-white/30 hover:text-brand-red text-xs transition-colors flex items-center justify-center gap-1">
              <ArrowLeft size={11} />
              Giriş sayfasına dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
