'use client'

import { useState, useEffect, useRef } from 'react'
import { Star, MessageSquare, Loader2, Camera, X, Check, Image as ImageIcon, ZoomIn } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { compressImageToWebP } from '@/lib/image-compressor'

interface Review {
  id: string
  puan: number
  ad_soyad?: string
  yorum: string
  created_at: string
  user_id: string
  fotograflar?: string[]
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

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => setSession(res.data.session))
    loadReviews()
  }, [urun_id])

  const parseReviewContent = (rawYorum: string): { cleanYorum: string; photos: string[] } => {
    let photos: string[] = []
    let cleanYorum = rawYorum || ''

    const photoMatch = rawYorum?.match(/<!--PHOTOS:(.*?)-->/)
    if (photoMatch && photoMatch[1]) {
      try {
        photos = JSON.parse(photoMatch[1])
        cleanYorum = rawYorum.replace(/<!--PHOTOS:(.*?)-->/g, '').trim()
      } catch (e) {
        // Sessizce geç
      }
    }

    return { cleanYorum, photos }
  }

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
        const { cleanYorum, photos } = parseReviewContent(rev.yorum)
        return {
          ...rev,
          yorum: cleanYorum,
          fotograflar: rev.fotograflar && rev.fotograflar.length > 0 ? rev.fotograflar : photos,
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
        // İstemci tarafında sıfır sunucu yüküyle WebP sıkıştırma (max 1200px, 80% kalite)
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
    if (!session?.user) {
      setError('Yorum yapabilmek için giriş yapmalısınız.')
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

      // 1. Fotoğrafları Vercel'i bypass ederek doğrudan Supabase Storage'a yükle
      if (selectedPhotos.length > 0) {
        for (const item of selectedPhotos) {
          // İmzalı upload URL'i al (yalnızca dosya adı iletilir, 0 veri yükü)
          const signRes = await fetch('/api/reviews/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: item.file.name, contentType: 'image/webp' }),
          })

          if (!signRes.ok) {
            throw new Error('Görsel yükleme yetkisi alınamadı.')
          }

          const { uploadUrl, publicUrl } = await signRes.json()

          // Tarayıcıdan doğrudan Supabase Storage'a WebP Blob gönder
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
      const finalYorum =
        uploadedUrls.length > 0
          ? `${yorum.trim()}\n\n<!--PHOTOS:${JSON.stringify(uploadedUrls)}-->`
          : yorum.trim()

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
        {/* Sol Sütun - Değerlendirme Formu */}
        <div className="md:col-span-1">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sticky top-24 shadow-sm">
            <h3 className="font-display font-black text-xl text-slate-900 mb-2">
              Deneyiminizi Paylaşın
            </h3>
            <p className="text-xs font-body text-slate-500 mb-6">
              Satın aldığınız ürünle ilgili görüşleriniz diğer müşterilerimize rehberlik eder.
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
              <div className="bg-white border border-slate-200 p-5 rounded-xl text-center">
                <MessageSquare size={28} className="text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium mb-4">
                  Değerlendirme yapabilmek ve fotoğraf ekleyebilmek için lütfen giriş yapın.
                </p>
                <a href="/uye/giris" className="btn-primary py-2.5 text-xs justify-center w-full">
                  Giriş Yap
                </a>
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

                {/* Fotoğraf Ekleme (Sıfır Sunucu Yüklü WebP Canvas Sıkıştırma) */}
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

        {/* Sağ Sütun - Değerlendirmeler Listesi */}
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

                  <p className="text-slate-700 font-body text-xs sm:text-sm leading-relaxed whitespace-pre-line mb-4">
                    {rev.yorum}
                  </p>

                  {/* Fotoğraf Galerisi & Lightbox Tetikleyici */}
                  {rev.fotograflar && rev.fotograflar.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
