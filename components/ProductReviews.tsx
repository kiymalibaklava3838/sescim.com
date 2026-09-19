'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Star, MessageSquare, Loader2, Camera, X, Check, Image as ImageIcon, 
  ZoomIn, Reply, Send, ShieldCheck 
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { compressImageToWebP } from '@/lib/image-compressor'

export interface ReviewReply {
  id?: string
  author: string
  role?: 'store' | 'user'
  text: string
  date: string
}

export interface Review {
  id: string
  puan: number
  ad_soyad?: string
  yorum: string
  created_at: string
  user_id: string
  fotograflar?: string[]
  replies?: ReviewReply[]
  rawYorum?: string
}

interface PhotoItem {
  file: File
  blob: Blob
  previewUrl: string
  sizeKb: number
}

interface Props {
  urun_id: string
}

export function packReviewContent(
  text: string, 
  photos: string[] = [], 
  replies: ReviewReply[] = []
): string {
  let res = text.trim()
  if (photos && photos.length > 0) {
    res += `\n\n<!--PHOTOS:${JSON.stringify(photos)}-->`
  }
  if (replies && replies.length > 0) {
    res += `\n\n<!--REPLIES:${JSON.stringify(replies)}-->`
  }
  return res
}

export const parseReviewContent = (
  rawYorum: string
): { cleanYorum: string; photos: string[]; replies: ReviewReply[] } => {
  let photos: string[] = []
  let replies: ReviewReply[] = []
  let cleanYorum = rawYorum || ''

  // 1. Photos
  const photoMatch = cleanYorum.match(/<!--PHOTOS:(.*?)-->/)
  if (photoMatch && photoMatch[1]) {
    try {
      photos = JSON.parse(photoMatch[1])
    } catch (e) {}
    cleanYorum = cleanYorum.replace(/<!--PHOTOS:(.*?)-->/g, '').trim()
  }

  // 2. Multi-replies
  const repliesMatch = cleanYorum.match(/<!--REPLIES:(.*?)-->/)
  if (repliesMatch && repliesMatch[1]) {
    try {
      replies = JSON.parse(repliesMatch[1])
    } catch (e) {}
    cleanYorum = cleanYorum.replace(/<!--REPLIES:(.*?)-->/g, '').trim()
  } else {
    // 3. Single reply fallback
    const singleMatch = cleanYorum.match(/<!--REPLY:(.*?)-->/)
    if (singleMatch && singleMatch[1]) {
      try {
        const r = JSON.parse(singleMatch[1])
        if (r) replies.push(r)
      } catch (e) {}
      cleanYorum = cleanYorum.replace(/<!--REPLY:(.*?)-->/g, '').trim()
    }
  }

  return { cleanYorum, photos, replies }
}

export default function ProductReviews({ urun_id }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [yorum, setYorum] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoItem[]>([])
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [activeLightbox, setActiveLightbox] = useState<string | null>(null)
  
  // Return URL for redirect after login
  const [returnUrl, setReturnUrl] = useState('/urunler')

  // Reply state
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replySubmitting, setReplySubmitting] = useState(false)
  const [replyError, setReplyError] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => setSession(res.data.session))
    
    if (typeof window !== 'undefined') {
      setReturnUrl(`${window.location.pathname}#yorumlar`)
    }

    loadReviews()
  }, [urun_id])

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('urun_yorumlari')
        .select('*')
        .eq('urun_id', urun_id)
        .eq('onaylandi', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatted = (data || []).map((rev: any) => {
        const { cleanYorum, photos, replies } = parseReviewContent(rev.yorum)
        return {
          ...rev,
          rawYorum: rev.yorum,
          yorum: cleanYorum,
          fotograflar: rev.fotograflar && rev.fotograflar.length > 0 ? rev.fotograflar : photos,
          replies: replies,
        }
      })

      setReviews(formatted)
    } catch (e) {
      console.error('Yorumlar yüklenirken hata:', e)
    } finally {
      setLoading(false)
    }
  }

  // Fotoğraf seçimi ve istemci tarafında anında WebP sıkıştırma
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const remainingSlots = 3 - selectedPhotos.length
    if (remainingSlots <= 0) {
      setError('En fazla 3 adet fotoğraf ekleyebilirsiniz.')
      return
    }

    const filesToProcess = files.slice(0, remainingSlots)
    setCompressing(true)
    setError('')

    try {
      const newPhotoItems: PhotoItem[] = []
      for (const file of filesToProcess) {
        // İstemci tarafında WebP sıkıştırma (max 1200px, 80% kalite)
        const webpBlob = await compressImageToWebP(file, 1200, 1200, 0.8)
        const previewUrl = URL.createObjectURL(webpBlob)
        newPhotoItems.push({
          file,
          blob: webpBlob,
          previewUrl,
          sizeKb: Math.round(webpBlob.size / 1024),
        })
      }

      setSelectedPhotos((prev) => [...prev, ...newPhotoItems])
    } catch (err: any) {
      setError('Fotoğraf optimize edilirken bir sorun oluştu.')
    } finally {
      setCompressing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removePhoto = (index: number) => {
    setSelectedPhotos((prev) => {
      const target = prev[index]
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.id) {
      setError('Yorum yapabilmek için lütfen giriş yapın.')
      return
    }
    if (yorum.trim().length < 10) {
      setError('Lütfen en az 10 karakterlik bir yorum girin.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const uploadedUrls: string[] = []

      // 1. Fotoğrafları doğrudan Supabase Storage'a yükle
      if (selectedPhotos.length > 0) {
        for (const item of selectedPhotos) {
          const signRes = await fetch('/api/reviews/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: item.file.name, contentType: 'image/webp' }),
          })

          if (!signRes.ok) {
            throw new Error('Görsel yükleme yetkisi alınamadı.')
          }

          const { uploadUrl, publicUrl } = await signRes.json()

          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/webp' },
            body: item.blob,
          })

          if (!uploadRes.ok) {
            throw new Error('Görsel doğrudan depolamaya yüklenemedi.')
          }

          uploadedUrls.push(publicUrl)
        }
      }

      // 2. Yorum metnini ve görsel bağlantılarını hazırla
      const finalYorum = packReviewContent(yorum.trim(), uploadedUrls, [])

      const userDisplayName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.ad_soyad ||
        session.user.email?.split('@')[0] ||
        'Kullanıcı'

      const { error: insErr } = await supabase.from('urun_yorumlari').insert({
        urun_id,
        user_id: session.user.id,
        ad_soyad: userDisplayName,
        puan: rating,
        yorum: finalYorum,
        onaylandi: false, // Moderatör onayına gider
      })

      if (insErr) throw insErr

      // Başarılı temizleme
      setSubmitted(true)
      setYorum('')
      setSelectedPhotos([])
      setRating(5)
    } catch (e: any) {
      console.error('Yorum gönderme hatası:', e)
      setError(e.message || 'Yorum gönderilirken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  // Yorum Yanıtlama Fonksiyonu (Kullanıcı Girişi Zorunlu)
  const handleReplySubmit = async (reviewId: string) => {
    if (!session?.user?.id) {
      setReplyError('Yanıt yazabilmek için lütfen giriş yapın.')
      return
    }
    if (!replyText.trim() || replyText.trim().length < 3) {
      setReplyError('Lütfen en az 3 karakterlik bir yanıt yazın.')
      return
    }

    setReplySubmitting(true)
    setReplyError('')

    try {
      const targetRev = reviews.find((r) => r.id === reviewId)
      if (!targetRev) throw new Error('Yorum bulunamadı.')

      const userDisplayName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.ad_soyad ||
        session.user.email?.split('@')[0] ||
        'Kullanıcı'

      const newReply: ReviewReply = {
        id: `reply-${Date.now()}`,
        author: userDisplayName,
        role: 'user',
        text: replyText.trim(),
        date: new Date().toISOString(),
      }

      const existingReplies = targetRev.replies || []
      const updatedReplies = [...existingReplies, newReply]

      const packedYorum = packReviewContent(
        targetRev.yorum,
        targetRev.fotograflar || [],
        updatedReplies
      )

      const { error: updErr } = await supabase
        .from('urun_yorumlari')
        .update({ yorum: packedYorum })
        .eq('id', reviewId)

      if (updErr) throw updErr

      // Anlık lokal güncelleme
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, replies: updatedReplies, rawYorum: packedYorum }
            : r
        )
      )

      setReplyText('')
      setReplyingReviewId(null)
    } catch (e: any) {
      console.error('Yanıt gönderme hatası:', e)
      setReplyError(e.message || 'Yanıt gönderilirken bir hata oluştu.')
    } finally {
      setReplySubmitting(false)
    }
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((a, b) => a + b.puan, 0) / reviews.length).toFixed(1)
      : '5.0'

  return (
    <div className="mt-16 pt-12 border-t border-slate-200" id="yorumlar">
      {/* Lightbox Modal */}
      {activeLightbox && (
        <div
          onClick={() => setActiveLightbox(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 cursor-default"
          >
            <button
              onClick={() => setActiveLightbox(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/60 hover:bg-black/90 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
            >
              <X size={18} />
            </button>
            <div className="relative w-full h-[70vh]">
              <Image
                src={activeLightbox}
                alt="Ürün değerlendirme fotoğrafı"
                fill
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Başlık */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-px bg-brand-red" />
        <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">
          Müşteri Değerlendirmeleri
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-10">
        {/* Sol Sütun - Değerlendirme Formu (Kullanıcı Girişi Zorunlu) */}
        <div className="md:col-span-1">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sticky top-24 shadow-sm">
            <h3 className="font-display font-black text-xl text-slate-900 mb-2">
              Deneyiminizi Paylaşın
            </h3>
            <p className="text-xs font-body text-slate-500 mb-6">
              Satın aldığınız ürünle ilgili görüşleriniz diğer müzikseverlere ve profesyonellere rehberlik eder.
            </p>

            {submitted ? (
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-emerald-800 text-sm">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Check size={18} className="text-emerald-600" />
                  Yorumunuz Alındı!
                </div>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Değerlendirmeniz ve fotoğraflarınız moderatör onayının ardından yayına alınacaktır. Teşekkür ederiz!
                </p>
              </div>
            ) : !session ? (
              <div className="bg-white border border-slate-200 p-6 rounded-xl text-center shadow-xs">
                <MessageSquare size={32} className="text-slate-400 mx-auto mb-3" />
                <h4 className="font-bold text-sm text-slate-800 mb-1">
                  Giriş Yapmanız Gerekiyor
                </h4>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  Ürünü değerlendirebilmek, fotoğraf ekleyebilmek veya yanıtlara katılabilmek için lütfen hesabınıza giriş yapın.
                </p>
                <Link 
                  href={`/uye?redirect=${encodeURIComponent(returnUrl)}`} 
                  className="btn-primary py-2.5 px-6 text-xs justify-center w-full font-bold uppercase tracking-wider rounded-lg shadow-sm"
                >
                  Giriş Yap / Üye Ol
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Puan Seçimi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Ürün Puanı
                  </label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={
                            rating >= s
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 hover:text-amber-200'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Yorum Alanı */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Yorumunuz *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={yorum}
                    onChange={(e) => setYorum(e.target.value)}
                    className="input-base w-full resize-none text-xs"
                    placeholder="Ses kalitesi, malzeme yapısı ve kullanım deneyiminiz hakkında neler düşünüyorsunuz?"
                  />
                </div>

                {/* Fotoğraf Ekleme */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera size={13} className="text-slate-500" />
                      Fotoğraf Ekle (Opsiyonel)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {selectedPhotos.length}/3
                    </span>
                  </div>

                  {/* Fotoğraf Yükleme Butonu */}
                  {selectedPhotos.length < 3 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-300 hover:border-brand-red/50 bg-white hover:bg-red-50/20 rounded-xl p-3 text-center cursor-pointer transition-colors"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600">
                        {compressing ? (
                          <>
                            <Loader2 size={15} className="animate-spin text-brand-red" />
                            <span>Optimize Ediliyor...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon size={15} className="text-brand-red" />
                            <span>Fotoğraf Seç (Maks. 3 Adet)</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Otomatik WebP sıkıştırmasıyla hızlı ve optimize yüklenir.
                      </p>
                    </div>
                  )}

                  {/* Seçilen Fotoğraf Önizlemeleri */}
                  {selectedPhotos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {selectedPhotos.map((item, idx) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group bg-slate-100"
                        >
                          <Image
                            src={item.previewUrl}
                            alt="Yorum önizleme"
                            fill
                            className="object-cover"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white text-center py-0.5 font-mono">
                            {item.sizeKb}KB
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-xs"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && <div className="text-red-500 text-xs font-medium">{error}</div>}

                <button
                  type="submit"
                  disabled={submitting || compressing}
                  className="btn-primary w-full justify-center py-3 text-xs uppercase tracking-wider font-bold rounded-xl"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      <span>Yükleniyor...</span>
                    </div>
                  ) : (
                    'Yorumu Gönder'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sağ Sütun - Değerlendirmeler Listesi ve Yanıtlar */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 size={32} className="animate-spin text-slate-300" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <MessageSquare size={26} />
              </div>
              <h4 className="font-display font-bold text-base text-slate-800 mb-1">
                Henüz Değerlendirme Bulunmuyor
              </h4>
              <p className="font-body text-slate-500 text-xs">
                Bu ürünü satın aldıysanız ilk fotoğraflı değerlendirmeyi siz ekleyin!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Özet Skor Kartı */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex items-center gap-6">
                <div className="text-center sm:text-left">
                  <div className="text-4xl font-display font-black text-slate-900 leading-none mb-1">
                    {avgRating}
                  </div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        className={
                          s <= Math.round(Number(avgRating))
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200'
                        }
                      />
                    ))}
                  </div>
                  <div className="text-xs font-body text-slate-500">
                    Toplam {reviews.length} değerlendirme
                  </div>
                </div>
              </div>

              {/* Yorumlar Akışı */}
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-bold text-xs text-slate-700 uppercase">
                        {(rev.ad_soyad || 'M')[0]}
                      </div>
                      <div>
                        <div className="font-display font-bold text-xs text-slate-900">
                          {rev.ad_soyad || 'Müşteri'}
                        </div>
                        <div className="flex gap-0.5 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                s <= rev.puan
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-200'
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-body">
                      {new Date(rev.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </div>

                  <p className="text-slate-700 font-body text-xs sm:text-sm leading-relaxed whitespace-pre-line break-words mb-4">
                    {rev.yorum}
                  </p>

                  {/* Fotoğraf Galerisi & Lightbox */}
                  {rev.fotograflar && rev.fotograflar.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mb-4">
                      {rev.fotograflar.map((imgUrl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveLightbox(imgUrl)}
                          className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 group bg-slate-50 cursor-zoom-in hover:border-brand-red/50 transition-all shadow-xs"
                        >
                          <Image
                            src={imgUrl}
                            alt="Yorum fotoğrafı"
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            sizes="80px"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn
                              size={16}
                              className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md"
                            />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Yanıtlar (Cevaplar) ve Yanıtlama Alanı */}
                  <div className="pt-3 border-t border-slate-100">
                    {/* Mevcut Yanıtlar */}
                    {rev.replies && rev.replies.length > 0 && (
                      <div className="space-y-3 mb-3">
                        {rev.replies.map((reply, rIdx) => {
                          const isStore = reply.role === 'store'
                          return (
                            <div
                              key={reply.id || rIdx}
                              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                                isStore
                                  ? 'bg-amber-500/[0.04] border-amber-500/20 text-slate-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  {isStore ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-red text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                                      <ShieldCheck size={12} />
                                      Sescim Mağaza Yanıtı
                                    </span>
                                  ) : (
                                    <span className="font-semibold text-slate-900 text-[11px]">
                                      {reply.author || 'Kullanıcı'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(reply.date).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                              <p className="whitespace-pre-line text-xs font-normal">
                                {reply.text}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Yanıt Yaz Formu / Butonu (Giriş Zorunlu) */}
                    {replyingReviewId === rev.id ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 animate-fade-in">
                        {!session ? (
                          <div className="text-center py-2">
                            <p className="text-xs text-slate-600 mb-3">
                              Yorumlara yanıt yazabilmek için lütfen üye girişi yapın.
                            </p>
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/uye?redirect=${encodeURIComponent(returnUrl)}`}
                                className="btn-primary py-1.5 px-4 text-xs font-bold rounded-md"
                              >
                                Giriş Yap
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(null)
                                  setReplyError('')
                                }}
                                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5"
                              >
                                Vazgeç
                              </button>
                            </div>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              handleReplySubmit(rev.id)
                            }}
                            className="space-y-2.5"
                          >
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                              <span>
                                Yanıtınız ({session.user.user_metadata?.full_name || session.user.email?.split('@')[0]})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(null)
                                  setReplyText('')
                                  setReplyError('')
                                }}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Bu değerlendirmeye yanıtınızı yazın..."
                              className="input-base w-full text-xs resize-none"
                              required
                            />
                            {replyError && (
                              <p className="text-xs text-red-500">{replyError}</p>
                            )}
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(null)
                                  setReplyText('')
                                  setReplyError('')
                                }}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                              >
                                İptal
                              </button>
                              <button
                                type="submit"
                                disabled={replySubmitting}
                                className="btn-primary py-1.5 px-4 text-xs font-bold inline-flex items-center gap-1.5 rounded-md"
                              >
                                {replySubmitting ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Gönderiliyor...</span>
                                  </>
                                ) : (
                                  <>
                                    <Send size={12} />
                                    <span>Yanıtla</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingReviewId(rev.id)
                          setReplyText('')
                          setReplyError('')
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-red transition-colors py-1"
                      >
                        <Reply size={13} />
                        <span>Yanıt Yaz</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
