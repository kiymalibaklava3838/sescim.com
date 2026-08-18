'use client'

import { useState, useEffect } from 'react'
import { Star, MessageSquare, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface Review {
  id: string
  puan: number
  baslik?: string
  yorum: string
  created_at: string
  user_id: string
}

interface Props {
  urun_id: string
}

export default function ProductReviews({ urun_id }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [baslik, setBaslik] = useState('')
  const [yorum, setYorum] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => setSession(res.data.session))
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
      setReviews(data || [])
    } catch (e) {
      console.error('Yorumlar yüklenirken hata:', e)
    } finally {
      setLoading(false)
    }
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
      const { error: insErr } = await supabase
        .from('urun_yorumlari')
        .insert({
          urun_id,
          user_id: session.user.id,
          puan: rating,
          baslik: baslik.trim() || null,
          yorum: yorum.trim(),
          onaylandi: false // Admin onaylayacak
        })

      if (insErr) throw insErr

      setSubmitted(true)
      setBaslik('')
      setYorum('')
      setRating(5)
    } catch (e: any) {
      setError(e.message || 'Yorum gönderilirken bir hata oluştu.')
    } finally {
      setSubmitting(false)
    }
  }

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((a, b) => a + b.puan, 0) / reviews.length).toFixed(1) 
    : 0

  return (
    <div className="mt-16 pt-12 border-t border-slate-200" id="yorumlar">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-px bg-brand-red" />
        <span className="font-display font-semibold text-xs tracking-[0.3em] uppercase text-brand-red">Değerlendirmeler</span>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        {/* Sol Taraf - Yorum Ekleme */}
        <div className="md:col-span-1">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sticky top-24">
            <h3 className="font-display font-black text-xl text-slate-800 mb-2">Ürünü Değerlendir</h3>
            <p className="text-sm font-body text-slate-500 mb-6">Deneyimlerinizi diğer müşterilerimizle paylaşın.</p>
            
            {submitted ? (
              <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl text-sm font-medium">
                Değerlendirmeniz başarıyla alındı. Moderatör onayından sonra yayınlanacaktır. Teşekkür ederiz!
              </div>
            ) : !session ? (
              <div className="bg-blue-50 text-blue-700 border border-blue-200 p-4 rounded-xl text-sm flex flex-col gap-3">
                <span>Yorum yapabilmek için lütfen giriş yapın.</span>
                <a href="/uye/giris" className="btn-primary py-2 text-xs justify-center w-full">Giriş Yap</a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Puanınız</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        className={`p-1 transition-colors ${rating >= s ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-200'}`}
                      >
                        <Star size={24} className={rating >= s ? 'fill-yellow-400' : ''} />
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Başlık (İsteğe Bağlı)</label>
                  <input 
                    type="text" 
                    value={baslik}
                    onChange={e => setBaslik(e.target.value)}
                    className="input-base w-full"
                    placeholder="Örn: Harika bir ürün"
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Yorumunuz *</label>
                  <textarea 
                    required
                    rows={4}
                    value={yorum}
                    onChange={e => setYorum(e.target.value)}
                    className="input-base w-full resize-none"
                    placeholder="Ürün hakkındaki düşüncelerinizi detaylıca paylaşın..."
                  />
                </div>

                {error && <div className="text-red-500 text-xs font-medium">{error}</div>}

                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Gönder'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sağ Taraf - Yorum Listesi */}
        <div className="md:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 size={32} className="animate-spin text-slate-300" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={24} className="text-slate-300" />
              </div>
              <h4 className="font-display font-bold text-lg text-slate-800 mb-1">Henüz Yorum Yok</h4>
              <p className="font-body text-slate-500 text-sm">Bu ürüne ilk yorumu siz yapın!</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="text-5xl font-display font-black text-slate-900">{avgRating}</div>
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={16} className={s <= Math.round(Number(avgRating)) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
                    ))}
                  </div>
                  <div className="text-sm font-body text-slate-500">{reviews.length} Değerlendirme</div>
                </div>
              </div>

              {reviews.map((rev) => (
                <div key={rev.id} className="border-b border-slate-100 pb-6 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= rev.puan ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
                        ))}
                      </div>
                      {rev.baslik && <h4 className="font-display font-bold text-slate-800">{rev.baslik}</h4>}
                    </div>
                    <span className="text-xs text-slate-400 font-body">{new Date(rev.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <p className="text-slate-600 font-body text-sm leading-relaxed whitespace-pre-line">{rev.yorum}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
