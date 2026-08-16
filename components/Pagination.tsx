import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  currentPage: number
  totalPages: number
  baseParams: string
}

export default function Pagination({ currentPage, totalPages, baseParams }: Props) {
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(baseParams)
    params.set('sayfa', String(page))
    return `/urunler?${params.toString()}`
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

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {/* Önceki */}
      {currentPage > 1 ? (
        <Link href={getPageUrl(currentPage - 1)}
          className="w-10 h-10 border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-brand-red hover:text-brand-red transition-all duration-200">
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
          <span key={`dots-${i}`} className="w-10 h-10 flex items-center justify-center text-slate-400 font-body text-sm">
            ···
          </span>
        ) : (
          <Link
            key={page}
            href={getPageUrl(page)}
            className={`w-10 h-10 flex items-center justify-center font-display font-bold text-sm transition-all duration-200 ${
              page === currentPage
                ? 'bg-brand-red text-white'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-brand-red hover:text-brand-red'
            }`}
          >
            {page}
          </Link>
        )
      )}

      {/* Sonraki */}
      {currentPage < totalPages ? (
        <Link href={getPageUrl(currentPage + 1)}
          className="w-10 h-10 border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-brand-red hover:text-brand-red transition-all duration-200">
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
