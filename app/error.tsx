'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="relative inline-block mb-10">
          <div className="absolute inset-0 bg-brand-red blur-[100px] opacity-10" />
          <AlertCircle size={80} className="text-brand-red relative z-10" />
        </div>
        
        <h1 className="font-display font-black text-4xl md:text-5xl text-white uppercase tracking-tighter mb-4">Bir Hata Oluştu</h1>
        <p className="font-body text-white/30 mb-12 leading-relaxed">
          Beklenmedik bir sorunla karşılaştık. Lütfen sayfayı yenilemeyi deneyin veya ana sayfaya dönün.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="btn-primary w-full sm:w-auto justify-center px-10"
          >
            <RotateCcw size={16} /> TEKRAR DENE
          </button>
          <Link href="/" className="btn-outline w-full sm:w-auto justify-center px-10">
            <Home size={16} /> ANA SAYFAYA DÖN
          </Link>
        </div>
        
        {error.digest && (
          <div className="mt-12 pt-6 border-t border-white/5">
            <code className="text-[10px] text-white/10 tracking-widest uppercase">
              Hata Kimliği: {error.digest}
            </code>
          </div>
        )}
      </div>
    </div>
  )
}
