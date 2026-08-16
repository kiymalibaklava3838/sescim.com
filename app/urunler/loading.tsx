export default function Loading() {
  return (
    <div className="min-h-screen pt-8 pb-24">
      <div className="bg-[#0A0A0A] border-b border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="w-24 h-3 bg-white/5 animate-pulse mb-4" />
          <div className="w-72 h-16 bg-white/5 animate-pulse mb-6" />
          <div className="w-full max-w-2xl h-14 bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="flex gap-2 mb-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-28 h-8 bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#141414] border border-white/5">
              <div className="aspect-square bg-white/5 animate-pulse" />
              <div className="p-5 space-y-2">
                <div className="w-20 h-2.5 bg-white/5 animate-pulse" />
                <div className="w-full h-4 bg-white/5 animate-pulse" />
                <div className="w-3/4 h-3 bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
