'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <AlertTriangle size={40} className="text-brand-red mx-auto mb-4" />
        <h2 className="font-display font-black text-2xl uppercase text-white mb-3">Panel Yüklenemedi</h2>
        <p className="font-body text-white/40 text-sm mb-6">
          {error.message || 'Beklenmeyen bir hata oluştu.'}
        </p>
        <button onClick={reset} className="btn-primary text-sm">
          <RefreshCw size={14} />
          Tekrar Dene
        </button>
      </div>
    </div>
  )
}
