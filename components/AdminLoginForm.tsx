'use client'

import { useState } from 'react'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Props {
  onSuccess: () => void
}

export default function AdminLoginForm({ onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('E-posta veya şifre hatalı.')
      } else if (err.message.includes('Email not confirmed')) {
        setError('E-posta doğrulanmamış.')
      } else {
        setError(`Hata: ${err.message}`)
      }
      setLoading(false)
      return
    }

    onSuccess()
  }

  const handleReset = () => {
    window.location.href = '/bayi/sifre-sifirla'
  }

  // resetMode artık kullanılmıyor — kullanıcı doğrudan /bayi/sifre-sifirla'ya yönlendiriliyor

  return (
    <div className="space-y-5">
      <div>
        <label className="font-display font-semibold text-xs tracking-widest uppercase text-slate-500 block mb-2">
          E-posta
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-light"
          placeholder="admin@akdagelektronik.com"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoComplete="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-display font-semibold text-xs tracking-widest uppercase text-slate-500">
            Şifre
          </label>
          <button
            onClick={handleReset}
            className="font-body text-slate-400 hover:text-brand-red text-xs transition-colors"
          >
            Şifremi unuttum
          </button>
        </div>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-light pr-12"
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            autoComplete="current-password"
          />
          <button type="button" onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-brand-red/10 border border-brand-red/30 p-3 text-brand-red text-sm font-body">
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading || !email || !password}
        className="btn-primary w-full justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading
          ? <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          : <LogIn size={15} />
        }
        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
      </button>
    </div>
  )
}
