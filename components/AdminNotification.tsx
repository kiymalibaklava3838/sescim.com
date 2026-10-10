'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Bell, X, ShoppingBag } from 'lucide-react'

interface Bildirim {
  id: string
  siparis_no: string
  ad_soyad: string
  toplam_tutar: number
  created_at: string
}

export default function AdminNotification() {
  const [bildirimler, setBildirimler] = useState<Bildirim[]>([])
  const [izinVerildi, setIzinVerildi] = useState(false)
  const supabase = useRef(createClient()).current
  const audioCtx = useRef<AudioContext | null>(null)
  const ilkYukleme = useRef(true)

  // Bildirim sesi — Web Audio API ile sentezlenmiş, dosya gerektirmez
  const playSound = () => {
    try {
      if (!audioCtx.current) {
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtx.current
      const now = ctx.currentTime

      // Çift bip sesi
      ;[0, 0.2].forEach(delay => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now + delay)
        osc.frequency.exponentialRampToValueAtTime(660, now + delay + 0.15)
        gain.gain.setValueAtTime(0.3, now + delay)
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15)
        osc.start(now + delay)
        osc.stop(now + delay + 0.15)
      })
    } catch {}
  }

  // Tarayıcı bildirimi
  const showBrowserNotification = (siparis: Bildirim) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    new Notification('🔔 Yeni Sipariş — sescim.com', {
      body: `${siparis.ad_soyad} • ${siparis.toplam_tutar.toLocaleString('tr-TR')} ₺ • ${siparis.siparis_no}`,
      icon: '/favicon.ico',
      tag: siparis.id,
    })
  }

  const seenOrderIds = useRef<Set<string>>(new Set())

  const isteBildirimIzni = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setIzinVerildi(perm === 'granted')
  }

  useEffect(() => {
    // İzin durumunu kontrol et
    if ('Notification' in window) {
      setIzinVerildi(Notification.permission === 'granted')
    }

    // İlk yüklemede mevcut sipariş ID'lerini hafızaya al ki eski siparişlere ses çalmasın
    supabase
      .from('siparisler')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }: any) => {
        if (data) {
          data.forEach((d: any) => seenOrderIds.current.add(d.id))
        }
        ilkYukleme.current = false
      })

    // Realtime subscription — SADECE ödemesi tamamlanmış gerçek siparişlerde tetiklenir
    const channel = supabase
      .channel('admin-siparisler')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'siparisler' },
        (payload: any) => {
          if (ilkYukleme.current) return

          const yeni = payload.new
          if (!yeni || !yeni.id) return

          // Ödeme bekleyen (kullanıcının henüz satın almadığı) veya ödeme hatası alan taslaklarda ASLA bildirim çalma!
          const isOdendi = (yeni.odeme_durumu === 'odendi' || yeni.durum === 'onaylandi') && yeni.odeme_durumu !== 'odeme_hatasi' && yeni.durum !== 'iptal'
          if (!isOdendi) return

          // Bu sipariş için zaten bildirim gösterildiyse (durum güncellemesi, kargo girişi vs.) tekrar çalma!
          if (seenOrderIds.current.has(yeni.id)) {
            return
          }

          seenOrderIds.current.add(yeni.id)
          setBildirimler(prev => [yeni as Bildirim, ...prev.filter(b => b.id !== yeni.id)].slice(0, 5))
          playSound()
          showBrowserNotification(yeni as Bildirim)
        }
      )
      .subscribe()

    // Realtime bağlantı kopması ihtimaline karşı yedek polling kontrolü
    const pollInterval = setInterval(async () => {
      if (ilkYukleme.current) return
      try {
        const { data: latest } = await supabase
          .from('siparisler')
          .select('id, siparis_no, ad_soyad, toplam_tutar, created_at, odeme_durumu, durum')
          .in('durum', ['onaylandi', 'hazirlaniyor'])
          .neq('odeme_durumu', 'odeme_hatasi')
          .order('created_at', { ascending: false })
          .limit(5)

        if (latest) {
          for (const s of latest) {
            if (!seenOrderIds.current.has(s.id)) {
              seenOrderIds.current.add(s.id)
              setBildirimler(prev => [s as Bildirim, ...prev.filter(b => b.id !== s.id)].slice(0, 5))
              playSound()
              showBrowserNotification(s as Bildirim)
            }
          }
        }
      } catch {}
    }, 25000)

    // 2 saniye sonra ilk yükleme bayrağını kaldır
    const t = setTimeout(() => { ilkYukleme.current = false }, 2000)

    return () => {
      clearTimeout(t)
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const kapat = (id: string) => setBildirimler(prev => prev.filter(b => b.id !== id))

  return (
    <>
      {/* İzin butonu — sadece izin verilmemişse göster */}
      {!izinVerildi && (
        <button
          onClick={isteBildirimIzni}
          className="flex items-center gap-2 text-white/20 hover:text-white/50 text-xs font-body transition-colors"
          title="Yeni sipariş bildirimlerini etkinleştir"
        >
          <Bell size={14} />
          <span className="hidden sm:inline">Bildirimleri Etkinleştir</span>
        </button>
      )}
      {izinVerildi && (
        <div className="flex items-center gap-1 text-green-400/50 text-xs">
          <Bell size={12} />
          <span className="hidden sm:inline">Bildirimler Açık</span>
        </div>
      )}

      {/* Toast bildirimleri */}
      <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
        {bildirimler.map(b => (
          <div
            key={b.id}
            className="bg-[#141414] border border-brand-red/30 shadow-2xl shadow-black/50 p-4 w-72 pointer-events-auto animate-slide-left"
            style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-brand-red/10 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={14} className="text-brand-red" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-black text-xs uppercase text-white tracking-wide">
                  Yeni Sipariş!
                </div>
                <div className="font-body text-white/60 text-xs mt-0.5 truncate">{b.ad_soyad}</div>
                <div className="font-display font-black text-sm text-brand-red mt-1">
                  {b.toplam_tutar?.toLocaleString('tr-TR')} ₺
                </div>
                <div className="font-body text-white/25 text-xs">{b.siparis_no}</div>
              </div>
              <button
                onClick={() => kapat(b.id)}
                className="text-white/20 hover:text-white transition-colors flex-shrink-0 mt-0.5"
              >
                <X size={13} />
              </button>
            </div>
            {/* Otomatik kapanma çubuğu */}
            <div className="mt-3 h-0.5 bg-white/5 overflow-hidden">
              <div
                className="h-full bg-brand-red"
                style={{ animation: 'shrink 8s linear forwards' }}
              />
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  )
}