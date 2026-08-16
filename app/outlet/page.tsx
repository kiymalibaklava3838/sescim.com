import Link from 'next/link';
import { PackageOpen, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Outlet | Sescim',
  description: 'Outlet ve ikinci el ürünlerimiz.',
};

export default function OutletPage() {
  return (
    <div className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-6 font-body text-slate-800 animate-in fade-in zoom-in-95 duration-500">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
        <div className="w-20 h-20 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mx-auto mb-6">
          <PackageOpen size={40} />
        </div>
        <h1 className="text-3xl font-bold font-display mb-3 text-slate-900">Outlet</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Outlet ürünlerimiz çok yakında burada olacak. Bizi takip etmeye devam edin.
        </p>
        <Link 
          href="/urunler" 
          className="inline-flex items-center gap-2 bg-brand-red text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-sm hover:shadow"
        >
          Tüm Ürünlere Git
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
