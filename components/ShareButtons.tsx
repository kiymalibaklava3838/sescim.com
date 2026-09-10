'use client'

import { useState } from 'react'
import { Share2, Copy, Check, MessageCircle } from 'lucide-react'

export default function ShareButtons({ productName }: { productName: string }) {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const whatsappText = encodeURIComponent(`${productName} - Sescim\n${url}`)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('input')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-200">
      <span className="font-display font-bold text-xs tracking-wider uppercase text-slate-500 flex items-center gap-1.5 mr-1">
        <Share2 size={13} className="text-slate-400" />
        Paylaş:
      </span>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-700 rounded-lg text-xs font-medium font-body transition-colors shadow-xs"
      >
        <MessageCircle size={14} className="text-emerald-600" />
        <span>WhatsApp</span>
      </a>

      {/* Link kopyala */}
      <button
        type="button"
        onClick={copyLink}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium font-body transition-all shadow-xs cursor-pointer ${
          copied
            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-semibold'
            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900'
        }`}
      >
        {copied ? (
          <>
            <Check size={14} className="text-emerald-600" />
            <span>Kopyalandı!</span>
          </>
        ) : (
          <>
            <Copy size={13} className="text-slate-400" />
            <span>Linki Kopyala</span>
          </>
        )}
      </button>
    </div>
  )
}
