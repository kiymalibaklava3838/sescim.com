'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, X, ShieldCheck, Loader2 } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  fiyat: number
  urunAdi: string
}

const PAYTR_MERCHANT_ID = '749905'
const PAYTR_TAKSiT_TOKEN = '1456695dd59bc53bba11986ba0d12545556b9a934a631bf59ffc9044d157d1c4'

export default function InstallmentModal({ isOpen, onClose, fiyat, urunAdi }: Props) {
  const [mounted, setMounted] = useState(false)
  const [paytrLoading, setPaytrLoading] = useState(true)
  const [paytrError, setPaytrError] = useState(false)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Arka plan sayfa kaydırmasını (Body & HTML Scroll Lock) kesin olarak engelleme
  useEffect(() => {
    if (!isOpen) return

    const origBodyOverflow = document.body.style.overflow
    const origHtmlOverflow = document.documentElement.style.overflow
    const origBodyOverscroll = document.body.style.overscrollBehavior
    const origHtmlOverscroll = document.documentElement.style.overscrollBehavior

    // Hem body hem de html için kaydırmayı ve overscroll yayılımını durdur
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // Dokunmatik ve fare tekerleğiyle arka planın kaymasını engelleyen passive: false dinleyici
    const preventBackgroundScroll = (e: TouchEvent | WheelEvent) => {
      const target = e.target as HTMLElement
      // Modal içi kaydırmaya izin ver, dışarıdaki backdrop'a gelenleri durdur
      const modalBox = document.getElementById('taksit-modal-card')
      if (modalBox && !modalBox.contains(target)) {
        if (e.cancelable) e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', preventBackgroundScroll, { passive: false })
    window.addEventListener('touchmove', preventBackgroundScroll, { passive: false })

    return () => {
      document.body.style.overflow = origBodyOverflow
      document.documentElement.style.overflow = origHtmlOverflow
      document.body.style.overscrollBehavior = origBodyOverscroll
      document.documentElement.style.overscrollBehavior = origHtmlOverscroll

      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', preventBackgroundScroll)
      window.removeEventListener('touchmove', preventBackgroundScroll)
    }
  }, [isOpen, onClose])

  // PayTR Resmi Taksit Tablosu Script Yükleme
  useEffect(() => {
    if (!isOpen || !mounted || !fiyat || fiyat <= 0) return

    setPaytrLoading(true)
    setPaytrError(false)

    // Temizlik
    if (scriptRef.current && scriptRef.current.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current)
      scriptRef.current = null
    }

    const container = document.getElementById('paytr_taksit_tablosu')
    if (container) {
      container.innerHTML = ''
    }

    const timer = setTimeout(() => {
      try {
        const roundedAmount = Math.max(1, Math.round(fiyat))
        const script = document.createElement('script')
        script.src = `https://www.paytr.com/odeme/taksit-tablosu/v2?token=${PAYTR_TAKSiT_TOKEN}&merchant_id=${PAYTR_MERCHANT_ID}&amount=${roundedAmount}&taksit=0&tumu=0`
        script.async = true
        scriptRef.current = script

        script.onload = () => {
          setPaytrLoading(false)
        }

        script.onerror = () => {
          setPaytrLoading(false)
          setPaytrError(true)
        }

        document.body.appendChild(script)

        // Güvenlik zaman aşımı kontrolü
        const checkTimer = setTimeout(() => {
          const el = document.getElementById('paytr_taksit_tablosu')
          if (!el || el.children.length === 0) {
            setPaytrLoading(false)
            setPaytrError(true)
          } else {
            setPaytrLoading(false)
          }
        }, 3500)

        return () => clearTimeout(checkTimer)
      } catch {
        setPaytrLoading(false)
        setPaytrError(true)
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current)
        scriptRef.current = null
      }
    }
  }, [isOpen, mounted, fiyat])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="taksit-modal-title"
    >
      <div
        id="taksit-modal-card"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90dvh] my-auto overflow-hidden border border-slate-200 flex flex-col relative z-10 animate-in zoom-in-95 duration-200 overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* PayTR Resmi CSS & Modern Entegrasyon Stilleri */}
        <style dangerouslySetInnerHTML={{ __html: `
          #paytr_taksit_tablosu {
            clear: both;
            font-size: 12px;
            max-width: 100%;
            text-align: center;
            font-family: inherit;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 12px;
            padding: 4px;
          }
          #paytr_taksit_tablosu::before, #paytr_taksit_tablosu::after {
            display: none !important;
          }
          .taksit-tablosu-wrapper {
            margin: 0 !important;
            width: 100% !important;
            max-width: 250px;
            padding: 14px 12px !important;
            cursor: default;
            text-align: center;
            display: flex !important;
            flex-direction: column;
            border: 1px solid #e2e8f0 !important;
            border-radius: 14px !important;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
            transition: all 0.2s ease;
          }
          .taksit-tablosu-wrapper:hover {
            border-color: #cbd5e1 !important;
            box-shadow: 0 6px 12px -2px rgba(0,0,0,0.08);
            transform: translateY(-1px);
          }
          .taksit-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 38px;
            margin-bottom: 6px;
          }
          .taksit-logo img {
            max-height: 26px !important;
            max-width: 120px;
            padding-bottom: 0 !important;
            margin: 0 auto;
            object-fit: contain;
          }
          .taksit-baslik {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            padding: 0 4px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
          }
          .taksit-tutari-text {
            float: none !important;
            width: auto !important;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
            color: #64748b !important;
          }
          .taksit-tutar-wrapper {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center;
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 5px;
            padding: 6px 8px !important;
            transition: background-color 0.15s ease;
          }
          .taksit-tutar-wrapper:hover {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1;
          }
          .taksit-tutari {
            float: none !important;
            width: auto !important;
            padding: 0 !important;
            color: #1e293b !important;
            border: none !important;
            font-size: 11.5px;
            font-family: monospace, monospace;
            font-weight: 600;
          }
          .taksit-tutari-bold {
            font-weight: 700;
            color: #0f172a !important;
          }
          @media all and (max-width: 600px) {
            .taksit-tablosu-wrapper {
              max-width: 100% !important;
            }
          }
        ` }} />

        {/* Modal Header: Temiz, aydınlık ve site yapısına uygun tasarım */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0">
              <CreditCard size={20} />
            </div>
            <div className="min-w-0">
              <h3 id="taksit-modal-title" className="font-display font-black text-base sm:text-lg text-slate-900 uppercase tracking-tight">
                Taksit Seçenekleri
              </h3>
              <p className="text-xs text-slate-500 font-body truncate max-w-xs sm:max-w-md" title={urunAdi}>
                {urunAdi}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            {/* Peşin Fiyat Göstergesi */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-display font-bold tracking-wider text-slate-400 block leading-tight">
                Peşin Fiyat
              </span>
              <span className="font-display font-black text-lg sm:text-xl text-brand-red tracking-tight">
                {Math.round(fiyat).toLocaleString('tr-TR')} ₺
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Gövdesi: PayTR Tablosu */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain">
          {/* PayTR Yükleniyor Göstergesi */}
          {paytrLoading && (
            <div className="py-14 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <Loader2 size={26} className="text-brand-red animate-spin" />
              <span className="text-xs font-semibold">PayTR üzerinden güncel banka taksit oranları alınıyor...</span>
            </div>
          )}

          {/* PayTR Resmi DOM Konteyneri (Zorunlu ID) */}
          <div id="paytr_taksit_tablosu" className="min-h-[140px]" />

          {/* Yükleme Hatası Bildirimi */}
          {paytrError && !paytrLoading && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-600">
              <p className="font-semibold">Canlı PayTR taksit tablosu yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edip tekrar deneyiniz.</p>
            </div>
          )}

          {/* Güvenlik Alt Bilgilendirme */}
          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-500 leading-relaxed">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Tüm taksitli ödemeler <strong>PayTR</strong> altyapısı ve <strong>256-Bit SSL / 3D Secure</strong> koruması altındadır.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Mağaza ID: {PAYTR_MERCHANT_ID}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 btn-outline text-xs font-display font-bold uppercase tracking-wider rounded-lg cursor-pointer ml-auto"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
