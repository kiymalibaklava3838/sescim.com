export default function AdminLoading() {
  return (
    <div className="min-h-screen pt-8 pb-24">
      <div className="bg-[#0A0A0A] border-b border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="w-24 h-2.5 bg-white/5 animate-pulse mb-4" />
          <div className="w-64 h-10 bg-white/5 animate-pulse mb-3" />
          <div className="w-48 h-3 bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 pt-12 grid lg:grid-cols-3 gap-12">
        {/* Form skeleton */}
        <div className="space-y-4">
          <div className="w-36 h-5 bg-white/5 animate-pulse mb-6" />
          {[1,2,3,4].map(i => (
            <div key={i}>
              <div className="w-20 h-2.5 bg-white/5 animate-pulse mb-2" />
              <div className="w-full h-11 bg-white/5 animate-pulse" />
            </div>
          ))}
          <div className="w-full h-16 bg-white/5 animate-pulse" />
          <div className="w-full h-11 bg-white/5 animate-pulse" />
        </div>
        {/* List skeleton */}
        <div className="lg:col-span-2 space-y-1">
          <div className="w-48 h-5 bg-white/5 animate-pulse mb-6" />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 bg-[#141414] border border-white/5 p-4">
              <div className="w-10 h-10 bg-white/5 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-3 bg-white/5 animate-pulse" />
                <div className="w-24 h-2.5 bg-white/5 animate-pulse" />
              </div>
              <div className="w-9 h-9 bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
