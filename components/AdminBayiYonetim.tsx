'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Trash2, UserCheck, UserX, RefreshCw, DollarSign, X } from 'lucide-react'

interface Bayi {
  id: string
  firma_adi: string
  yetkili_adi: string
  telefon: string
  sehir: string
  onaylandi: boolean
  created_at: string
  user_id: string
}

interface Basvuru {
  id: string
  firma_adi: string
  yetkili_adi: string
  telefon: string
  email: string
  sehir: string
  mesaj: string
  durum: string
  created_at: string
}

interface UrunFiyat {
  urun_id: string
  ad: string
  bayi_fiyati: number | null
}

interface Props {
  activeTab: 'bayiler' | 'basvurular'
}

export default function AdminBayiYonetim({ activeTab }: Props) {
  const [bayiler, setBayiler] = useState<Bayi[]>([])
  const [basvurular, setBasvurular] = useState<Basvuru[]>([])
  const [urunFiyatlari, setUrunFiyatlari] = useState<UrunFiyat[]>([])
  const [loading, setLoading] = useState(true)
  const [fiyatModal, setFiyatModal] = useState<Bayi | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const supabase = useRef(createClient()).current

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const [{ data: b }, { data: bv }] = await Promise.all([
      supabase.from('bayiler').select('id, firma_adi, yetkili_adi, telefon, sehir, onaylandi, created_at, user_id').order('created_at', { ascending: false }).limit(200),
      supabase.from('bayi_basvurular').select('id, firma_adi, yetkili_adi, telefon, email, sehir, mesaj, durum, created_at').order('created_at', { ascending: false }).limit(200),
    ])
    setBayiler(b || [])
    setBasvurular(bv || [])
    setLoading(false)
  }

  const [priceSearch, setPriceSearch] = useState('')
  const [pricePage, setPricePage] = useState(1)
  const PRICE_PER_PAGE = 20

  const loadUrunFiyatlari = async (bayiId: string, search = '', page = 1) => {
    const from = (page - 1) * PRICE_PER_PAGE
    const to = from + PRICE_PER_PAGE - 1

    let q = supabase.from('urunler').select('id, ad', { count: 'exact' })
    if (search) q = q.ilike('ad', `%${search}%`)
    
    const { data: urunler, count } = await q.order('ad', { ascending: true }).range(from, to)
    const { data: fiyatlar } = await supabase.from('urun_fiyatlari').select('urun_id, bayi_fiyati').eq('bayi_id', bayiId)
    
    const merged = (urunler || []).map((u: any) => ({
      urun_id: u.id,
      ad: u.ad,
      bayi_fiyati: fiyatlar?.find((f: any) => f.urun_id === u.id)?.bayi_fiyati ?? null,
    }))
    
    setUrunFiyatlari(merged)
  }

  // Arama değişince fiyatları yeniden yükle
  useEffect(() => {
    if (fiyatModal) {
      const timer = setTimeout(() => {
        loadUrunFiyatlari(fiyatModal.id, priceSearch, 1)
        setPricePage(1)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [priceSearch])

  // Sayfa değişince fiyatları yeniden yükle
  useEffect(() => {
    if (fiyatModal && pricePage > 1) {
      loadUrunFiyatlari(fiyatModal.id, priceSearch, pricePage)
    }
  }, [pricePage])

  const toggleOnay = async (bayi: Bayi) => {
    setActionLoading(bayi.id)
    const yeniDurum = !bayi.onaylandi

    await supabase.from('bayiler').update({ onaylandi: yeniDurum }).eq('id', bayi.id)

    // Bayiye e-posta bildirimi gönder
    try {
      await fetch('/api/bayi-durum-bildirim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bayi_id: bayi.id,
          firma_adi: bayi.firma_adi,
          yetkili_adi: bayi.yetkili_adi,
          onaylandi: yeniDurum,
        }),
      })
    } catch (e) {
      console.error('Bayi durum bildirimi gönderilemedi:', e)
    }

    await loadAll()
    setActionLoading(null)
  }

  const deleteBayi = async (id: string) => {
    if (!confirm('Bu bayiyi silmek istediğinize emin misiniz?')) return
    setActionLoading(id)
    await supabase.from('bayiler').delete().eq('id', id)
    await loadAll()
    setActionLoading(null)
  }

  const updateBasvuruDurum = async (id: string, durum: string, basvuru?: Basvuru) => {
    setActionLoading(id)
    
    // Onaylama işlemi ise, önce e-posta davetini ve bayi oluşturmayı deniyoruz.
    if (durum === 'onaylandi' && basvuru) {
      try {
        const res = await fetch('/api/bayi-davet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: basvuru.email,
            firma_adi: basvuru.firma_adi,
            yetkili_adi: basvuru.yetkili_adi,
            sehir: basvuru.sehir,
            telefon: basvuru.telefon,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          alert(`Davet gönderilirken bir hata oluştu: ${data.error || 'Bilinmeyen hata'}`)
          setActionLoading(null)
          return // İşlemi iptal et, durumu onaylandı yapma!
        }
      } catch (e) {
        console.error('Davet gönderilemedi:', e)
        alert('Sunucuya bağlanılamadı. Davet gönderilemedi.')
        setActionLoading(null)
        return // İşlemi iptal et
      }
    }

    // Davet başarılıysa (veya reddetme işlemindeysek) başvuru durumunu güncelle
    await supabase.from('bayi_basvurular').update({ durum }).eq('id', id)
    await loadAll()
    setActionLoading(null)
  }

  const saveFiyat = async (urun_id: string, fiyat: string) => {
    if (!fiyatModal) return
    const val = parseFloat(fiyat)
    if (isNaN(val) || val <= 0) return
    await supabase
      .from('urun_fiyatlari')
      .upsert({ urun_id, bayi_id: fiyatModal.id, bayi_fiyati: val }, { onConflict: 'urun_id, bayi_id' })
    await loadUrunFiyatlari(fiyatModal.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-white/10 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* ── BAYİLER ── */}
      {activeTab === 'bayiler' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white red-line">
              Kayıtlı Bayiler ({bayiler.length})
            </h2>
            <button
              onClick={loadAll}
              className="flex items-center gap-2 text-white/30 hover:text-white text-xs font-display uppercase tracking-widest transition-colors"
            >
              <RefreshCw size={12} />
              Yenile
            </button>
          </div>

          {bayiler.length === 0 ? (
            <div className="border border-white/5 bg-[#141414] p-12 text-center">
              <p className="font-display font-semibold text-sm uppercase text-white/20 tracking-widest">Henüz kayıtlı bayi yok</p>
            </div>
          ) : (
            <div className="space-y-1">
              {bayiler.map((bayi) => (
                <div key={bayi.id}
                  className="bg-[#141414] border border-white/5 p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bayi.onaylandi ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-display font-bold text-sm uppercase text-white tracking-wide">{bayi.firma_adi}</span>
                      <span className={`font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 ${
                        bayi.onaylandi ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {bayi.onaylandi ? 'Onaylı' : 'Beklemede'}
                      </span>
                    </div>
                    <div className="font-body text-white/30 text-xs mt-1">
                      {bayi.yetkili_adi} • {bayi.sehir} • {bayi.telefon}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setFiyatModal(bayi); loadUrunFiyatlari(bayi.id) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-white/40 hover:border-brand-red/40 hover:text-brand-red transition-all text-xs font-display font-semibold uppercase tracking-widest"
                    >
                      <DollarSign size={12} />
                      Fiyatlar
                    </button>
                    <button
                      onClick={() => toggleOnay(bayi)}
                      disabled={actionLoading === bayi.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all text-xs font-display font-semibold uppercase tracking-widest disabled:opacity-40 ${
                        bayi.onaylandi
                          ? 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'
                          : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                      }`}
                    >
                      {actionLoading === bayi.id
                        ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        : bayi.onaylandi ? <UserX size={12} /> : <UserCheck size={12} />
                      }
                      {bayi.onaylandi ? 'Askıya Al' : 'Onayla'}
                    </button>
                    <button
                      onClick={() => deleteBayi(bayi.id)}
                      disabled={actionLoading === bayi.id}
                      className="w-8 h-8 border border-white/10 flex items-center justify-center text-white/20 hover:border-red-500/40 hover:text-red-500 transition-all disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BAŞVURULAR ── */}
      {activeTab === 'basvurular' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-bold text-xl uppercase tracking-wide text-white red-line">
              Bayi Başvuruları ({basvurular.length})
            </h2>
            <div className="flex items-center gap-4 text-xs font-body text-white/30">
              <span className="flex items-center gap-1.5">
                <Clock size={11} className="text-yellow-400" />
                {basvurular.filter(b => b.durum === 'beklemede').length} beklemede
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={11} className="text-green-400" />
                {basvurular.filter(b => b.durum === 'onaylandi').length} onaylı
              </span>
            </div>
          </div>

          {basvurular.length === 0 ? (
            <div className="border border-white/5 bg-[#141414] p-12 text-center">
              <p className="font-display font-semibold text-sm uppercase text-white/20 tracking-widest">Henüz başvuru yok</p>
            </div>
          ) : (
            <div className="space-y-1">
              {basvurular.map((b) => (
                <div key={b.id}
                  className="bg-[#141414] border border-white/5 p-5 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-display font-bold text-sm uppercase text-white tracking-wide">{b.firma_adi}</span>
                        <span className={`font-display font-semibold text-xs tracking-widest uppercase px-2 py-0.5 ${
                          b.durum === 'onaylandi' ? 'bg-green-500/10 text-green-400' :
                          b.durum === 'reddedildi' ? 'bg-red-500/10 text-red-400' :
                          'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {b.durum === 'onaylandi' ? 'Onaylandı' : b.durum === 'reddedildi' ? 'Reddedildi' : 'Beklemede'}
                        </span>
                        <span className="font-body text-white/20 text-xs">
                          {new Date(b.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <div className="font-body text-white/40 text-sm space-y-0.5">
                        <div>{b.yetkili_adi} • {b.sehir} • {b.telefon}</div>
                        <div className="text-brand-red/60">{b.email}</div>
                        {b.mesaj && (
                          <div className="text-white/25 italic mt-1">"{b.mesaj}"</div>
                        )}
                      </div>
                    </div>
                    {b.durum === 'beklemede' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateBasvuruDurum(b.id, 'onaylandi', b)}
                          disabled={actionLoading === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all text-xs font-display font-semibold uppercase tracking-widest disabled:opacity-40"
                        >
                          {actionLoading === b.id
                            ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            : <CheckCircle size={12} />
                          }
                          Onayla & Davet Et
                        </button>
                        <button
                          onClick={() => updateBasvuruDurum(b.id, 'reddedildi')}
                          disabled={actionLoading === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-xs font-display font-semibold uppercase tracking-widest disabled:opacity-40"
                        >
                          <XCircle size={12} />
                          Reddet
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FİYAT MODAL ── */}
      {fiyatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="bg-[#141414] border border-white/10 w-full max-w-2xl max-h-[80vh] flex flex-col"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)' }}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <div className="font-display font-black text-lg uppercase text-white">Bayi Fiyatları</div>
                <div className="font-body text-white/40 text-sm mt-0.5">{fiyatModal.firma_adi} — tüm bayiler için geçerlidir</div>
              </div>
              <button onClick={() => setFiyatModal(null)} className="text-white/20 hover:text-white transition-colors p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-white/5 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ürün adı ile ara..."
                  value={priceSearch}
                  onChange={(e) => setPriceSearch(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:border-brand-red transition-colors"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/30 text-xs">Sayfa {pricePage}</span>
                <div className="flex gap-2">
                  <button
                    disabled={pricePage === 1}
                    onClick={() => setPricePage(p => p - 1)}
                    className="px-3 py-1 bg-white/5 border border-white/10 text-white text-xs disabled:opacity-30 hover:bg-white/10 transition-colors"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPricePage(p => p + 1)}
                    disabled={urunFiyatlari.length < PRICE_PER_PAGE}
                    className="px-3 py-1 bg-white/5 border border-white/10 text-white text-xs disabled:opacity-30 hover:bg-white/10 transition-colors"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {urunFiyatlari.length === 0 ? (
                <div className="text-center py-8 text-white/20 font-body text-sm">Henüz ürün eklenmemiş</div>
              ) : (
                urunFiyatlari.map((u) => (
                  <div key={u.urun_id} className="flex items-center gap-4 bg-[#1A1A1A] border border-white/5 p-3">
                    <div className="flex-1 font-display font-semibold text-sm uppercase text-white tracking-wide truncate">{u.ad}</div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={u.bayi_fiyati ?? ''}
                        placeholder="Fiyat girin"
                        className="w-32 bg-[#0F0F0F] border border-white/10 text-white text-sm px-3 py-1.5 focus:outline-none focus:border-brand-red transition-colors text-right"
                        onBlur={(e) => saveFiyat(u.urun_id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveFiyat(u.urun_id, (e.target as HTMLInputElement).value)
                        }}
                      />
                      <span className="font-body text-white/30 text-xs w-4">₺</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/5">
              <p className="font-body text-white/20 text-xs text-center">
                Tab veya Enter ile kaydedin. Tüm onaylı bayiler bu fiyatları görür.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
