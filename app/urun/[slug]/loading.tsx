export default function Loading() {
  return (
    <div className="min-h-screen pt-8 pb-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="w-40 h-3 bg-white/5 animate-pulse mb-10" />
        <div className="grid md:grid-cols-2 gap-16">
          <div className="aspect-square bg-[#141414] border border-white/5 animate-pulse" />
          <div className="space-y-4">
            <div className="w-24 h-3 bg-white/5 animate-pulse" />
            <div className="w-3/4 h-10 bg-white/5 animate-pulse" />
            <div className="w-12 h-0.5 bg-brand-red" />
            <div className="space-y-2 pt-2">
              <div className="w-full h-3 bg-white/5 animate-pulse" />
              <div className="w-full h-3 bg-white/5 animate-pulse" />
              <div className="w-2/3 h-3 bg-white/5 animate-pulse" />
            </div>
            <div className="bg-[#141414] border border-white/5 p-6 mt-6 space-y-3">
              <div className="w-40 h-3 bg-white/5 animate-pulse" />
              <div className="w-full h-11 bg-white/5 animate-pulse" />
              <div className="w-full h-11 bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
