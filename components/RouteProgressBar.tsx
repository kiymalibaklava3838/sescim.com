'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function ProgressBarInternal() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setVisible(true)
    setProgress(18)

    let current = 18
    timerRef.current = setInterval(() => {
      // Asymptotically approach 85%
      current += (85 - current) * 0.18
      setProgress(Math.min(current, 85))
    }, 100)
  }

  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)
    setTimeout(() => {
      setVisible(false)
      setTimeout(() => setProgress(0), 200)
    }, 150)
  }

  // Rota değiştiğinde (pathname veya search params) progress barı 100% yapıp kapat
  useEffect(() => {
    if (visible) {
      completeProgress()
    }
  }, [pathname, searchParams])

  // Site içi tüm link tıklamalarını yakala
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

      let target = e.target as HTMLElement | null
      while (target && target.tagName !== 'A') {
        target = target.parentElement
      }

      if (!target) return
      const anchor = target as HTMLAnchorElement
      const href = anchor.getAttribute('href')

      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return
      }

      try {
        const url = new URL(anchor.href, window.location.origin)
        if (url.origin === window.location.origin) {
          const currentUrl = new URL(window.location.href)
          if (url.pathname !== currentUrl.pathname || url.search !== currentUrl.search) {
            startProgress()
          }
        }
      } catch {}
    }

    document.addEventListener('click', handleLinkClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleLinkClick, { capture: true })
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
      aria-hidden="true"
    >
      <div
        className="h-[2.5px] bg-brand-red transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(218, 41, 28, 0.8), 0 0 4px #DA291C',
        }}
      />
    </div>
  )
}

export default function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInternal />
    </Suspense>
  )
}
