'use client'

import { useState } from 'react'
import { Share2, Copy, Check, MessageCircle } from 'lucide-react'

export default function ShareButtons({ productName }: { productName: string }) {
  const [copied, setCopied] = useState(false)

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const whatsappText = encodeURIComponent(`${productName} - Akdağ Elektronik\n${url}`)

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
    <div className="flex items-center gap-2 pt-4 border-t border-white/5">
      <span className="font-display font-semibold text-xs tracking-widest uppercase text-white/20 flex items-center gap-1.5">
        <Share2 size={12} />
        Paylaş
      </span>

      {/* WhatsApp */}
      <a
        href={`https://wa.me/?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-xs font-body"
      >
        <MessageCircle size={13} />
        WhatsApp
      </a>

      {/* Link kopyala */}
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 hover:border-brand-red/30 hover:text-white transition-all text-xs font-body"
      >
        {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
        {copied ? 'Kopyalandı!' : 'Linki Kopyala'}
      </button>
    </div>
  )
}
