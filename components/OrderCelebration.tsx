'use client'

import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  decay: number
  rotation: number
  vRot: number
}

export default function OrderCelebration() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [active, setActive] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ekran boyutlarına ayarla
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    // Zarif, Apple/Stripe tarzı renk paleti (Marka Kırmızı, Altın, Şampanya, Beyaz)
    const colors = ['#DA291C', '#E5A93C', '#F3E5AB', '#FFFFFF', '#D97706']
    
    // Yalnızca 45 adet mikro partikül (ekranı boğmaz, çok zariftir)
    const particleCount = 45
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
      const speed = Math.random() * 5 + 3
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 100,
        y: height * 0.35 + (Math.random() - 0.5) * 50,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5, // Hafif yukarı fırlayıp süzülür
        size: Math.random() * 4 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.012, // 1.5 - 2 saniyede tamamen solar
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 8,
      })
    }

    let animationId: number
    const startTime = performance.now()

    const render = (time: number) => {
      const elapsed = time - startTime
      ctx.clearRect(0, 0, width, height)

      let aliveCount = 0

      for (const p of particles) {
        if (p.alpha <= 0) continue

        p.x += p.vx
        p.y += p.vy
        p.vy += 0.12 // Düşük yerçekimi
        p.vx *= 0.98 // Hava sürtünmesi
        p.rotation += p.vRot
        p.alpha = Math.max(0, p.alpha - p.decay)

        if (p.alpha > 0) {
          aliveCount++
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = p.alpha
          ctx.fillStyle = p.color

          // Mikro dikdörtgen ve daireler
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8)
          ctx.restore()
        }
      }

      // 2.2 saniye dolunca veya tüm partiküller solunca animasyonu durdur
      if (aliveCount > 0 && elapsed < 2200) {
        animationId = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, width, height)
        setActive(false)
      }
    }

    animationId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-500"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
