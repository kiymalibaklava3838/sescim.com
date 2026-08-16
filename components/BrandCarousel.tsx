const brands = [
  'Yamaha', 'Pioneer DJ', 'Shure', 'Sennheiser', 'Korg', 
  'Roland', 'JBL', 'QSC', 'Electro-Voice'
]

// Duplicate the array to make the infinite scroll seamless
const duplicatedBrands = [...brands, ...brands, ...brands]

export default function BrandCarousel() {
  return (
    <div className="w-full bg-white py-12 overflow-hidden border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-6 mb-8 text-center">
        <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
          Dünyanın En İyi Markaları
        </h2>
      </div>
      
      {/* Marquee Container */}
      <div className="relative flex overflow-hidden w-full group">
        <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
          {duplicatedBrands.map((brand, index) => (
            <div 
              key={index} 
              className="flex items-center justify-center mx-8 md:mx-16"
            >
              <span className="text-3xl md:text-5xl font-black text-slate-200 hover:text-slate-400 transition-colors duration-300 cursor-default">
                {brand}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
