import re

file_path = r'c:\Users\Ahmet Akdağ\Desktop\sescim\components\AdminProductList.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
content = content.replace(
    "const [editBayiF, setEditBayiF] = useState('')",
    "const [editBayiF, setEditBayiF] = useState('')\n  const [editSescimFiyat, setEditSescimFiyat] = useState('')\n  const [editSescimIndirimli, setEditSescimIndirimli] = useState('')\n  const [editIsFeatured, setEditIsFeatured] = useState(false)"
)

# 2. Open Edit (Select query + populate state)
content = content.replace(
    "select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, bayi_fiyati, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu')",
    "select('id, ad, aciklama, kategori, alt_kategori, urun_tipi, fotograflar, fiyat, bayi_fiyati, sescim_fiyat, sescim_indirimli_fiyat, is_featured, para_birimi, bayi_para_birimi, stok_durumu, stok_adedi, kritik_stok, marka, kullanim_alani, model_kodu')"
)

content = content.replace(
    "setEditBayiF(prod.bayi_fiyati?.toString() || '')",
    "setEditBayiF(prod.bayi_fiyati?.toString() || '')\n    setEditSescimFiyat(prod.sescim_fiyat?.toString() || '')\n    setEditSescimIndirimli(prod.sescim_indirimli_fiyat?.toString() || '')\n    setEditIsFeatured(prod.is_featured || false)"
)

# 3. Save Update payload
content = content.replace(
    "bayi_fiyati: editBayiF ? parseFloat(editBayiF) : null,",
    "bayi_fiyati: editBayiF ? parseFloat(editBayiF) : null,\n      sescim_fiyat: editSescimFiyat ? parseFloat(editSescimFiyat) : null,\n      sescim_indirimli_fiyat: editSescimIndirimli ? parseFloat(editSescimIndirimli) : null,\n      is_featured: editIsFeatured,"
)

# 4. Modal Inputs
fiyat_modal_block = """                  <div>
                    <label className="text-[10px] font-display font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">Bayi Fiyatı</label>"""

new_fiyat_modal_block = """                  <div>
                    <label className="text-[10px] font-display font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">Sescim Özel Fiyat</label>
                    <input type="number" min="0" step="0.01" value={editSescimFiyat} onChange={e => setEditSescimFiyat(e.target.value)} className="input-base w-full" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-display font-semibold uppercase tracking-widest text-slate-400 mb-1.5 block">İndirimli Fiyat</label>
                    <input type="number" min="0" step="0.01" value={editSescimIndirimli} onChange={e => setEditSescimIndirimli(e.target.value)} className="input-base w-full" placeholder="0.00" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer group mb-2 mt-2">
                      <input type="checkbox" checked={editIsFeatured} onChange={e => setEditIsFeatured(e.target.checked)} className="peer sr-only" />
                      <div className="w-5 h-5 rounded border border-slate-300 bg-slate-50 flex items-center justify-center peer-checked:bg-brand-red peer-checked:border-brand-red transition-all">
                        <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="font-display font-semibold text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Öne Çıkarılan Ürün (Vitrin)</span>
                    </label>
                  </div>
""" + fiyat_modal_block

content = content.replace(fiyat_modal_block, new_fiyat_modal_block)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminProductList patched!")
