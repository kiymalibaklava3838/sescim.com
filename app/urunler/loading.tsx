export default function Loading() {
  return (
    <div className="min-h-screen pt-8 pb-24 bg-white">
      <div className="border-b border-slate-100 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="w-24 h-3 bg-slate-200 animate-pulse mb-4 rounded" />
          <div className="w-72 h-10 bg-slate-200 animate-pulse mb-6 rounded" />
          <div className="w-full max-w-xl h-12 bg-slate-100 animate-pulse rounded" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-10">
        <div className="flex gap-2 mb-8 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-28 h-8 bg-slate-100 animate-pulse rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1 md:gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 h-[380px] overflow-hidden flex flex-col">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-4 space-y-3 flex-1">
                <div className="w-16 h-2.5 bg-slate-200 animate-pulse rounded" />
                <div className="w-full h-4 bg-slate-200 animate-pulse rounded" />
                <div className="w-2/3 h-3 bg-slate-100 animate-pulse rounded" />
                <div className="pt-4 mt-auto">
                  <div className="w-24 h-5 bg-slate-200 animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
