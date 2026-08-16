'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GitCompare, Trash2 } from 'lucide-react'
import { clearCompareList, getCompareList, toggleCompare, type SavedProduct } from '@/lib/product-lists'
import { formatFiyat } from '@/lib/kur'

export default function KarsilastirPage() {
  const [items, setItems] = useState<SavedProduct[]>([])

  useEffect(() => {
    const sync = () => setItems(getCompareList())
    sync()
    window.addEventListener('product-lists-updated', sync)
    return () => window.removeEventListener('product-lists-updated', sync)
  }, [])

  return (
    <div className="min-h-screen pt-8 pb-24">
      <div className="bg-[#0A0A0A] border-b border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Analiz</span>
          </div>
          <h1 className="font-display font-black text-5xl md:text-7xl uppercase text-white">Karşılaştırma</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-10">
        {items.length < 2 ? (
          <div className="text-center py-20 border border-white/5 bg-[#141414]">
            <GitCompare size={34} className="text-white/15 mx-auto mb-4" />
            <p className="font-body text-white/40 mb-6">Karşılaştırma için en az 2 ürün ekleyin.</p>
            <Link href="/urunler" className="btn-primary text-sm">Ürünlere Dön</Link>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                type="button"
                className="btn-outline text-xs"
                onClick={() => {
                  clearCompareList()
                  setItems([])
                }}
              >
                Tümünü Temizle
              </button>
            </div>
            <div className="overflow-x-auto border border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-[#141414]">
                  <tr>
                    <th className="text-left p-3 font-display text-white/40 uppercase text-xs tracking-wider">Özellik</th>
                    {items.map((i) => (
                      <th key={i.id} className="text-left p-3 min-w-[240px]">
                        <div className="font-display text-white uppercase text-sm">{i.ad}</div>
                        <div className="mt-2">
                          <button
                            type="button"
                            className="text-white/35 hover:text-brand-red"
                            onClick={() => {
                              toggleCompare(i)
                              setItems(getCompareList())
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {row('Kategori', items.map((i) => i.kategori))}
                  {row('Fiyat', items.map((i) => (i.fiyat ? formatFiyat(i.fiyat, i.para_birimi || 'TRY') : '—')))}
                  {row('Stok Durumu', items.map((i) => i.stok_durumu || '—'))}
                  {row('Stok Adedi', items.map((i) => (i.stok_adedi ?? '—').toString()))}
                  {row('Kritik Seviye', items.map((i) => (i.kritik_stok ?? '—').toString()))}
                  {row('Marka', items.map((i) => i.marka || '—'))}
                  {row('Kullanım Alanı', items.map((i) => i.kullanim_alani || '—'))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function row(label: string, values: string[]) {
  return (
    <tr className="border-t border-white/5 bg-[#101010]">
      <td className="p-3 text-white/40">{label}</td>
      {values.map((value, i) => (
        <td key={`${label}-${i}`} className="p-3 text-white/70">{value}</td>
      ))}
    </tr>
  )
}
