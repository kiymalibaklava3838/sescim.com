import FeaturedProducts from '@/components/FeaturedProducts';
import { getSiteUrl } from '@/lib/site-url';

export const metadata = {
  title: 'Yeni Gelenler | Sescim',
  description: 'Sescim mağazamıza eklenen en yeni profesyonel ses sistemleri, sahne ışıkları ve DJ ekipmanları.',
  alternates: {
    canonical: `${getSiteUrl()}/yeni-gelenler`,
  },
};

export default function YeniGelenlerPage() {
  const baseUrl = getSiteUrl();

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Yeni Gelenler',
        item: `${baseUrl}/yeni-gelenler`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 font-body text-slate-800 animate-in fade-in zoom-in-95 duration-500">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
