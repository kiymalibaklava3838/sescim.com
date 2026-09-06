'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, Save, X, Eye, EyeOff, Sparkles, Layers, ArrowRight, Check } from 'lucide-react'
import Image from 'next/image'
import { DEFAULT_INSPIRATION_SETS, InspirationSet } from '@/lib/ilham-setleri'

export default function AdminIlhamSetleri({ supabase }: { supabase: any }) {
  const [sets, setSets] = useState<InspirationSet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    baslik: '',
    alt_yazi: '',
    resim_url: '',
    link: '',
    sira: 1,
    aktif: true
  })

  useEffect(() => {
    loadSets()
  }, [])

  async function loadSets() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bannerlar')
        .select('*')
        .order('sira', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setSets(data || [])
    } catch (err) {
      console.error('İlham setleri yüklenemedi:', err)
    } finally {
      setLoading(false)
    }
  }

  // Varsayılan setleri tek tıkla veritabanına yükleme yardımcısı
  async function seedDefaults() {
    if (!confirm('Varsayılan 6 ilham setini veritabanına aktarmak istiyor musunuz?')) return
    setSaving(true)
    try {
      const itemsToInsert = DEFAULT_INSPIRATION_SETS.map(({ id, ...rest }) => rest)
      const { error } = await supabase.from('bannerlar').insert(itemsToInsert)
      if (error) throw error
      alert('Varsayılan setler başarıyla eklendi!')
      loadSets()
    } catch (err: any) {
      alert('Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.baslik.trim() || !formData.resim_url.trim()) {
      alert('Lütfen başlık ve görsel URL alanlarını doldurun.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const { error } = await supabase
          .from('bannerlar')
          .update({
            baslik: formData.baslik,
            alt_yazi: formData.alt_yazi,
            resim_url: formData.resim_url,
            link: formData.link || '/urunler',
            sira: Number(formData.sira) || 1,
            aktif: formData.aktif
          })
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('bannerlar')
          .insert([{
            baslik: formData.baslik,
            alt_yazi: formData.alt_yazi,
            resim_url: formData.resim_url,
            link: formData.link || '/urunler',
            sira: Number(formData.sira) || 1,
            aktif: formData.aktif
          }])

        if (error) throw error
      }

      resetForm()
      loadSets()
    } catch (err: any) {
      alert('Kaydedilemedi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item: InspirationSet) {
    setEditingId(item.id)
    setFormData({
      baslik: item.baslik,
      alt_yazi: item.alt_yazi || '',
      resim_url: item.resim_url,
      link: item.link || '',
      sira: item.sira || 1,
      aktif: item.aktif
    })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu ilham setini silmek istediğinize emin misiniz?')) return
    try {
      const { error } = await supabase.from('bannerlar').delete().eq('id', id)
      if (error) throw error
      setSets(sets.filter(s => s.id !== id))
    } catch (err: any) {
      alert('Silinemedi: ' + err.message)
    }
  }

  async function toggleActive(item: InspirationSet) {
    try {
      const { error } = await supabase
        .from('bannerlar')
        .update({ aktif: !item.aktif })
        .eq('id', item.id)

      if (error) throw error
      setSets(sets.map(s => s.id === item.id ? { ...s, aktif: !s.aktif } : s))
    } catch (err: any) {
      alert('Güncellenemedi: ' + err.message)
    }
  }

  function resetForm() {
    setFormData({
      baslik: '',
      alt_yazi: '',
      resim_url: '',
      link: '',
      sira: sets.length + 1,
      aktif: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-display font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Sparkles className="text-brand-red" size={22} />
            İlham Veren Setler Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Keşfet sayfasında kullanıcıyı tekil ürünler yerine paket çözümlere (Podcast, Ev Stüdyosu, Sahne vb.) yönlendiren vitrin kartları.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sets.length === 0 && (
            <button
              onClick={seedDefaults}
              disabled={saving}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <Layers size={14} /> Varsayılan 6 Seti Yükle
            </button>
          )}
          <button
            onClick={() => {
              resetForm()
              setShowForm(!showForm)
            }}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? 'Formu Kapat' : 'Yeni Set Ekle'}
          </button>
        </div>
      </div>

      {/* EKLE / DÜZENLE FORMU */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border-2 border-brand-red/20 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-display font-bold uppercase tracking-wider text-slate-800">
              {editingId ? 'Seti Düzenle' : 'Yeni İlham Seti Oluştur'}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Set Başlığı (Emoji ile başlayabilirsiniz) *
              </label>
              <input
                type="text"
                placeholder="Örn: 🎙️ Podcast'e Başla"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bileşenler / Alt Yazı (İçerdiği ekipmanlar)
              </label>
              <input
                type="text"
                placeholder="Örn: Mikrofon + Masa Kolu + Kulaklık + Ses Kartı"
                value={formData.alt_yazi}
                onChange={(e) => setFormData({ ...formData, alt_yazi: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Görsel URL *
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... veya /gorseller/set1.jpg"
                value={formData.resim_url}
                onChange={(e) => setFormData({ ...formData, resim_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hedef Link (&quot;Seti Gör →&quot; butonu nereye gidecek?)
              </label>
              <input
                type="text"
                placeholder="/urunler/studyo-ekipmanlari?q=podcast"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gösterim Sırası
              </label>
              <input
                type="number"
                value={formData.sira}
                onChange={(e) => setFormData({ ...formData, sira: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand-red"
                min="1"
              />
            </div>

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.aktif}
                  onChange={(e) => setFormData({ ...formData, aktif: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-red focus:ring-brand-red"
                />
                <span>Bu seti Keşfet sayfasında hemen yayına al</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Save size={14} /> {saving ? 'Kaydediliyor...' : editingId ? 'Değişiklikleri Kaydet' : 'Seti Oluştur'}
            </button>
          </div>
        </form>
      )}

      {/* LİSTE */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Yükleniyor...</div>
      ) : sets.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-4">
          <Sparkles size={40} className="mx-auto text-slate-300" />
          <div>
            <h3 className="text-base font-bold text-slate-700">Henüz İlham Seti Bulunmuyor</h3>
            <p className="text-xs text-slate-500 mt-1">
              Yukarıdaki butondan hemen yeni bir set ekleyebilir veya varsayılan 6 seti tek tıkla içeri aktarabilirsiniz.
            </p>
          </div>
          <button onClick={seedDefaults} className="btn-primary text-xs inline-flex items-center gap-1.5">
            <Layers size={14} /> Varsayılan Setleri Yükle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl border overflow-hidden transition-all shadow-xs flex flex-col justify-between ${
                item.aktif ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div className="relative h-44 w-full bg-slate-100">
                {item.resim_url && (
                  <Image
                    src={item.resim_url}
                    alt={item.baslik}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
                
                {/* Sıra & Durum Rozetleri */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                    #{item.sira}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                    item.aktif ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                  }`}>
                    {item.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-display font-bold text-base uppercase leading-tight drop-shadow-sm">
                    {item.baslik}
                  </h3>
                  {item.alt_yazi && (
                    <p className="text-[11px] text-slate-200 line-clamp-1 mt-0.5 opacity-90">
                      {item.alt_yazi}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                  {item.link}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(item)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title={item.aktif ? 'Pasife Al' : 'Aktifleştir'}
                  >
                    {item.aktif ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Düzenle"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
