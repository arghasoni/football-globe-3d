import { useEffect, useRef } from 'react'
import { cameraView, sceneTheme } from '../lib/cameraView'

/**
 * Stadium-at-night scene behind the globe: floodlight beams sweeping from corner towers,
 * a neon centre circle + halfway line (the globe is the ball on the centre spot),
 * parallax twinkling stars that drift as the globe rotates, drifting haze and the
 * occasional shooting ball. Drawn on one canvas; static when reduced motion is preferred.
 */

const HALF_FOV_TAN = Math.tan((25 * Math.PI) / 180)

interface Star {
  x: number
  y: number
  r: number
  layer: number
  phase: number
  speed: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, () => {
    const layer = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2
    return {
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + layer * 0.45 + Math.random() * 0.4,
      layer,
      phase: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.8,
    }
  })
}

/** On-screen radius in px of the globe for the current camera altitude. */
function globeRadiusPx(height: number, altitude: number): number {
  const angular = Math.asin(1 / (1 + altitude))
  return (Math.tan(angular) / HALF_FOV_TAN) * (height / 2)
}

export default function Backdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stars = makeStars(320)
    let meteor: Meteor | null = null
    let nextMeteorAt = performance.now() + 4000
    let w = 0
    let h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const drawSky = () => {
      const g = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.8)
      g.addColorStop(0, '#062a1d')
      g.addColorStop(0.45, '#03100f')
      g.addColorStop(1, '#010409')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    }

    const drawHaze = (t: number) => {
      ctx.globalCompositeOperation = 'lighter'
      const blobs = [
        { x: 0.2 + 0.05 * Math.sin(t * 0.00007), y: 0.25, r: 0.45, c: '20,120,90', a: 0.10 },
        { x: 0.82 + 0.04 * Math.cos(t * 0.00006), y: 0.7, r: 0.5, c: '10,90,120', a: 0.09 },
        { x: 0.5, y: 1.05 + 0.03 * Math.sin(t * 0.0001), r: 0.6, c: sceneTheme.accent, a: 0.07 },
      ]
      for (const b of blobs) {
        const R = b.r * Math.max(w, h)
        const g = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, R)
        g.addColorStop(0, `rgba(${b.c},${b.a})`)
        g.addColorStop(1, `rgba(${b.c},0)`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawStars = (t: number) => {
      // Parallax: deeper layers drift less as the globe turns.
      const drift = [0.0006, 0.0013, 0.0024]
      for (const s of stars) {
        const ox = (-cameraView.lng * drift[s.layer]) % 1
        const oy = (cameraView.lat * drift[s.layer]) % 1
        const x = (((s.x + ox) % 1) + 1) % 1
        const y = (((s.y + oy) % 1) + 1) % 1
        const twinkle = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.speed + s.phase)
        ctx.beginPath()
        ctx.arc(x * w, y * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.layer === 2 ? `rgba(200,255,225,${twinkle})` : `rgba(255,255,255,${twinkle * 0.7})`
        ctx.fill()
      }
    }

    const drawFloodlights = (t: number) => {
      ctx.globalCompositeOperation = 'lighter'
      const towers = [
        { x: -0.04, y: -0.06, base: 0.62, phase: 0 },
        { x: 0.1, y: -0.1, base: 0.85, phase: 1.7 },
        { x: 1.04, y: -0.06, base: Math.PI - 0.62, phase: 3.1 },
        { x: 0.9, y: -0.1, base: Math.PI - 0.85, phase: 4.4 },
      ]
      const len = Math.hypot(w, h) * 1.1
      for (const tw of towers) {
        const sx = tw.x * w
        const sy = tw.y * h
        const sway = reduceMotion ? 0 : 0.07 * Math.sin(t * 0.00025 + tw.phase)
        const flicker = reduceMotion ? 1 : 0.92 + 0.08 * Math.sin(t * 0.013 + tw.phase * 7)
        const angle = tw.base + sway
        const spread = 0.13
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, len)
        g.addColorStop(0, `rgba(210,255,230,${0.16 * flicker})`)
        g.addColorStop(0.35, `rgba(${sceneTheme.accent},${0.035 * flicker})`)
        g.addColorStop(1, `rgba(${sceneTheme.accent},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + Math.cos(angle - spread) * len, sy + Math.sin(angle - spread) * len)
        ctx.lineTo(sx + Math.cos(angle + spread) * len, sy + Math.sin(angle + spread) * len)
        ctx.closePath()
        ctx.fill()
        // Lamp bloom at the tower head.
        const bloom = ctx.createRadialGradient(sx, sy, 0, sx, sy, 140)
        bloom.addColorStop(0, `rgba(235,255,245,${0.5 * flicker})`)
        bloom.addColorStop(1, 'rgba(235,255,245,0)')
        ctx.fillStyle = bloom
        ctx.fillRect(sx - 140, sy - 140, 280, 280)
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const drawPitch = (t: number) => {
      const cx = w / 2
      const cy = h / 2
      const r = globeRadiusPx(h, cameraView.altitude) * 1.38
      ctx.save()
      ctx.strokeStyle = `rgba(${sceneTheme.accent},0.22)`
      ctx.lineWidth = 1.5
      ctx.shadowColor = `rgba(${sceneTheme.accent},0.6)`
      ctx.shadowBlur = 10
      ctx.setLineDash([14, 10])
      ctx.lineDashOffset = reduceMotion ? 0 : -t * 0.01
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
      // Halfway line, broken where it would cross the circle.
      ctx.setLineDash([])
      ctx.strokeStyle = `rgba(${sceneTheme.accent},0.13)`
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(cx - r, cy)
      ctx.moveTo(cx + r, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()
      ctx.restore()
    }

    const drawMeteor = (t: number) => {
      if (reduceMotion) return
      if (!meteor && t > nextMeteorAt) {
        const fromLeft = Math.random() < 0.5
        meteor = {
          x: fromLeft ? -40 : w + 40,
          y: Math.random() * h * 0.35,
          vx: (fromLeft ? 1 : -1) * (7 + Math.random() * 4),
          vy: 1.5 + Math.random() * 2,
          life: 1,
        }
      }
      if (!meteor) return
      const m = meteor
      const tail = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14)
      tail.addColorStop(0, `rgba(230,255,240,${0.9 * m.life})`)
      tail.addColorStop(1, 'rgba(230,255,240,0)')
      ctx.strokeStyle = tail
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(m.x, m.y, 2.6, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${m.life})`
      ctx.fill()
      m.x += m.vx
      m.y += m.vy
      m.life -= 0.006
      if (m.life <= 0 || m.x < -80 || m.x > w + 80 || m.y > h) {
        meteor = null
        nextMeteorAt = t + 7000 + Math.random() * 9000
      }
    }

    let raf = 0
    const frame = (t: number) => {
      drawSky()
      drawHaze(t)
      drawStars(t)
      drawFloodlights(t)
      drawPitch(t)
      drawMeteor(t)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="backdrop" aria-hidden />
}
