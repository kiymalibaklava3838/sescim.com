'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BayiLoginForm from '@/components/BayiLoginForm'
import type { User } from '@supabase/supabase-js'

export default function BayiPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    supabase.auth.getSession().then((response: any) => {
      const session = response.data.session
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bayi giriş yapmışsa ürünler sayfasına yönlendir — Trendyol tarzı
  useEffect(() => {
    if (!loading && user) {
      router.push('/bayi/panel')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    // Yönlendirme yapılıyor, spinner göster
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-red/10 border border-brand-red/20 mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#DA291C" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="flex items-center gap-3 justify-center mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Akdağ Elektronik</span>
            <div className="w-8 h-px bg-brand-red" />
          </div>
          <h1 className="font-display font-black text-3xl uppercase text-white tracking-tight">Bayi Girişi</h1>
          <p className="font-body text-white/30 text-sm mt-2">Özel fiyatlar ve bayi avantajları için giriş yapın.</p>
        </div>

        <div className="bg-[#141414] border border-white/8 p-8"
          style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}>
          <BayiLoginForm onSuccess={() => {
            // Giriş başarılı — panel sayfasına yönlendir
            router.push('/bayi/panel')
          }} />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: '💰', label: 'Özel Fiyatlar' },
            { icon: '📦', label: 'Stok Bilgisi' },
            { icon: '🎯', label: 'Öncelikli Destek' },
          ].map((item) => (
            <div key={item.label} className="bg-[#141414] border border-white/5 p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="font-display font-semibold text-xs uppercase tracking-wide text-white/40">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}