"use client";

import { useState } from 'react';
import { MapPin, Phone, Mail, Send } from 'lucide-react';

export default function IletisimPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 font-body text-slate-800 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold font-display mb-4 text-slate-900">İletişim</h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Bize ulaşmak için aşağıdaki formu doldurabilir veya iletişim bilgilerimizi kullanabilirsiniz. Size en kısa sürede dönüş yapacağız.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* İletişim Bilgileri */}
          <div className="p-10 bg-slate-900 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-semibold mb-8 font-display">Bize Ulaşın</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Adres</h3>
                    <p className="text-slate-300">Müzik Sokak, No:42, Şişli/İstanbul</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Phone className="text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">Telefon</h3>
                    <p className="text-slate-300">+90 850 123 45 67</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <Mail className="text-brand-red" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">E-posta</h3>
                    <p className="text-slate-300">destek@sescim.com</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Dekoratif arka plan */}
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-red/20 rounded-full blur-3xl z-0 pointer-events-none" />
          </div>

          {/* İletişim Formu */}
          <div className="p-10">
            <h2 className="text-2xl font-semibold mb-6 font-display text-slate-800">Mesaj Gönder</h2>
            
            {isSubmitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12 animate-in fade-in duration-500">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <Send size={32} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">Mesajınız Alındı!</h3>
                <p className="text-slate-500">
                  En kısa sürede sizinle iletişime geçeceğiz. Teşekkür ederiz.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="ad" className="block text-sm font-medium text-slate-700 mb-1">Ad Soyad</label>
                  <input type="text" id="ad" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all" placeholder="Adınız Soyadınız" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">E-posta</label>
                  <input type="email" id="email" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all" placeholder="ornek@email.com" />
                </div>
                <div>
                  <label htmlFor="konu" className="block text-sm font-medium text-slate-700 mb-1">Konu</label>
                  <input type="text" id="konu" required className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all" placeholder="Mesajınızın konusu" />
                </div>
                <div>
                  <label htmlFor="mesaj" className="block text-sm font-medium text-slate-700 mb-1">Mesaj</label>
                  <textarea id="mesaj" required rows={4} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-brand-red outline-none transition-all resize-none" placeholder="Mesajınızı buraya yazın..."></textarea>
                </div>
                <button type="submit" className="w-full bg-brand-red text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                  <Send size={18} />
                  Gönder
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
