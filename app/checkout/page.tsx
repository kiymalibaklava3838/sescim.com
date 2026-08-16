'use client'

import { useState } from 'react'
import { CreditCard, Truck, User, ShieldCheck, ChevronRight, Lock } from 'lucide-react'
import Link from 'next/link'

// Mock Cart Data
const MOCK_CART = [
  { id: 1, name: 'Premium Stüdyo Kulaklık', price: 4999.00, quantity: 1, image: 'https://placehold.co/100x100/141414/white?text=Kulaklık' },
  { id: 2, name: 'Profesyonel Ses Kartı', price: 3450.00, quantity: 1, image: 'https://placehold.co/100x100/141414/white?text=Ses+Kartı' },
]

export default function CheckoutPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zip: '',
    cardNumber: '',
    expDate: '',
    cvv: '',
    cardName: ''
  })

  const subtotal = MOCK_CART.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const shipping = 0 // Free shipping
  const total = subtotal + shipping

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step < 3) {
      setStep(step + 1)
    } else {
      alert("Siparişiniz başarıyla alındı!")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="font-display leading-none text-left">
            <div className="text-slate-900 font-black text-2xl tracking-wide uppercase">sescim</div>
            <div className="text-brand-red text-xs tracking-[0.3em] uppercase">.com</div>
          </Link>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
            <Lock size={16} className="text-brand-red" />
            <span>Güvenli Ödeme Noktası</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Left Column - Checkout Steps */}
          <div className="flex-1 space-y-8">
            
            {/* Steps Progress */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className={`flex items-center gap-2 text-sm font-display uppercase tracking-widest ${step >= 1 ? 'text-brand-red font-bold' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${step >= 1 ? 'bg-brand-red text-white' : 'bg-slate-200'}`}>1</span>
                İletişim
              </div>
              <ChevronRight size={16} className="text-slate-300" />
              <div className={`flex items-center gap-2 text-sm font-display uppercase tracking-widest ${step >= 2 ? 'text-brand-red font-bold' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${step >= 2 ? 'bg-brand-red text-white' : 'bg-slate-200'}`}>2</span>
                Teslimat
              </div>
              <ChevronRight size={16} className="text-slate-300" />
              <div className={`flex items-center gap-2 text-sm font-display uppercase tracking-widest ${step >= 3 ? 'text-brand-red font-bold' : 'text-slate-400'}`}>
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${step >= 3 ? 'bg-brand-red text-white' : 'bg-slate-200'}`}>3</span>
                Ödeme
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 border border-slate-200 rounded-2xl shadow-sm">
              
              {/* Step 1: Contact Info */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-50 text-brand-red rounded-full flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl uppercase tracking-wide text-slate-900">İletişim Bilgileri</h2>
                      <p className="text-sm text-slate-500">Misafir olarak hızlıca devam edin.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">E-Posta Adresi</label>
                      <input required type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ornek@mail.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Cep Telefonu</label>
                      <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0555 555 55 55" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all" />
                    </div>
                  </div>
                  
                  <button type="submit" className="w-full bg-brand-red hover:bg-red-700 text-white font-display font-bold text-sm tracking-widest uppercase py-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-8">
                    Devam Et <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Step 2: Shipping */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-50 text-brand-red rounded-full flex items-center justify-center">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl uppercase tracking-wide text-slate-900">Teslimat Adresi</h2>
                      <p className="text-sm text-slate-500">Siparişinizin nereye geleceğini belirtin.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Ad</label>
                      <input required type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Soyad</label>
                      <input required type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Açık Adres</label>
                    <input required type="text" name="address" value={formData.address} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">İl / İlçe</label>
                      <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Posta Kodu</label>
                      <input required type="text" name="zip" value={formData.zip} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                    <button type="button" onClick={() => setStep(1)} className="px-6 py-4 border border-slate-200 rounded-lg font-display text-sm tracking-widest uppercase hover:bg-slate-50 transition-colors">
                      Geri
                    </button>
                    <button type="submit" className="flex-1 bg-brand-red hover:bg-red-700 text-white font-display font-bold text-sm tracking-widest uppercase py-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                      Ödemeye Geç <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-red-50 text-brand-red rounded-full flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl uppercase tracking-wide text-slate-900">Ödeme Bilgileri</h2>
                      <p className="text-sm text-slate-500">Kart bilgilerinizi güvenle girin.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Kart Üzerindeki İsim</label>
                      <input required type="text" name="cardName" value={formData.cardName} onChange={handleChange} placeholder="AD SOYAD" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Kart Numarası</label>
                      <input required type="text" name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder="0000 0000 0000 0000" maxLength={19} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all tracking-widest" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">Son Kullanma (AA/YY)</label>
                        <input required type="text" name="expDate" value={formData.expDate} onChange={handleChange} placeholder="MM/YY" maxLength={5} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-display uppercase tracking-widest text-slate-500 mb-2">CVV</label>
                        <input required type="text" name="cvv" value={formData.cvv} onChange={handleChange} placeholder="123" maxLength={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3 mt-4">
                    <ShieldCheck size={20} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 leading-relaxed">Ödemeniz 256-bit SSL şifreleme ile korunmaktadır. Kart bilgileriniz sunucularımızda saklanmaz.</p>
                  </div>
                  
                  <div className="flex gap-4 mt-8">
                    <button type="button" onClick={() => setStep(2)} className="px-6 py-4 border border-slate-200 rounded-lg font-display text-sm tracking-widest uppercase hover:bg-slate-50 transition-colors">
                      Geri
                    </button>
                    <button type="submit" className="flex-1 bg-brand-red hover:bg-red-700 text-white font-display font-bold text-sm tracking-widest uppercase py-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
                      Siparişi Tamamla — ₺{total.toLocaleString('tr-TR')}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:w-[400px]">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sticky top-6">
              <h3 className="font-display font-bold text-lg uppercase tracking-wide text-slate-900 mb-6">Sipariş Özeti</h3>
              
              <div className="space-y-4 mb-6">
                {MOCK_CART.map(item => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-slate-900 truncate">{item.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Adet: {item.quantity}</p>
                    </div>
                    <div className="font-display font-bold text-sm">
                      ₺{(item.price * item.quantity).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-6 space-y-3 font-medium text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Ara Toplam</span>
                  <span>₺{subtotal.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kargo</span>
                  <span className="text-green-600">Ücretsiz</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-200">
                  <span className="font-display font-bold text-base uppercase tracking-wider text-slate-900">Toplam</span>
                  <span className="font-display font-black text-2xl text-brand-red">
                    ₺{total.toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
