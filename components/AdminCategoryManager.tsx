'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { ChevronRight, Folder, FolderOpen, Tag, Plus, Trash2, Edit2, X, Check, Layers, ArrowRight, RefreshCw } from 'lucide-react'
import { HIERARCHY_DATA } from '@/lib/categories'

interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
}

export default function AdminCategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [formData, setFormData] = useState({ name: '', slug: '', parent_id: '' as string | null })
  const [saving, setSaving] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [activeTab, setActiveTab] = useState<number>(0) // 0: Ana, 1: Alt, 2: Dal

  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    const { data } = await supabase.from('categories').select('id, name, slug, parent_id').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  const slugify = (text: string) => {
    const trMap: { [key: string]: string } = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' }
    return text.toLowerCase()
      .replace(/[çğışüö]/g, (m) => trMap[m])
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const handleOpenModal = (cat: Category | null = null, parentId: string | null = null) => {
    if (cat) {
      setEditingCat(cat)
      setFormData({ name: cat.name, slug: cat.slug, parent_id: cat.parent_id })
    } else {
      setEditingCat(null)
      setFormData({ name: '', slug: '', parent_id: parentId })
    }
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.slug) return
    setSaving(true)
    
    try {
      if (editingCat) {
        await supabase.from('categories').update({
          name: formData.name,
          slug: formData.slug,
          parent_id: formData.parent_id || null
        }).eq('id', editingCat.id)
      } else {
        await supabase.from('categories').insert([{
          name: formData.name,
          slug: formData.slug,
          parent_id: formData.parent_id || null
        }])
      }
      await loadCategories()
      setModalOpen(false)
    } catch (err) {
      console.error('Kategori kaydedilemedi:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi ve varsa alt kategorilerini silmek istediğinize emin misiniz?')) return
    await supabase.from('categories').delete().eq('id', id)
    loadCategories()
  }

  const handleMigrate = async () => {
    if (!confirm('Statik dosyadaki tüm kategoriler veritabanına aktarılacak. Onaylıyor musunuz?')) return
    setMigrating(true)
    try {
      const migrateNode = async (nodes: any[], parentId: string | null = null) => {
        for (const node of nodes) {
          const { data, error } = await supabase.from('categories').insert([{
            name: node.name,
            slug: node.slug,
            parent_id: parentId
          }]).select().single()
          
          if (data && node.children) {
            await migrateNode(node.children, data.id)
          }
        }
      }
      await migrateNode(HIERARCHY_DATA)
      await loadCategories()
      alert('Aktarım başarıyla tamamlandı!')
    } catch (err) {
      console.error('Migration hatası:', err)
      alert('Aktarım sırasında bir hata oluştu.')
    } finally {
      setMigrating(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const renderTree = (parentId: string | null = null, level: number = 0) => {
    const children = categories.filter(c => c.parent_id === parentId)
    if (children.length === 0) return null

    return (
      <div className={`${level > 0 ? 'ml-6 border-l border-white/5 pl-4' : ''} space-y-1 mt-1`}>
        {children.map(cat => {
          const isExpanded = expanded.includes(cat.id)
          const hasChildren = categories.some(c => c.parent_id === cat.id)

          return (
            <div key={cat.id} className="group">
              <div className={`flex items-center gap-3 py-2 px-3 transition-colors rounded-sm ${level === 0 ? 'bg-white/[0.02] border border-white/5' : 'hover:bg-white/[0.03]'}`}>
                <button 
                  onClick={() => toggleExpand(cat.id)}
                  disabled={!hasChildren}
                  className={`p-1 hover:bg-white/10 rounded transition-colors ${!hasChildren ? 'opacity-0 cursor-default' : 'opacity-100'}`}
                >
                  <ChevronRight size={14} className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                
                {level === 0 ? <Layers size={16} className="text-brand-red" /> : 
                 level === 1 ? <Folder size={16} className="text-white/40" /> : 
                 <Tag size={14} className="text-white/20" />}
                
                <div className="flex-1">
                  <span className={`text-sm font-display tracking-wide ${level === 0 ? 'font-bold uppercase text-white' : 'text-white/70'}`}>
                    {cat.name}
                  </span>
                  <span className="ml-3 text-[10px] font-body text-white/20 opacity-0 group-hover:opacity-100 transition-opacity italic">
                    /{cat.slug}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {level < 2 && (
                    <button onClick={() => handleOpenModal(null, cat.id)} className="p-1.5 hover:text-green-400 text-white/30 transition-colors flex items-center gap-1 bg-white/5 rounded px-2" title="Alt Kategori Ekle">
                      <Plus size={12} /> <span className="text-[9px] uppercase font-bold tracking-tighter">Alt</span>
                    </button>
                  )}
                  <button onClick={() => handleOpenModal(cat)} className="p-1.5 hover:text-white text-white/30 transition-colors" title="Düzenle">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:text-brand-red text-white/30 transition-colors" title="Sil">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {isExpanded && renderTree(cat.id, level + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bg-[#111111] border border-white/5 p-8 relative overflow-hidden">
      {/* Dekoratif Arkaplan */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 blur-[100px] pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-[2px] bg-brand-red" />
            <span className="font-display font-black text-[10px] tracking-[0.4em] uppercase text-brand-red">Hiyerarşi Paneli</span>
          </div>
          <h2 className="font-display font-black text-3xl uppercase tracking-tighter text-white">Kategori Mimarisi</h2>
          <p className="font-body text-white/30 text-xs mt-1">Ana Kategoriler {'>'} Alt Kategoriler {'>'} Teknik Dallar</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
           {categories.length === 0 && (
             <button 
              onClick={handleMigrate} 
              disabled={migrating}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white/60 font-display font-bold text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} className={migrating ? 'animate-spin' : ''} /> 
              {migrating ? 'AKTARILIYOR...' : 'VERİLERİ AKTAR'}
            </button>
           )}
           <button onClick={() => handleOpenModal()} className="group relative px-6 py-3 bg-brand-red text-white font-display font-bold text-xs uppercase tracking-widest overflow-hidden transition-all hover:pr-8">
            <span className="relative z-10 flex items-center gap-2">
              <Plus size={14} /> Ana Kategori
            </span>
            <div className="absolute top-0 left-0 w-full h-full bg-white/10 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Sol Taraf: Ağaç Yapısı */}
        <div className="lg:col-span-8 bg-black/40 border border-white/5 p-6 rounded-sm">
          <div className="mb-4 pb-4 border-b border-white/5 flex items-center justify-between text-[10px] font-display font-bold text-white/20 tracking-widest uppercase">
            <span>KATEGORİ AĞACI</span>
            <span>İŞLEMLER</span>
          </div>
          <div className="space-y-2">
            {renderTree(null)}
            {categories.length === 0 && !loading && (
              <div className="text-center py-20 text-white/10 font-display italic tracking-widest">
                <Layers size={40} className="mx-auto mb-4 opacity-5" />
                Henüz kategori tanımlanmamış.
              </div>
            )}
            {loading && (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Yardımcı Bilgi */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-brand-red/5 border border-brand-red/10 p-6">
            <h4 className="font-display font-bold text-xs uppercase text-brand-red tracking-widest mb-4">Nasıl Çalışır?</h4>
            <ul className="space-y-4">
              {[
                { title: 'Ana Kategori', desc: 'Mega menüde en sol sütunda görünen ana başlıklar.' },
                { title: 'Alt Kategori', desc: 'Seçili ana kategorinin yan tarafında açılan gruplar.' },
                { title: 'Ürün Tipi', desc: 'En detaylı seviye. Ürünler bu dallara bağlanır.' }
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-red/20 flex items-center justify-center text-brand-red text-[10px] font-bold flex-shrink-0">{i+1}</div>
                  <div>
                    <div className="text-white text-xs font-bold font-display uppercase">{item.title}</div>
                    <div className="text-white/40 text-[10px] font-body leading-relaxed mt-1">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-white/[0.02] border border-white/5 p-6">
             <div className="flex items-center gap-2 mb-4 text-white/40">
               <ArrowRight size={14} />
               <span className="text-[10px] font-display font-bold uppercase tracking-widest">Hızlı İpucu</span>
             </div>
             <p className="text-[11px] text-white/30 font-body leading-relaxed">
               Bir kategoriyi sildiğinizde, ona bağlı tüm alt kategoriler ve ürün tipleri de silinir. 
               Lütfen dikkatli işlem yapınız.
             </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1A1A1A] border border-white/10 w-full max-w-md shadow-2xl relative overflow-hidden" style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}>
            <div className="bg-brand-red h-1 w-full" />
            <div className="p-8">
              <button onClick={() => setModalOpen(false)} className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <X size={20} />
              </button>
              
              <h3 className="font-display font-black text-2xl uppercase text-white mb-2">
                {editingCat ? 'Kategori Düzenle' : 'Yeni Kategori'}
              </h3>
              <p className="text-white/30 text-[10px] font-display uppercase tracking-widest mb-8">
                {formData.parent_id ? 'Alt Kategori Tanımlanıyor' : 'Ana Kategori Tanımlanıyor'}
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-display font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Kategori Adı</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value, slug: slugify(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 p-4 text-white font-display focus:border-brand-red outline-none transition-colors text-sm"
                    placeholder="Örn: Aktif Hoparlörler"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-display font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Slug (URL)</label>
                  <input 
                    type="text" 
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 p-4 text-white font-body focus:border-brand-red outline-none transition-colors text-xs text-white/40"
                    placeholder="orn-aktif-hoparlorler"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={handleSave}
                    disabled={saving || !formData.name}
                    className="flex-1 bg-brand-red text-white font-display font-bold text-xs uppercase tracking-[0.2em] py-4 hover:bg-brand-red/80 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'İŞLENİYOR...' : editingCat ? 'GÜNCELLE' : 'OLUŞTUR'}
                  </button>
                  <button onClick={() => setModalOpen(false)} className="px-6 bg-white/5 text-white/40 font-display font-bold text-xs uppercase tracking-[0.2em] py-4 hover:bg-white/10 transition-colors">
                    İPTAL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
