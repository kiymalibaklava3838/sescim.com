'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Mail, Send, Image as ImageIcon, Link as LinkIcon, History, Users, CheckSquare, Plus, ArrowLeft, RefreshCw } from 'lucide-react'

interface Uye {
  id: string
  email: string
  ad_soyad?: string
}

interface KampanyaGecmisi {
  id: string
  konu: string
  baslik: string
  hedef_kitle: string
  gonderilen_kisi_sayisi: number
  created_at: string
}

export default function AdminCampaignManager() {
  const [view, setView] = useState<'history' | 'compose'>('history')
  const [history, setHistory] = useState<KampanyaGecmisi[]>([])
  const [uyeler, setUyeler] = useState<Uye[]>([])
  
  // Form State
  const [targetType, setTargetType] = useState<'all' | 'selected'>('all')
  const [selectedUyeler, setSelectedUyeler] = useState<string[]>([])
  const [konu, setKonu] = useState('')
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [resimUrl, setResimUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const supabase = useRef(createClient()).current

  useEffect(() => {
    loadHistory()
    loadUyeler()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('kampanya_gecmisi')
      .select('id, konu, baslik, hedef_kitle, gonderilen_kisi_sayisi, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (data) setHistory(data)
    setLoading(false)
  }

  const loadUyeler = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/uyeler', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        const fetchedUyeler = data.users.map((u: any) => ({
          id: u.id,
          email: u.email,
          ad_soyad: u.user_metadata?.full_name || u.email
        }))
        setUyeler(fetchedUyeler)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleUye = (id: string) => {
    setSelectedUyeler(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
  }

  const handleSend = async () => {
    setError('')
    setSuccess('')
    
    if (!konu || !baslik || !icerik) {
      setError('Konu, başlık ve içerik alanları zorunludur.')
      return
    }

    if (targetType === 'selected' && selectedUyeler.length === 0) {
      setError('Lütfen en az bir üye seçin.')
      return
    }

    if (!confirm('Kampanyayı göndermek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return

    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Oturum bulunamadı')

      const res = await fetch('/api/admin/toplu-mail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          hedef_kullanicilar: targetType === 'all' ? 'all' : selectedUyeler,
          konu,
          baslik,
          icerik,
          resim_url: resimUrl,
          link_url: linkUrl
        })
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Bir hata oluştu')

      setSuccess(data.mesaj || 'Kampanya başarıyla gönderildi.')
      setKonu(''); setBaslik(''); setIcerik(''); setResimUrl(''); setLinkUrl(''); setSelectedUyeler([]);
      setView('history')
      loadHistory()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  // Yeni kampanya form görünümü
  if (view === 'compose') {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setView('history')}
            className="flex items-center gap-2 text-slate-900/50 hover:text-slate-900 transition-colors font-display text-sm tracking-widest uppercase"
          >
            <ArrowLeft size={16} /> Geri Dön
          </button>
          <h2 className="font-display font-bold text-xl uppercase tracking-wide text-slate-900">Yeni Kampanya</h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Sol Kolon: Form */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 space-y-6">
              
              {/* Hedef Kitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-3">Hedef Kitle</label>
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={targetType === 'all'} 
                      onChange={() => setTargetType('all')}
                      className="accent-brand-red"
                    />
                    <span className="text-sm text-slate-900">Tüm Üyeler ({uyeler.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      checked={targetType === 'selected'} 
                      onChange={() => setTargetType('selected')}
                      className="accent-brand-red"
                    />
                    <span className="text-sm text-slate-900">Seçili Üyeler ({selectedUyeler.length})</span>
                  </label>
                </div>

                {targetType === 'selected' && (
                  <div className="max-h-48 overflow-y-auto border border-slate-200 p-2 space-y-1 bg-slate-50 custom-scrollbar">
                    <div className="flex gap-2 mb-2 pb-2 border-b border-slate-200">
                      <button type="button" onClick={() => setSelectedUyeler(uyeler.map(u => u.id))} className="text-xs text-brand-red hover:text-red-700 transition-colors">Tümünü Seç</button>
                      <button type="button" onClick={() => setSelectedUyeler([])} className="text-xs text-slate-900/50 hover:text-slate-900 transition-colors">Seçimi Temizle</button>
                    </div>
                    {uyeler.map(u => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={selectedUyeler.includes(u.id)}
                          onChange={() => toggleUye(u.id)}
                          className="accent-brand-red"
                        />
                        <span className="text-sm text-slate-900/80">{u.ad_soyad}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* E-Posta Bilgileri */}
              <div>
                <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-2">E-Posta Konusu (Gelen Kutusunda Görünür)</label>
                <input 
                  type="text" 
                  value={konu} onChange={e => setKonu(e.target.value)}
                  placeholder="Örn: Hafta Sonu Fırsatı: Seçili Ürünlerde %20 İndirim"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-2">E-Posta İçi Başlık</label>
                <input 
                  type="text" 
                  value={baslik} onChange={e => setBaslik(e.target.value)}
                  placeholder="Örn: Hafta Sonuna Özel Dev İndirimler"
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-2">İçerik</label>
                <textarea 
                  value={icerik} onChange={e => setIcerik(e.target.value)}
                  rows={6}
                  placeholder="Kampanya detaylarını buraya yazın..."
                  className="input-base resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-2 flex items-center gap-2"><ImageIcon size={14}/> Resim URL (Opsiyonel)</label>
                <input 
                  type="url" 
                  value={resimUrl} onChange={e => setResimUrl(e.target.value)}
                  placeholder="https://..."
                  className="input-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-2 flex items-center gap-2"><LinkIcon size={14}/> Yönlendirme Linki (Opsiyonel)</label>
                <input 
                  type="url" 
                  value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://www.sescim.com/urunler/..."
                  className="input-base"
                />
              </div>

              <button 
                onClick={handleSend}
                disabled={sending}
                className="w-full bg-brand-red hover:bg-red-700 text-white font-bold py-4 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
              >
                {sending ? <><RefreshCw size={18} className="animate-spin" /> GÖNDERİLİYOR...</> : <><Send size={18} /> KAMPANYAYI GÖNDER</>}
              </button>

            </div>
          </div>

          {/* Sağ Kolon: Canlı Önizleme */}
          <div>
            <div className="sticky top-6">
              <label className="block text-xs font-semibold text-slate-900/50 uppercase tracking-widest mb-4">E-Posta Önizlemesi</label>
              
              <div className="bg-white rounded-md overflow-hidden text-black font-sans border border-slate-200 shadow-sm">
                <div className="bg-slate-100 border-b border-slate-200 p-3 text-sm">
                  <div className="flex mb-1"><span className="text-slate-500 w-16">Kimden:</span> <span className="font-semibold">Sescim.com Kampanya</span></div>
                  <div className="flex mb-1"><span className="text-slate-500 w-16">Kime:</span> <span>Üyeler</span></div>
                  <div className="flex"><span className="text-slate-500 w-16">Konu:</span> <span className="font-bold">{konu || '(Konu Girilmedi)'}</span></div>
                </div>
                
                <div className="p-6 bg-slate-50 text-slate-900">
                  {/* Header */}
                  <div className="mb-6 pb-6 border-b border-slate-200 text-center">
                    <div className="font-display font-black text-2xl tracking-widest uppercase text-slate-900">
                      SESCİM<span className="text-brand-red">.COM</span>
                    </div>
                  </div>

                  <h1 className="text-xl font-bold mb-4 text-center text-slate-900">{baslik || 'Başlık Buraya Gelecek'}</h1>
                  
                  <div className="bg-white border border-slate-200 p-6">
                    {resimUrl && (
                      <div className="mb-5 text-center">
                        <img src={resimUrl} alt="Kampanya" className="max-w-full h-auto rounded border border-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                    
                    <div className="text-slate-700 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {icerik || 'E-posta içeriğiniz burada görüntülenecektir.'}
                    </div>

                    {linkUrl && (
                      <div className="mt-6 text-center">
                        <a href={linkUrl} className="inline-block px-8 py-3 bg-[#DA291C] text-white no-underline font-bold text-sm uppercase tracking-wider rounded-sm">
                          Hemen İncele →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Geçmiş Listesi
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display font-bold text-xl uppercase tracking-wide text-slate-900 flex items-center gap-2">
            <div className="w-8 h-px bg-brand-red hidden sm:block" />
            Toplu Mail & Kampanyalar
          </h2>
          <p className="text-slate-900/50 text-sm mt-1 sm:ml-10">Üyelerinize duyuru ve kampanyalar gönderin.</p>
        </div>
        <button 
          onClick={() => setView('compose')}
          className="bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-6 flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-sm shadow-sm"
        >
          <Plus size={16} /> YENİ KAMPANYA
        </button>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
          <CheckSquare size={16} /> {success}
        </div>
      )}

      <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-900/50">Yükleniyor...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center border-dashed border border-slate-200 m-4 bg-slate-50">
            <Mail size={48} className="text-slate-900/10 mb-4" />
            <h3 className="text-slate-900 font-display uppercase tracking-widest mb-2 font-bold">Henüz Kampanya Yok</h3>
            <p className="text-slate-900/50 text-sm max-w-md">Üyelerinize kampanya ve duyuru e-postaları göndererek satışlarınızı artırabilirsiniz.</p>
            <button onClick={() => setView('compose')} className="mt-6 text-brand-red font-bold text-sm uppercase tracking-widest hover:text-red-700 transition-colors">
              İlk Kampanyayı Oluştur →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-900/50 text-xs uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Tarih</th>
                  <th className="px-6 py-4 font-semibold">Konu / Başlık</th>
                  <th className="px-6 py-4 font-semibold">Hedef Kitle</th>
                  <th className="px-6 py-4 font-semibold text-right">Ulaşılan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-900/80">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-900/50">
                      {new Date(item.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">{item.konu}</div>
                      <div className="text-slate-900/50 text-xs truncate max-w-xs mt-1">{item.baslik}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-900/70 text-xs">
                        <Users size={12} /> {item.hedef_kitle}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-display font-bold text-brand-red">
                      {item.gonderilen_kisi_sayisi} Kişi
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
