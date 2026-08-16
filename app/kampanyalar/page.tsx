import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Kampanyalar | Sescim',
  description: 'Mevcut kampanyalarımız ve indirimlerimiz.',
};

const kampanyalar = [
  {
    id: 1,
    title: 'Yaz İndirimi Başladı!',
    description: 'Seçili ürünlerde %30\'a varan indirimleri kaçırmayın.',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=2070&auto=format&fit=crop',
    link: '/urunler',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 2,
    title: 'Stüdyo Ekipmanlarında %20 İndirim',
    description: 'Profesyonel stüdyo kayıt ekipmanlarında sepette net %20 indirim.',
    image: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?q=80&w=2070&auto=format&fit=crop',
    link: '/urunler',
    color: 'from-blue-600 to-indigo-700'
  }
];

export default function KampanyalarPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-6 font-body text-slate-800 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold font-display mb-4 text-slate-900">Kampanyalar</h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Sizin için hazırladığımız özel fırsatları ve indirimleri keşfedin.
          </p>
        </div>

        <div className="space-y-12">
          {kampanyalar.map((kampanya) => (
            <div key={kampanya.id} className="relative rounded-2xl overflow-hidden group shadow-md hover:shadow-xl transition-all duration-300 border border-slate-100 bg-white">
              <div className="aspect-[21/9] md:aspect-[3/1] relative w-full overflow-hidden">
                <Image 
                  src={kampanya.image} 
                  alt={kampanya.title} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${kampanya.color} mix-blend-multiply opacity-80`} />
                
                <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-16">
                  <div className="max-w-xl text-white relative z-10">
                    <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/30">
                      Özel Teklif
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-4 drop-shadow-md text-white">{kampanya.title}</h2>
                    <p className="text-lg md:text-xl text-white/90 mb-8 drop-shadow">
                      {kampanya.description}
                    </p>
                    <Link 
                      href={kampanya.link}
                      className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
                    >
                      Kampanyayı İncele
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
