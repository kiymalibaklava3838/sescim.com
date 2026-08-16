import FeaturedProducts from '@/components/FeaturedProducts';

export const metadata = {
  title: 'Yeni Gelenler | Sescim',
  description: 'Mağazamıza eklenen en yeni ürünler.',
};

export default function YeniGelenlerPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-800 animate-in fade-in zoom-in-95 duration-500">
      {/* Sayfa başlığı */}
      <div className="bg-white border-b border-slate-200 py-12 px-6 text-center">
        <h1 className="text-4xl font-bold font-display mb-4 text-slate-900">Yeni Gelenler</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Koleksiyonumuza en son eklenen profesyonel ses ve müzik ekipmanlarını keşfedin.
        </p>
      </div>
      
      {/* Ürünler */}
      <div className="-mt-8">
        <FeaturedProducts title="En Yeni Ürünlerimiz" sortBy="created_at" ascending={false} />
      </div>
    </div>
  );
}
