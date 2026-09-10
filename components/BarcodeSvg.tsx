'use client'

// Code 128 Pattern Tablosu (B alt kümesi için)
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
]

// START B: index 104, STOP: index 106
const START_B = 104
const STOP = 106

function encodeCode128B(text: string): string {
  const codes: number[] = [START_B]
  let checkSum = START_B

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    // Code 128B ASCII 32 - 126 arası doğrudan (charCode - 32)
    const val = charCode - 32
    if (val >= 0 && val <= 94) {
      codes.push(val)
      checkSum += val * (i + 1)
    }
  }

  const checkCode = checkSum % 103
  codes.push(checkCode)
  codes.push(STOP)

  // Pattern birleştir
  let patternStr = ''
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c] || ''
  }

  return patternStr
}

interface BarcodeProps {
  value: string
  height?: number
  showText?: boolean
  className?: string
}

export default function BarcodeSvg({
  value,
  height = 50,
  showText = true,
  className = '',
}: BarcodeProps) {
  if (!value) return null

  const pattern = encodeCode128B(value)
  const barWidth = 2
  const quietZone = 20

  let currentX = quietZone
  const rects: { x: number; width: number }[] = []

  for (let i = 0; i < pattern.length; i++) {
    const width = parseInt(pattern[i], 10) * barWidth
    const isBar = i % 2 === 0
    if (isBar) {
      rects.push({ x: currentX, width })
    }
    currentX += width
  }

  const totalWidth = currentX + quietZone

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full h-auto max-h-[60px]"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {rects.map((r, idx) => (
          <rect
            key={idx}
            x={r.x}
            y={0}
            width={r.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      {showText && (
        <span className="font-mono text-xs tracking-widest font-bold text-slate-900 mt-1 uppercase">
          {value}
        </span>
      )}
    </div>
  )
}
