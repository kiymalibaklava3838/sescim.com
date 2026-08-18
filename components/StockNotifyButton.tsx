'use client'

import { useState } from 'react'
import { Bell, Loader2, CheckCircle2, X } from 'lucide-react'

interface Props {
  urun_id: string
  urun_ad: string
}

export default function StockNotifyButton({ urun_id, urun_ad }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setStatus('idle')

    try {
      const res = await fetch('/api/stok-bildirim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urun_id, email, telefon }),
      })
      
      if (!res.ok) throw new Error('Bildirim oluşturulamadı')
      
      setStatus('success')
      setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 3000)
    } catch (err) {
      console.error(err)
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="w-full btn-outline justify-center gap-2 text-xs py-3 group"
      >
        <Bell size={14} className="group-hover:animate-bounce" />
        Stok Gelince Haber Ver
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            
            <div className="p-6">
              <h3 className="font-display font-bold text-lg text-slate-800 mb-1">Haber Ver</h3>
              <p className="text-sm font-body text-slate-500 mb-6 line-clamp-2">
                <span className="font-medium text-slate-700">{urun_ad}</span> stoklara girdiğinde size bildireceğiz.
              </p>

              {status === 'success' ? (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <CheckCircle2 size={48} className="text-green-500 mb-4" />
                  <p className="font-display font-bold text-green-600">Talebiniz Alındı!</p>
                  <p className="text-xs text-slate-500 mt-2">Stok güncellendiğinde haber vereceğiz.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">E-posta Adresi *</label>
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-base w-full"
                      placeholder="ornek@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Telefon (İsteğe Bağlı)</label>
                    <input 
                      type="tel" 
                      value={telefon}
                      onChange={e => setTelefon(e.target.value)}
                      className="input-base w-full"
                      placeholder="0555 555 5555"
                    />
                  </div>

                  {status === 'error' && (
                    <p className="text-xs text-red-500 font-medium">Bir hata oluştu veya daha önce talep oluşturdunuz.</p>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || !email}
                    className="w-full btn-primary justify-center py-3 mt-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'KAYDET'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
