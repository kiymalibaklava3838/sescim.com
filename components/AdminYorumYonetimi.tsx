'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { createAkdagBrowserClient } from '@/lib/supabase-akdag'
import {
  MessageSquare,
  Check,
  Trash2,
  X,
  Star,
  Reply,
  ShieldCheck,
  Save,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react'
import { parseReviewContent, packReviewContent, ReviewReply } from './ProductReviews'

interface ProductMeta {
  id: string
  ad: string
  slug?: string
  fotograflar?: string[]
}

interface Yorum {
  id: string
  urun_id: string
  user_id: string
  ad_soyad?: string | null
  puan: number
  yorum: string
  onaylandi: boolean
  created_at: string
  urun?: ProductMeta | null
}

export default function AdminYorumYonetimi() {
  const [yorumlar, setYorumlar] = useState<Yorum[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDurum, setFilterDurum] = useState<'tumu' | 'bekleyen' | 'onayli'>('tumu')
  const [searchTerm, setSearchTerm] = useState('')

  // Reply modal state
  const [replyModalYorum, setReplyModalYorum] = useState<Yorum | null>(null)
  const [replyText, setReplyText] = useState('')
  const [savingReply, setSavingReply] = useState(false)

  const supabase = useRef(createClient()).current

  useEffect(() => {
    loadYorumlar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadYorumlar = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('urun_yorumlari')
        .select('id, urun_id, puan, yorum, ad_soyad, created_at, user_id, onaylandi')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Yorumlar yüklenemedi:', error)
        setYorumlar([])
        return
      }

      const list = (data || []) as Yorum[]

      // Yorum yapılan ürünlerin ad, slug ve görsel bilgilerini çek
      const urunIds = Array.from(new Set(list.map((y) => y.urun_id).filter(Boolean)))
      const productMap = new Map<string, ProductMeta>()

      if (urunIds.length > 0) {
        try {
          const akdagDb = createAkdagBrowserClient()
          const [akdagRes, sescimRes] = await Promise.all([
            akdagDb.from('urunler').select('id, ad, slug, fotograflar').in('id', urunIds),
            supabase.from('urunler').select('id, ad, slug, fotograflar').in('id', urunIds),
          ])
          ;(akdagRes.data || []).forEach((p: any) => productMap.set(p.id, p))
          ;(sescimRes.data || []).forEach((p: any) => {
            if (!productMap.has(p.id)) productMap.set(p.id, p)
          })
        } catch (prodErr) {
          console.warn('Yorum ürün bilgileri alınamadı:', prodErr)
        }
      }

      setYorumlar(
        list.map((y) => ({
          ...y,
          urun: productMap.get(y.urun_id) || null,
        }))
      )
    } finally {
      setLoading(false)
    }
  }

  const triggerRevalidate = async (productSlug?: string) => {
    try {
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: productSlug ? `/urun/${productSlug}` : '/urunler',
          tag: 'reviews',
        }),
      })
    } catch (e) {
      console.warn('Revalidation warning:', e)
    }
  }

  const toggleOnay = async (yorum: Yorum) => {
    const { error } = await supabase
      .from('urun_yorumlari')
      .update({ onaylandi: !yorum.onaylandi })
      .eq('id', yorum.id)
    if (error) {
      alert('Durum güncellenemedi: ' + error.message)
      return
    }
    setYorumlar((prev) =>
      prev.map((y) => (y.id === yorum.id ? { ...y, onaylandi: !yorum.onaylandi } : y))
    )
    await triggerRevalidate(yorum.urun?.slug)
  }

  const deleteYorum = async (yorum: Yorum) => {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return
    const { error } = await supabase.from('urun_yorumlari').delete().eq('id', yorum.id)
    if (error) {
      alert('Yorum silinemedi: ' + error.message)
      return
    }
    setYorumlar((prev) => prev.filter((y) => y.id !== yorum.id))
    await triggerRevalidate(yorum.urun?.slug)
  }

  const handleOpenReplyModal = (yorum: Yorum) => {
    const { replies } = parseReviewContent(yorum.yorum)
    const storeReply = replies.find((r) => r.role === 'store')
    setReplyModalYorum(yorum)
    setReplyText(storeReply ? storeReply.text : '')
  }

  const handleSaveStoreReply = async () => {
    if (!replyModalYorum) return

    setSavingReply(true)
    try {
      const { cleanYorum, photos, replies } = parseReviewContent(replyModalYorum.yorum)
      const otherReplies = replies.filter((r) => r.role !== 'store')
      const updatedReplies: ReviewReply[] = [...otherReplies]

      if (replyText.trim()) {
        updatedReplies.push({
          id: `store-reply-${Date.now()}`,
          author: 'Sescim Uzman Ekibi',
          role: 'store',
          text: replyText.trim(),
          date: new Date().toISOString(),
        })
      }

      const packed = packReviewContent(cleanYorum, photos, updatedReplies)

      const { error } = await supabase
        .from('urun_yorumlari')
        .update({ yorum: packed })
        .eq('id', replyModalYorum.id)

      if (error) throw error

      const slug = replyModalYorum.urun?.slug
      setYorumlar((prev) =>
        prev.map((y) => (y.id === replyModalYorum.id ? { ...y, yorum: packed } : y))
      )
      setReplyModalYorum(null)
      setReplyText('')
      await triggerRevalidate(slug)
    } catch (err: any) {
      console.error('Yanıt kaydedilemedi:', err)
      alert('Hata: ' + (err.message || err))
    } finally {
      setSavingReply(false)
    }
  }

  const bekleyenSayisi = yorumlar.filter((y) => !y.onaylandi).length
  const onayliSayisi = yorumlar.filter((y) => y.onaylandi).length

  const filteredYorumlar = yorumlar.filter((y) => {
    if (filterDurum === 'bekleyen' && y.onaylandi) return false
    if (filterDurum === 'onayli' && !y.onaylandi) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const clean = parseReviewContent(y.yorum).cleanYorum.toLowerCase()
      const adSoyad = (y.ad_soyad || '').toLowerCase()
      const urunAd = (y.urun?.ad || '').toLowerCase()
      return clean.includes(q) || adSoyad.includes(q) || urunAd.includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-px bg-brand-red" />
            <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">
              İçerik &amp; İletişim
            </span>
          </div>
          <h2 className="font-display font-black text-2xl uppercase text-slate-900">
            Yorum ve Yanıt Yönetimi
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Müşteri değerlendirmelerini onaylayabilir, gizleyebilir veya yetkili mağaza yanıtı ekleyebilirsiniz.
          </p>
        </div>

        <button
          onClick={loadYorumlar}
          className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-brand-red text-slate-700 hover:text-brand-red text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Filtre & Arama Barı */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterDurum('tumu')}
            className={`px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              filterDurum === 'tumu'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tümü ({yorumlar.length})
          </button>
          <button
            onClick={() => setFilterDurum('bekleyen')}
            className={`px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              filterDurum === 'bekleyen'
                ? 'bg-brand-red text-white'
                : 'bg-red-50 text-brand-red hover:bg-red-100'
            }`}
          >
            Onay Bekleyen ({bekleyenSayisi})
          </button>
          <button
            onClick={() => setFilterDurum('onayli')}
            className={`px-3 py-1.5 text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              filterDurum === 'onayli'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Yayında ({onayliSayisi})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Ürün, müşteri veya yorum ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 rounded-lg focus:border-brand-red outline-none transition-all"
          />
        </div>
      </div>

      {/* Yorum Listesi */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredYorumlar.map((yorum) => {
            const { cleanYorum, photos, replies } = parseReviewContent(yorum.yorum)
            const storeReply = replies.find((r) => r.role === 'store')
            const urunThumb = yorum.urun?.fotograflar?.[0]

            return (
              <div
                key={yorum.id}
                className={`bg-white border p-5 flex flex-col md:flex-row gap-4 shadow-sm transition-all rounded-xl ${
                  yorum.onaylandi ? 'border-slate-200' : 'border-brand-red/40 bg-red-50/15'
                }`}
              >
                {/* Ürün Görseli veya İkon */}
                <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-1">
                  {urunThumb ? (
                    <img
                      src={urunThumb}
                      alt={yorum.urun?.ad || 'Ürün'}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <MessageSquare
                      size={18}
                      className={yorum.onaylandi ? 'text-slate-400' : 'text-brand-red'}
                    />
                  )}
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2.5 mb-1.5">
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          fill={i < yorum.puan ? 'currentColor' : 'none'}
                          className={i >= yorum.puan ? 'text-slate-200' : ''}
                        />
                      ))}
                    </div>

                    <span className="font-bold text-xs text-slate-900 font-display">
                      {yorum.ad_soyad || 'Müşteri'}
                    </span>

                    <span
                      className={`font-display font-bold text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full ${
                        yorum.onaylandi
                          ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-700 border border-red-500/20'
                      }`}
                    >
                      {yorum.onaylandi ? 'Yayında (Onaylı)' : 'Onay Bekliyor'}
                    </span>

                    <span className="text-[10px] text-slate-400 font-body ml-auto">
                      {new Date(yorum.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Ürün Adı & Link */}
                  <div className="mb-2">
                    {yorum.urun ? (
                      <a
                        href={`/urun/${yorum.urun.slug || yorum.urun_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-red hover:underline"
                      >
                        <span>{yorum.urun.ad}</span>
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">
                        Ürün ID: {yorum.urun_id}
                      </span>
                    )}
                  </div>

                  {/* Yorum Metni */}
                  <p className="text-xs sm:text-sm text-slate-700 font-body mb-3 leading-relaxed whitespace-pre-line">
                    {cleanYorum}
                  </p>

                  {/* Fotoğraflar */}
                  {photos.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {photos.map((p, idx) => (
                        <a
                          key={idx}
                          href={p}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative w-14 h-14 rounded-lg border border-slate-200 overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={p}
                            alt="Yorum fotoğrafı"
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Varsa Mağaza Yanıtı veya Kullanıcı Yanıtları */}
                  {replies.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {replies.map((reply, rIdx) => {
                        const isStore = reply.role === 'store'
                        return (
                          <div
                            key={reply.id || rIdx}
                            className={`p-3 rounded-lg text-xs ${
                              isStore
                                ? 'bg-amber-50/60 border border-amber-500/20 text-slate-800'
                                : 'bg-slate-50 border border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold flex items-center gap-1 text-[11px] text-brand-red">
                                {isStore && <ShieldCheck size={13} className="text-brand-red" />}
                                {reply.author}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(reply.date).toLocaleDateString('tr-TR')}
                              </span>
                            </div>
                            <p className="whitespace-pre-line text-slate-600">{reply.text}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Butonlar */}
                <div className="flex md:flex-col gap-2 shrink-0 justify-end md:justify-start">
                  <button
                    onClick={() => handleOpenReplyModal(yorum)}
                    className="flex items-center justify-center h-8 px-3 font-display text-[10px] tracking-widest uppercase border border-slate-200 hover:border-brand-red/40 hover:text-brand-red transition-all rounded-lg bg-white cursor-pointer"
                  >
                    <Reply size={12} className="mr-1.5" />
                    {storeReply ? 'Yanıtı Düzenle' : 'Yanıt Yaz'}
                  </button>

                  <button
                    onClick={() => toggleOnay(yorum)}
                    className={`flex items-center justify-center h-8 px-3 font-display text-[10px] tracking-widest uppercase border transition-all rounded-lg cursor-pointer ${
                      yorum.onaylandi
                        ? 'border-slate-200 text-slate-500 hover:border-red-500/30 hover:text-red-600'
                        : 'border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {yorum.onaylandi ? (
                      <>
                        <X size={12} className="mr-1" /> Gizle
                      </>
                    ) : (
                      <>
                        <Check size={12} className="mr-1" /> Onayla
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deleteYorum(yorum)}
                    className="flex items-center justify-center h-8 px-3 border border-slate-200 text-slate-400 hover:border-red-500/30 hover:text-red-600 transition-all font-display text-[10px] tracking-widest uppercase rounded-lg cursor-pointer"
                  >
                    <Trash2 size={12} className="mr-1" /> Sil
                  </button>
                </div>
              </div>
            )
          })}

          {filteredYorumlar.length === 0 && (
            <div className="py-16 text-center text-slate-400 font-body bg-white border border-slate-200 rounded-xl">
              <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
              Bu filtrede kayıtlı ürün yorumu bulunmuyor.
            </div>
          )}
        </div>
      )}

      {/* MAĞAZA YANITI YAZ / DÜZENLE MODAL */}
      {replyModalYorum && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setReplyModalYorum(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-red" />
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-900">
                  Yetkili Mağaza Yanıtı
                </h3>
              </div>
              <button
                onClick={() => setReplyModalYorum(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-700 mb-1">
                {replyModalYorum.ad_soyad || 'Müşteri'} Yorumu:
              </div>
              <p className="text-xs text-slate-600 italic line-clamp-3">
                &ldquo;{parseReviewContent(replyModalYorum.yorum).cleanYorum}&rdquo;
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mağaza / Uzman Yanıtınız
                </label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Örn: Merhaba, değerlendirmeniz ve güzel sözleriniz için teşekkür ederiz. Ürününüzü iyi günlerde kullanmanızı dileriz..."
                  className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-brand-red resize-none"
                />
                <span className="text-[10px] text-slate-400">
                  Bu yanıt doğrudan yorumun altında &ldquo;Sescim Uzman Ekibi&rdquo; etiketiyle yayınlanır. Boş bırakırsanız mevcut mağaza yanıtı kaldırılır.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReplyModalYorum(null)}
                  className="px-4 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={savingReply}
                  onClick={handleSaveStoreReply}
                  className="btn-primary py-2 px-5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>{savingReply ? 'Kaydediliyor...' : 'Yanıtı Kaydet ve Yayınla'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
