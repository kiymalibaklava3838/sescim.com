'use client'

import { Printer } from 'lucide-react'

export default function PrintInvoiceButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-display font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-md shadow transition-all cursor-pointer"
    >
      <Printer size={16} /> Yazdır / PDF Olarak Kaydet
    </button>
  )
}
