'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function SifreGuncellePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }

    if (password !== confirmPassword) {
      setError('Girdiğiniz şifreler birbiriyle eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => {
        router.push('/hesabim')
      }, 2500)
    } catch (err: any) {
      setError(err.message || 'Şifre güncellenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-150px)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
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
            Yeni Şifrenizi Belirleyin
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-body">
            Lütfen hesabınız için yeni ve güvenli bir şifre girin.
          </p>
        </div>

        {success ? (
          <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Şifreniz Güncellendi!</h3>
            <p className="text-sm text-slate-500 mb-6">
              Hesabım sayfasına yönlendiriliyorsunuz...
            </p>
            <Link
              href="/hesabim"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-red text-white text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Hesabıma Git
            </Link>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-body">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Yeni Şifre
              </label>
              <div className="relative border border-slate-200 rounded-lg focus-within:ring-2 focus-within:ring-brand-red/20 focus-within:border-brand-red transition-all bg-white">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              disabled={loading}
              className="w-full bg-brand-red hover:bg-red-700 text-white font-semibold py-3.5 rounded-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm shadow-brand-red/20"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'ŞİFREYİ KAYDET'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
