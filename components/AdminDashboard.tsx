'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Package, Users, Clock, Download, Calendar, FileText } from 'lucide-react'

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

const COLORS = ['#DA291C', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6']

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [siparisler, setSiparisler] = useState<Siparis[]>([])
  const [bayiCount, setBayiCount] = useState(0)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('bu_ay')
  const supabase = useRef(createClient()).current

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [{ data: sData }, { count: bCount }] = await Promise.all([
        supabase
          .from('siparisler')
          .select('id, toplam_tutar, durum, odeme_durumu, dekont_url, created_at, urunler')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('bayiler').select('*', { count: 'exact', head: true }).eq('onaylandi', true)
      ])
      setSiparisler(sData || [])
      setBayiCount(bCount || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  // Tarih Filtresi Mantığı
  const filteredSiparisler = useMemo(() => {
    const now = new Date()

    // Bu hafta başlangıcını bir kere hesapla (Pazartesi bazlı)
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    return siparisler.filter(s => {
      if (timeFilter === 'hepsi') return true
      const d = new Date(s.created_at)
      if (timeFilter === 'bugun') return d.toDateString() === now.toDateString()
      if (timeFilter === 'bu_hafta') return d >= startOfWeek
      if (timeFilter === 'bu_ay') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      if (timeFilter === 'bu_yil') return d.getFullYear() === now.getFullYear()
      return true
    })
  }, [siparisler, timeFilter])

  // İstatistikler (Filtrelenmiş siparişlere göre)
  const stats = useMemo(() => {
    const gerceklesenCiro = filteredSiparisler
      .filter(s => s.odeme_durumu === 'odendi' || s.durum === 'teslim_edildi')
      .reduce((sum, s) => sum + Number(s.toplam_tutar), 0)

    const bekleyenSayisi = filteredSiparisler.filter(s => s.durum === 'beklemede').length
    const kargoBekleyenler = filteredSiparisler.filter(s => s.durum === 'onaylandi').length
    const dekontBekleyenler = filteredSiparisler.filter(s => s.dekont_url && s.odeme_durumu !== 'odendi').length

    return { ciro: gerceklesenCiro, bekleyen: bekleyenSayisi, kargoBekleyen: kargoBekleyenler, bayiSayisi: bayiCount, dekontBekleyen: dekontBekleyenler }
  }, [filteredSiparisler, bayiCount])

  // En Çok Satan Ürünler (Top 5)
  const topProducts = useMemo(() => {
    const urunMap: Record<string, { ad: string, adet: number, ciro: number }> = {}

    filteredSiparisler
      .filter(s => s.odeme_durumu === 'odendi' || s.durum === 'teslim_edildi')
      .forEach(s => {
        if (Array.isArray(s.urunler)) {
          s.urunler.forEach(u => {
            const id = u.urun_id || u.ad
            if (!urunMap[id]) urunMap[id] = { ad: u.ad, adet: 0, ciro: 0 }
            urunMap[id].adet += u.adet
            urunMap[id].ciro += (u.fiyat * u.adet)
          })
        }
      })

    return Object.values(urunMap)
      .sort((a, b) => b.adet - a.adet)
      .slice(0, 5)
  }, [filteredSiparisler])

  // Aylık Ciro Grafiği (Son 6 Ay - Genel trend olduğu için filtreye bağlı değil)
  const chartData = useMemo(() => {
    const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
    const bugun = new Date()
    const grafik = []
    for (let i = 5; i >= 0; i--) {
      const hedefTarih = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1)
      const ayAdi = aylar[hedefTarih.getMonth()]
      const oAydakiSiparisler = siparisler.filter(s => {
        const d = new Date(s.created_at)
        return d.getMonth() === hedefTarih.getMonth() && d.getFullYear() === hedefTarih.getFullYear() && (s.odeme_durumu === 'odendi' || s.durum === 'teslim_edildi')
      })
      grafik.push({ isim: ayAdi, ciro: oAydakiSiparisler.reduce((sum, s) => sum + Number(s.toplam_tutar), 0) })
    }
    return grafik
  }, [siparisler])

  const exportToExcel = async () => {
    const data = filteredSiparisler.map(s => ({
      'Sipariş No': s.siparis_no,
      'Müşteri Adı': s.ad_soyad,
      'Telefon': s.telefon,
      'Tarih': new Date(s.created_at).toLocaleString('tr-TR'),
      'Ödeme Tipi': s.odeme_tipi,
      'Durum': s.durum,
      'Toplam Tutar (₺)': s.toplam_tutar
    }))

    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(data)

    // Sütun genişlikleri ayarı
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Siparisler')
    XLSX.writeFile(wb, `Satis_Raporu_${timeFilter}.xlsx`)
  }

  if (loading) {
    return <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-t-brand-red rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-8 pb-10">

      {/* Kontrol Çubuğu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-slate-900/40" />
          <select
            className="bg-transparent border border-slate-300 text-slate-900 text-sm font-display uppercase tracking-widest p-2 outline-none focus:border-brand-red"
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
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-slate-900 text-xs font-display font-bold uppercase tracking-widest transition-colors"
        >
          <Download size={14} /> Rapor İndir (Excel)
        </button>
      </div>

      {/* Üst Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-6 border-l-2 border-l-green-500 relative overflow-hidden group">
          <TrendingUp size={80} className="absolute -right-4 -bottom-4 text-green-500/5 group-hover:scale-110 transition-transform" />
          <div className="text-slate-900/40 mb-2 font-display font-semibold text-xs tracking-widest uppercase relative z-10">Toplam Ciro</div>
          <div className="font-display font-black text-3xl text-slate-900 relative z-10">{stats.ciro.toLocaleString('tr-TR')} ₺</div>
        </div>

        <div className="bg-white border border-slate-200 p-6 border-l-2 border-l-brand-red relative overflow-hidden group">
          <Clock size={80} className="absolute -right-4 -bottom-4 text-brand-red/5 group-hover:scale-110 transition-transform" />
          <div className="text-slate-900/40 mb-2 font-display font-semibold text-xs tracking-widest uppercase relative z-10">Bekleyen Sipariş</div>
          <div className="font-display font-black text-3xl text-slate-900 relative z-10">{stats.bekleyen}</div>
        </div>

        <div className="bg-white border border-slate-200 p-6 border-l-2 border-l-blue-500 relative overflow-hidden group">
          <Package size={80} className="absolute -right-4 -bottom-4 text-blue-500/5 group-hover:scale-110 transition-transform" />
          <div className="text-slate-900/40 mb-2 font-display font-semibold text-xs tracking-widest uppercase relative z-10">Kargo Bekleyen</div>
          <div className="font-display font-black text-3xl text-slate-900 relative z-10">{stats.kargoBekleyen}</div>
        </div>

        <div className="bg-white border border-slate-200 p-6 border-l-2 border-l-yellow-500 relative overflow-hidden group">
          <Users size={80} className="absolute -right-4 -bottom-4 text-yellow-500/5 group-hover:scale-110 transition-transform" />
          <div className="text-slate-900/40 mb-2 font-display font-semibold text-xs tracking-widest uppercase relative z-10">Onaylı Bayiler</div>
          <div className="font-display font-black text-3xl text-slate-900 relative z-10">{stats.bayiSayisi}</div>
        </div>

        <div className={`bg-white border border-slate-200 p-6 border-l-2 relative overflow-hidden group ${stats.dekontBekleyen > 0 ? 'border-l-orange-500' : 'border-l-white/10'}`}>
          <FileText size={80} className="absolute -right-4 -bottom-4 text-orange-500/5 group-hover:scale-110 transition-transform" />
          <div className="text-slate-900/40 mb-2 font-display font-semibold text-xs tracking-widest uppercase relative z-10">Dekont Onayı Bekleyen</div>
          <div className="font-display font-black text-3xl text-slate-900 relative z-10">
            {stats.dekontBekleyen}
            {stats.dekontBekleyen > 0 && <span className="ml-2 text-xs font-body text-orange-500 animate-pulse">Onay Gerekli</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Sol Sütun: Grafik */}
        <div className="bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-brand-red" />
            <h2 className="font-display font-bold text-sm tracking-[0.2em] uppercase text-slate-900">Son 6 Aylık Ciro (₺)</h2>
          </div>
          <div className="h-[300px] w-full min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="isim" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0' }}
                  itemStyle={{ color: '#DA291C', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString('tr-TR')} ₺`, 'Ciro']}
                />
                <Line type="monotone" dataKey="ciro" stroke="#DA291C" strokeWidth={3} dot={{ r: 4, fill: '#f8fafc', stroke: '#DA291C', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sağ Sütun: En Çok Satanlar */}
        <div className="bg-white border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-brand-red" />
            <h2 className="font-display font-bold text-sm tracking-[0.2em] uppercase text-slate-900">En Çok Satan Ürünler</h2>
          </div>

          {topProducts.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-900/30 text-sm font-body">Bu tarihte veri bulunamadı.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6 h-[300px]">
              <div className="h-[250px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topProducts}
                      dataKey="adet"
                      nameKey="ad"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      stroke="#141414"
                      strokeWidth={4}
                      paddingAngle={5}
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0', color: 'white' }}
                      itemStyle={{ color: 'white', fontSize: '12px' }}
                      formatter={(value: any) => [`${value} Adet`, 'Satış']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4 flex flex-col justify-center">
                {topProducts.map((prod, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-xs text-slate-900 truncate" title={prod.ad}>{prod.ad}</div>
                      <div className="font-body text-slate-900/40 text-[10px]">{prod.adet} satıldı • {prod.ciro.toLocaleString('tr-TR')} ₺</div>
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
