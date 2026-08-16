'use client'

import { useEffect, useRef, useState } from 'react'

interface Stat {
  value: string
  label: string
}

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1800
          const steps = 60
          const increment = target / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= target) {
              setCount(target)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return <span ref={ref}>{count}{suffix}</span>
}

export default function StatCounter({ stats }: { stats: Stat[] }) {
  const parsed = stats.map((s) => {
    const match = s.value.match(/^(\d+)(\+?)$/)
    return {
      num: match ? parseInt(match[1]) : 0,
      suffix: match ? match[2] : '',
      label: s.label,
    }
  })

  return (
    <div className="grid grid-cols-4 gap-6 max-w-xl">
      {parsed.map((s) => (
        <div key={s.label} className="border-l-2 border-brand-red/30 pl-3">
          <div className="font-display font-black text-2xl text-white leading-none">
            <CountUp target={s.num} suffix={s.suffix} />
          </div>
          <div className="font-body text-white/30 text-xs mt-1 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
