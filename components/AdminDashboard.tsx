'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  Package,
  Clock,
  Download,
  Calendar,
  FileText,
  ShoppingBag,
  Percent,
} from 'lucide-react'

interface Siparis {
  id: string
  siparis_no: string
  ad_soyad: string
  telefon: string
  odeme_tipi: string
  toplam_tutar: number
  durum: string
  odeme_durumu: string
  dekont_url?: string
  created_at: string
  urunler: any[]
}

type TimeFilter = 'hepsi' | 'bugun' | 'bu_hafta' | 'bu_ay' | 'bu_yil'

const PIE_COLORS = ['#DA291C', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899']

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('bu_ay')
  const supabase = useRef(createClient()).current

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: sData } = await supabase
        .from('siparisler')
        .select('id, siparis_no, ad_soyad, telefon, odeme_tipi, toplam_tutar, durum, odeme_durumu, notlar, created_at')
        .order('created_at', { ascending: false })
        .limit(200)

      if (sData && sData.length > 0) {
        const orderIds = sData.map((s: any) => s.id)
        const { data: kalemler } = await supabase
          .from('siparis_kalemleri')
          .select('siparis_id, urun_adi, adet, birim_fiyat')
          .in('siparis_id', orderIds)

        const ordersWithItems = sData.map((s: any) => ({
          ...s,
          urunler: (kalemler || [])
            .filter((k: any) => k.siparis_id === s.id)
            .map((k: any) => ({ ad: k.urun_adi, adet: k.adet, fiyat: k.birim_fiyat }))
        }))
        setSiparisler(ordersWithItems as any)
      } else {
        setSiparisler([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Tarih Filtresi Mantığı
  const filteredSiparisler = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    return siparisler.filter((s) => {
      if (timeFilter === 'hepsi') return true
      const d = new Date(s.created_at)
      if (timeFilter === 'bugun') return d.toDateString() === now.toDateString()
      if (timeFilter === 'bu_hafta') return d >= startOfWeek
      if (timeFilter === 'bu_ay') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (timeFilter === 'bu_yil') return d.getFullYear() === now.getFullYear()
      return true
    })
  }, [siparisler, timeFilter])

  // İstatistikler & KPIs
  const stats = useMemo(() => {
    const basariliSiparisler = filteredSiparisler.filter(
      (s) => s.odeme_durumu === 'odendi' || s.durum === 'teslim_edildi' || s.durum === 'tamamlandi'
    )
    const gerceklesenCiro = basariliSiparisler.reduce((sum, s) => sum + Number(s.toplam_tutar || 0), 0)
    const ortalamaSepet = basariliSiparisler.length > 0 ? Math.round(gerceklesenCiro / basariliSiparisler.length) : 0
    const bekleyenSayisi = filteredSiparisler.filter((s) => s.durum === 'beklemede').length
    const kargoBekleyenler = filteredSiparisler.filter((s) => s.durum === 'onaylandi' || s.durum === 'hazirlaniyor').length
    const dekontBekleyenler = filteredSiparisler.filter((s) => s.dekont_url && s.odeme_durumu !== 'odendi').length
    const basariOrani = filteredSiparisler.length > 0 ? Math.round((basariliSiparisler.length / filteredSiparisler.length) * 100) : 0

    return {
      ciro: gerceklesenCiro,
      toplamSiparis: filteredSiparisler.length,
      ortalamaSepet,
      bekleyen: bekleyenSayisi,
      kargoBekleyen: kargoBekleyenler,
      dekontBekleyen: dekontBekleyenler,
      basariOrani,
    }
  }, [filteredSiparisler])

  // En Çok Satan Ürünler (Top 5)
  const topProducts = useMemo(() => {
    const urunMap: Record<string, { ad: string; adet: number; ciro: number }> = {}

    filteredSiparisler
      .filter((s) => s.odeme_durumu === 'odendi' || s.durum === 'teslim_edildi' || s.durum === 'tamamlandi')
      .forEach((s) => {
        if (Array.isArray(s.urunler)) {
          s.urunler.forEach((u) => {
            const id = u.urun_id || u.ad
            if (!urunMap[id]) urunMap[id] = { ad: u.ad, adet: 0, ciro: 0 }
            urunMap[id].adet += u.adet || 1
            urunMap[id].ciro += (u.fiyat || 0) * (u.adet || 1)
          })
        }
      })

    return Object.values(urunMap)
      .sort((a, b) => b.adet - a.adet)
      .slice(0, 5)
  }, [filteredSiparisler])

  // Aylık Ciro Grafiği (Son 6 Ay Trendi)
  const chartData = useMemo(() => {
    const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const bugun = new Date()
    const grafik = []
    for (let i = 5; i >= 0; i--) {
      const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1)
      const ayAdi = aylar[hedefTarih.getMonth()]
      const oAydakiSiparisler = siparisler.filter((s) => {
        const d = new Date(s.created_at)
        return (
          d.getMonth() === hedefTarih.getMonth() &&
          d.getFullYear() === hedefTarih.getFullYear() &&
          (s.odeme_durumu === 'odendi' || s.durum === 'teslim_edildi' || s.durum === 'tamamlandi')
        )
      })
      const ayCiro = oAydakiSiparisler.reduce((sum, s) => sum + Number(s.toplam_tutar || 0), 0)
      grafik.push({ isim: ayAdi, ciro: ayCiro, siparisSayisi: oAydakiSiparisler.length })
    }
    return grafik
  }, [siparisler])

  const exportToExcel = async () => {
    const data = filteredSiparisler.map((s) => ({
      'Sipariş No': s.siparis_no,
      'Müşteri Adı': s.ad_soyad,
      Telefon: s.telefon,
      Tarih: new Date(s.created_at).toLocaleString('tr-TR'),
      'Ödeme Tipi': s.odeme_tipi === 'kart' ? 'Kredi Kartı' : 'Havale/EFT',
      Durum: s.durum,
      'Ödeme Durumu': s.odeme_durumu,
      'Toplam Tutar (₺)': s.toplam_tutar,
    }))

    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Siparisler')
    XLSX.writeFile(wb, `Satis_Raporu_${timeFilter}.xlsx`)
  }

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Kontrol Çubuğu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-slate-400" />
          <span className="font-display font-bold text-xs uppercase tracking-wider text-slate-500">Dönem:</span>
          <select
            className="bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs font-display font-bold uppercase tracking-wider px-3 py-2 outline-none focus:border-brand-red"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
          >
            <option value="bugun">Bugün</option>
            <option value="bu_hafta">Bu Hafta</option>
            <option value="bu_ay">Bu Ay</option>
            <option value="bu_yil">Bu Yıl</option>
            <option value="hepsi">Tüm Zamanlar</option>
          </select>
        </div>

        <button
          type="button"
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold uppercase tracking-wider rounded-lg transition-colors shadow-sm"
        >
          <Download size={14} /> Excel Rapor İndir
        </button>
      </div>

      {/* Üst Kartlar & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ciro */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm border-l-4 border-l-emerald-500">
          <TrendingUp size={72} className="absolute -right-3 -bottom-3 text-emerald-500/10 pointer-events-none" />
          <div className="text-slate-500 mb-1.5 font-display font-bold text-xs tracking-wider uppercase">
            Net Ciro
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            {stats.ciro.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {stats.toplamSiparis} siparişten gerçekleşen
          </div>
        </div>

        {/* Ortalama Sepet (AOV) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm border-l-4 border-l-blue-500">
          <ShoppingBag size={72} className="absolute -right-3 -bottom-3 text-blue-500/10 pointer-events-none" />
          <div className="text-slate-500 mb-1.5 font-display font-bold text-xs tracking-wider uppercase">
            Ortalama Sepet (AOV)
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            {stats.ortalamaSepet.toLocaleString('tr-TR')} ₺
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            Dönüşüm Oranı: %{stats.basariOrani}
          </div>
        </div>

        {/* Bekleyen & Kargo */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm border-l-4 border-l-brand-red">
          <Clock size={72} className="absolute -right-3 -bottom-3 text-brand-red/10 pointer-events-none" />
          <div className="text-slate-500 mb-1.5 font-display font-bold text-xs tracking-wider uppercase">
            Bekleyen Sipariş
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            {stats.bekleyen}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {stats.kargoBekleyen} sipariş hazırlanıyor
          </div>
        </div>

        {/* Dekont Onayı */}
        <div
          className={`bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-sm border-l-4 ${
            stats.dekontBekleyen > 0 ? 'border-l-amber-500' : 'border-l-slate-300'
          }`}
        >
          <FileText size={72} className="absolute -right-3 -bottom-3 text-amber-500/10 pointer-events-none" />
          <div className="text-slate-500 mb-1.5 font-display font-bold text-xs tracking-wider uppercase">
            Dekont Bekleyen
          </div>
          <div className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            {stats.dekontBekleyen}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            {stats.dekontBekleyen > 0 ? (
              <span className="text-amber-600 font-semibold animate-pulse">Onay Bekliyor</span>
            ) : (
              'İncelenecek dekont yok'
            )}
          </div>
        </div>
      </div>

      {/* Grafikler Alanı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sol Sütun: Modern Ciro Trendi (AreaChart with Gradient) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-red" />
              <h2 className="font-display font-black text-sm tracking-wider uppercase text-slate-900">
                Son 6 Aylık Ciro Trendi (₺)
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-400">Genel Akış</span>
          </div>

          <div className="h-[300px] w-full min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DA291C" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#DA291C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="isim" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  }}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('tr-TR')} ₺`, 'Ciro']}
                />
                <Area
                  type="monotone"
                  dataKey="ciro"
                  stroke="#DA291C"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCiro)"
                  dot={{ r: 4, fill: '#ffffff', stroke: '#DA291C', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sağ Sütun: En Çok Satan Ürünler */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="font-display font-black text-sm tracking-wider uppercase text-slate-900">
                En Çok Satan Ürünler (Top 5)
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-400">Adet Bazlı</span>
          </div>

          {topProducts.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm font-body">
              Seçili dönemde satış verisi bulunamadı.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 h-[300px] items-center">
              <div className="h-[250px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      dataKey="adet"
                      nameKey="ad"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      stroke="#ffffff"
                      strokeWidth={3}
                      paddingAngle={4}
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      }}
                      itemStyle={{ color: '#ffffff', fontSize: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                      formatter={(val: any) => [`${val} Adet Satıldı`, 'Miktar']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 flex flex-col justify-center">
                {topProducts.map((prod, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-xs text-slate-800 truncate" title={prod.ad}>
                        {prod.ad}
                      </div>
                      <div className="font-body text-slate-500 text-[11px]">
                        <strong>{prod.adet} adet</strong> • {prod.ciro.toLocaleString('tr-TR')} ₺
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
