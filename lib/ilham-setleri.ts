import { createServerSupabaseClient } from './supabase-server'

export interface InspirationSet {
  id: string
  baslik: string
  alt_yazi: string | null
  resim_url: string
  link: string
  aktif: boolean
  sira: number
  created_at?: string
}

// Varsayılan İlham Setleri (Veritabanında henüz set yoksa ilk açılışta zengin görünüm sağlar)
export const DEFAULT_INSPIRATION_SETS: InspirationSet[] = [
  {
    id: 'default-1',
    baslik: "🎙️ Podcast'e Başla",
    alt_yazi: 'Mikrofon + Masa Kolu + Kulaklık + Ses Kartı',
    resim_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=800',
    link: '/urunler/studyo-ekipmanlari?q=podcast',
    aktif: true,
    sira: 1
  },
  {
    id: 'default-2',
    baslik: '🎚️ Ev Stüdyonu Kur',
    alt_yazi: 'Referans Monitörü + Ses Kartı + Kondenser Mikrofon',
    resim_url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800',
    link: '/urunler/studyo-ekipmanlari',
    aktif: true,
    sira: 2
  },
  {
    id: 'default-3',
    baslik: '🎧 Referans Sistemini Kur',
    alt_yazi: 'Stüdyo Monitörü + Akustik İzolasyon + Monitör Kulaklığı',
    resim_url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800',
    link: '/urunler/kulaklik-monitor',
    aktif: true,
    sira: 3
  },
  {
    id: 'default-4',
    baslik: '🎤 Sahneye Çık',
    alt_yazi: 'Kablosuz El Mikrofonu + Mikser + Aktif Kule Hoparlör',
    resim_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800',
    link: '/urunler/ses-sistemleri',
    aktif: true,
    sira: 4
  },
  {
    id: 'default-5',
    baslik: '🎛️ DJ Performans Seti',
    alt_yazi: 'DJ Kontrol Ünitesi + Profesyonel Kulaklık + DJ Monitörü',
    resim_url: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?q=80&w=800',
    link: '/urunler/dj-ekipmanlari',
    aktif: true,
    sira: 5
  },
  {
    id: 'default-6',
    baslik: '🏛️ Konferans & Toplantı',
    alt_yazi: 'Delege Kürsü Mikrofonu + Bölge Amplifikatörü + Tavan Hoparlörü',
    resim_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800',
    link: '/urunler/ses-sistemleri',
    aktif: true,
    sira: 6
  }
]

export async function getActiveInspirationSets(): Promise<InspirationSet[]> {
  try {
    const supabase = await createServerSupabaseClient()
    if (!supabase) return DEFAULT_INSPIRATION_SETS

    const { data, error } = await supabase
      .from('bannerlar')
      .select('id, baslik, alt_yazi, resim_url, link, aktif, sira, created_at')
      .eq('aktif', true)
      .order('sira', { ascending: true })
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return DEFAULT_INSPIRATION_SETS
    }

    return data as InspirationSet[]
  } catch (err) {
    console.error('Failed to get inspiration sets:', err)
    return DEFAULT_INSPIRATION_SETS
  }
}
