'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  baseParams: string
  basePath?: string
}

export default function Pagination({ currentPage, totalPages, baseParams, basePath = '/urunler' }: Props) {
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(baseParams)
    if (page <= 1) {
      params.delete('sayfa')
    } else {
      params.set('sayfa', String(page))
    }
    const normalizedBase = basePath && basePath.trim() && basePath !== '/'
      ? '/' + basePath.replace(/^\/+|\/+$/g, '')
      : '/urunler'
    const queryString = params.toString()
    return queryString ? `${normalizedBase}?${queryString}` : normalizedBase
  }

  // Sayfa numaralarını hesapla (max 5 göster)
  const pages: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  const handlePageClick = () => {
    if (typeof window !== 'undefined') {
      const el = document.getElementById('urun-listesi')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {/* Önceki */}
      {currentPage > 1 ? (
        <Link 
          href={getPageUrl(currentPage - 1)}
          prefetch={true}
          scroll={false}
          onClick={handlePageClick}
          aria-label="Önceki Sayfa"
          className="w-10 h-10 border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-brand-red hover:text-brand-red transition-all duration-200"
        >
          <ChevronLeft size={16} />
        </Link>
      ) : (
        <div className="w-10 h-10 border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300 cursor-not-allowed">
          <ChevronLeft size={16} />
        </div>
      )}

      {/* Sayfa numaraları */}
      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`dots-${i}`} className="w-10 h-10 flex items-center justify-center text-slate-400 font-body text-sm select-none">
            ···
          </span>
        ) : (
          <Link
            key={page}
            href={getPageUrl(page)}
            prefetch={true}
            scroll={false}
            onClick={handlePageClick}
            aria-current={page === currentPage ? 'page' : undefined}
            className={`w-10 h-10 flex items-center justify-center font-display font-bold text-sm transition-all duration-200 ${
              page === currentPage
                ? 'bg-brand-red text-white pointer-events-none shadow-sm'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-brand-red hover:text-brand-red'
            }`}
          >
            {page}
          </Link>
        )
      )}

      {/* Sonraki */}
      {currentPage < totalPages ? (
        <Link 
          href={getPageUrl(currentPage + 1)}
          prefetch={true}
          scroll={false}
          onClick={handlePageClick}
          aria-label="Sonraki Sayfa"
          className="w-10 h-10 border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-brand-red hover:text-brand-red transition-all duration-200"
        >
          <ChevronRight size={16} />
        </Link>
      ) : (
        <div className="w-10 h-10 border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300 cursor-not-allowed">
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  )
}
