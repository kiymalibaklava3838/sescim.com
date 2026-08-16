'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Flash-prevention script zaten data-theme'i set etti, sadece state'i senkronize et
    const current = document.documentElement.getAttribute('data-theme') || 'dark'
    setTheme(current as 'dark' | 'light')
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('akdag-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  // SSR'da render etme — hydration mismatch önle
  if (!mounted) {
    return (
      <div className="w-8 h-8 flex items-center justify-center opacity-0">
        <Sun size={16} />
      </div>
    )
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
      className="relative w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition-all duration-200 group"
    >
      {/* Arka plan halka — hover'da görünür */}
      <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/5 transition-colors duration-200" />
      
      {theme === 'dark' ? (
        // Koyu temadayken güneş göster (açık temaya geçmek için)
        <Sun size={16} className="relative z-10 transition-transform duration-300 group-hover:rotate-12" />
      ) : (
        // Açık temadayken ay göster (koyu temaya geçmek için)
        <Moon size={16} className="relative z-10 transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  )
}
