'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Save, Upload, X, Check, Building2, MapPin, Phone, Mail, Globe, Percent, Loader2, Info, Settings, FileText } from 'lucide-react'

interface ProposalSettings {
  id?: string
  logo_url: string
  firma_adi: string
  adres: string
  telefon: string
  email: string
  web_sitesi: string
  varsayilan_kar_orani: number
  teklif_notu: string
}

export default function BayiTeklifAyarlari({ bayiId }: { bayiId: string }) {
  const [settings, setSettings] = useState<ProposalSettings>({
    logo_url: '',
    firma_adi: '',
    adres: '',
    telefon: '',
    email: '',
    web_sitesi: '',
    varsayilan_kar_orani: 20,
    teklif_notu: 'Teklifimiz 7 gün süreyle geçerlidir. Fiyatlarımıza KDV dahildir.'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('bayi_teklif_ayarlari')
        .select('id, logo_url, firma_adi, adres, telefon, email, web_sitesi, varsayilan_kar_orani, teklif_notu')
        .eq('bayi_id', bayiId)
        .maybeSingle()

      if (data) {
        setSettings(data)
      }
      setLoading(false)
    }
    loadSettings()
  }, [bayiId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)

    try {
      const { error } = await supabase
        .from('bayi_teklif_ayarlari')
        .upsert({
          bayi_id: bayiId,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      alert(`Hata: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo boyutu 2MB\'dan küçük olmalıdır.')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${bayiId}_${Math.random()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('bayi-assets')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('bayi-assets')
        .getPublicUrl(filePath)

      setSettings({ ...settings, logo_url: publicUrl })
    } catch (err: any) {
      alert(`Logo yüklenemedi: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-brand-red" /></div>

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-12 h-12 bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
          <Settings size={24} />
        </div>
        <div>
          <h2 className="font-display font-black text-2xl uppercase text-white tracking-widest">Teklif Ayarları</h2>
          <p className="font-body text-white/30 text-sm">Müşterilerinize gidecek teklif formundaki firma bilgilerinizi düzenleyin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Logo Bölümü */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#141414] border border-white/5 p-6 text-center">
            <div className="font-display font-bold text-[10px] uppercase tracking-widest text-white/30 mb-6">Firma Logosu</div>
            <div className="flex flex-col items-center gap-6">
              <div className="w-32 h-32 bg-black border border-white/10 flex items-center justify-center overflow-hidden relative group">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <Building2 size={40} className="text-white/5" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-brand-red" />
                  </div>
                )}
              </div>
              <label className="btn-outline text-xs cursor-pointer hover:bg-white hover:text-black transition-all">
                <Upload size={14} /> LOGO YÜKLE
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
              </label>
              <p className="text-[10px] text-white/20 font-body">PNG, JPG (Maks. 2MB)</p>
            </div>
          </div>

          <div className="bg-brand-red/5 border border-brand-red/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-brand-red">
              <Info size={14} />
              <span className="font-display font-bold text-[10px] uppercase tracking-widest">Neden Gerekli?</span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed font-body">
              Buraya yüklediğiniz bilgiler, oluşturduğunuz tekliflerin sol üst köşesinde profesyonel bir antetli kağıt gibi görünmesini sağlar.
            </p>
          </div>
        </div>

        {/* Bilgi Formu */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className="bg-[#141414] border border-white/5 p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                  <Building2 size={12} className="text-brand-red" /> Firma Ünvanı
                </label>
                <input 
                  type="text" 
                  value={settings.firma_adi}
                  onChange={e => setSettings({ ...settings, firma_adi: e.target.value })}
                  className="input-dark text-sm" 
                  placeholder="Firma Adı Ltd. Şti." 
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                  <Phone size={12} className="text-brand-red" /> İletişim Telefonu
                </label>
                <input 
                  type="text" 
                  value={settings.telefon}
                  onChange={e => setSettings({ ...settings, telefon: e.target.value })}
                  className="input-dark text-sm" 
                  placeholder="0212 XXX XX XX" 
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                  <Mail size={12} className="text-brand-red" /> E-posta Adresi
                </label>
                <input 
                  type="email" 
                  value={settings.email}
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  className="input-dark text-sm" 
                  placeholder="bilgi@firmadi.com" 
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                  <Globe size={12} className="text-brand-red" /> Web Sitesi
                </label>
                <input 
                  type="text" 
                  value={settings.web_sitesi}
                  onChange={e => setSettings({ ...settings, web_sitesi: e.target.value })}
                  className="input-dark text-sm" 
                  placeholder="www.firmadi.com" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                <MapPin size={12} className="text-brand-red" /> Firma Adresi
              </label>
              <textarea 
                value={settings.adres}
                onChange={e => setSettings({ ...settings, adres: e.target.value })}
                className="input-dark text-sm min-h-[80px] resize-none" 
                placeholder="Açık adresinizi buraya yazınız..."
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
               <div className="md:col-span-1 space-y-2">
                  <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                    <Percent size={12} className="text-brand-red" /> Varsayılan Kâr (%)
                  </label>
                  <input 
                    type="number" 
                    value={settings.varsayilan_kar_orani}
                    onChange={e => setSettings({ ...settings, varsayilan_kar_orani: Number(e.target.value) })}
                    className="input-dark text-sm" 
                  />
               </div>
               <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2 font-display font-bold text-[10px] uppercase tracking-widest text-white/30">
                    <FileText size={12} className="text-brand-red" /> Varsayılan Teklif Notu
                  </label>
                  <input 
                    type="text" 
                    value={settings.teklif_notu}
                    onChange={e => setSettings({ ...settings, teklif_notu: e.target.value })}
                    className="input-dark text-sm" 
                  />
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={saving}
                className={`flex items-center gap-3 px-10 py-4 font-display font-black text-xs uppercase tracking-[0.2em] transition-all ${success ? 'bg-green-600 text-white' : 'bg-brand-red text-white hover:bg-white hover:text-black disabled:opacity-50'}`}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : success ? <Check size={16} /> : <Save size={16} />}
                {saving ? 'KAYDEDİLİYOR...' : success ? 'AYARLAR KAYDEDİLDİ' : 'AYARLARI KAYDET'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
