import { Truck, ShieldCheck, Lock, Headphones } from 'lucide-react'

const trustFeatures = [
  {
    icon: Truck,
    title: 'Ücretsiz Kargo',
    description: 'Belli tutar üzeri siparişlerde anında bedava kargo fırsatı.',
  },
  {
    icon: ShieldCheck,
    title: '14 Gün İade',
    description: 'Koşulsuz şartsız, kolay ve hızlı iade garantisi.',
  },
  {
    icon: Lock,
    title: 'Güvenli Alışveriş',
    description: '256-bit SSL sertifikası ile %100 güvenli ödeme altyapısı.',
  },
  {
    icon: Headphones,
    title: '7/24 Destek',
    description: 'Satış öncesi ve sonrası kesintisiz uzman müşteri hizmetleri.',
  },
]

export default function TrustBadges() {
  return (
    <section className="bg-slate-50 py-12 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustFeatures.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div 
                key={index} 
                className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-slate-100 group"
              >
                <div className="w-16 h-16 bg-brand-red-light rounded-full flex items-center justify-center mb-4 group-hover:bg-brand-red transition-colors duration-300">
                  <Icon size={32} className="text-brand-red group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
