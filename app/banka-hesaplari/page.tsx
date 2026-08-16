'use client'

import { BANK_ACCOUNTS } from '@/lib/bank-accounts'
import { Building2, Copy, Check, Info } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function BankaHesaplariPage() {
  const [copiedIban, setCopiedIban] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedIban(text)
    setTimeout(() => setCopiedIban(null), 2000)
  }

  return (
    <div className="min-h-screen pt-24 pb-24 bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-6">
        
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Ödeme Bilgileri</span>
          </div>
          <h1 className="font-display font-black text-4xl uppercase text-white tracking-widest">Banka Hesaplarımız</h1>
          <p className="font-body text-white/40 text-sm mt-4 leading-relaxed">
            Havale veya EFT işlemlerinizde aşağıdaki hesaplarımızı kullanabilirsiniz. 
            Lütfen açıklama kısmına <strong>Sipariş Numaranızı</strong> yazmayı unutmayınız.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {BANK_ACCOUNTS.map(bank => (
            <div key={bank.iban} className="bg-[#141414] border border-white/5 p-8 group hover:border-brand-red/30 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={80} />
              </div>
              
              <div className="relative z-10">
                <div className="font-display font-black text-xl text-white uppercase tracking-wider mb-6 pb-4 border-b border-white/5">
                  {bank.bankName}
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="text-[10px] text-white/30 uppercase font-display font-bold tracking-widest mb-1.5">Hesap Sahibi</div>
                    <div className="text-sm text-white font-body">{bank.accountHolder}</div>
                  </div>
                  
                  <div>
                    <div className="text-[10px] text-white/30 uppercase font-display font-bold tracking-widest mb-1.5">IBAN Numarası</div>
                    <div className="flex items-center justify-between bg-black/40 p-3 border border-white/5">
                      <code className="text-xs text-brand-red font-bold tracking-wider">{bank.iban}</code>
                      <button 
                        onClick={() => copyToClipboard(bank.iban)}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        title="Kopyala"
                      >
                        {copiedIban === bank.iban ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-brand-red/5 border border-brand-red/10 p-6 flex items-start gap-4">
          <Info className="text-brand-red mt-1 flex-shrink-0" size={20} />
          <div className="space-y-2">
            <h4 className="font-display font-bold text-xs uppercase tracking-widest text-white">Önemli Hatırlatma</h4>
            <p className="text-white/40 text-sm font-body leading-relaxed">
              Ödemeniz gerçekleştikten sonra <Link href="/hesabim" className="text-brand-red hover:underline font-bold">Hesabım</Link> sayfasından 
              dekontunuzu yükleyerek onay sürecini hızlandırabilirsiniz. Ödemeler genellikle 15-30 dakika içinde onaylanmaktadır.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
