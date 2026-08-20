import re

file_path = r'c:\Users\Ahmet Akdağ\Desktop\sescim\components\AdminAddProduct.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State
content = content.replace(
    "const [bayi_fiyati, setBayiF] = useState('')",
    "const [bayi_fiyati, setBayiF] = useState('')\n  const [sescim_fiyat, setSescimFiyat] = useState('')\n  const [sescim_indirimli_fiyat, setSescimIndirimli] = useState('')\n  const [is_featured, setIsFeatured] = useState(false)"
)

# 2. payload insertion
content = content.replace(
    "bayi_fiyati: bayi_fiyati ? parseFloat(bayi_fiyati) : null,",
    "bayi_fiyati: bayi_fiyati ? parseFloat(bayi_fiyati) : null,\n      sescim_fiyat: sescim_fiyat ? parseFloat(sescim_fiyat) : null,\n      sescim_indirimli_fiyat: sescim_indirimli_fiyat ? parseFloat(sescim_indirimli_fiyat) : null,\n      is_featured: is_featured,"
)

# 3. reset state
content = content.replace(
    "setFiyat(''); setBayiF('');",
    "setFiyat(''); setBayiF(''); setSescimFiyat(''); setSescimIndirimli(''); setIsFeatured(false);"
)

# 4. Form inputs (before the 'bayi_fiyati' label block)
fiyat_block = """          <div>
            <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5 flex items-center justify-between">
              Bayi Fiyatı
              <span className="text-[10px] text-white/30 lowercase normal-case">(İsteğe Bağlı)</span>
            </label>"""

new_fiyat_blocks = """          <div>
            <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">Sescim Özel Fiyatı *</label>
            <input type="number" min="0" step="0.01" value={sescim_fiyat} onChange={e => setSescimFiyat(e.target.value)} className="input-dark w-full mb-4" placeholder="0.00" />
          </div>

          <div>
            <label className="font-display font-semibold text-xs tracking-widest uppercase text-white/40 block mb-1.5">İndirimli Fiyat</label>
            <input type="number" min="0" step="0.01" value={sescim_indirimli_fiyat} onChange={e => setSescimIndirimli(e.target.value)} className="input-dark w-full mb-4" placeholder="0.00 (Opsiyonel)" />
          </div>

          <label className="flex items-center gap-2 mb-6 cursor-pointer group">
            <input type="checkbox" checked={is_featured} onChange={e => setIsFeatured(e.target.checked)} className="peer sr-only" />
            <div className="w-5 h-5 rounded border border-white/20 bg-white/5 flex items-center justify-center peer-checked:bg-brand-red peer-checked:border-brand-red transition-all">
              <Check size={14} className="text-white opacity-0 peer-checked:opacity-100" />
            </div>
            <span className="font-display font-semibold text-sm text-white/70 group-hover:text-white transition-colors">Öne Çıkarılan Ürün Yap (Vitrin)</span>
          </label>

""" + fiyat_block

content = content.replace(fiyat_block, new_fiyat_blocks)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("AdminAddProduct patched!")
