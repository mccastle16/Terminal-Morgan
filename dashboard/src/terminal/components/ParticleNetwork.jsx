import { useEffect, useRef } from 'react'

const STAR_COUNT = 200
const CONNECT_DIST = 130
const MOUSE_RADIUS = 180
const GRAVITY_WELLS = 4
const COMET_INTERVAL = 180 // frames between comets

export default function ParticleNetwork({ className = '' }) {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -999, y: -999 })
  const raf = useRef(null)
  const stars = useRef([])
  const wells = useRef([])
  const comets = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let dpr = window.devicePixelRatio || 1

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const w = () => canvas.offsetWidth
    const h = () => canvas.offsetHeight

    // Gravity wells — invisible attractors that give orbital motion
    wells.current = Array.from({ length: GRAVITY_WELLS }, () => ({
      x: Math.random() * w(),
      y: Math.random() * h(),
      mass: Math.random() * 0.02 + 0.005,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
    }))

    // Stars (particles)
    stars.current = Array.from({ length: STAR_COUNT }, () => {
      const isHub = Math.random() < 0.1
      const isBright = Math.random() < 0.06
      return {
        x: Math.random() * w(),
        y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        r: isHub ? Math.random() * 2 + 2 : isBright ? Math.random() + 1.5 : Math.random() * 1.2 + 0.3,
        hub: isHub,
        bright: isBright,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.03 + 0.01,
        hue: isHub ? 38 : isBright ? Math.random() * 60 + 200 : 220,
      }
    })

    const spawnComet = () => {
      const side = Math.floor(Math.random() * 2)
      const cw = w(), ch = h()
      comets.current.push({
        x: side === 0 ? -20 : cw + 20,
        y: Math.random() * ch * 0.6,
        vx: side === 0 ? (Math.random() * 3 + 2) : -(Math.random() * 3 + 2),
        vy: Math.random() * 1.5 + 0.5,
        life: 1,
        decay: Math.random() * 0.005 + 0.005,
        tailLen: Math.random() * 60 + 40,
        hue: Math.random() < 0.5 ? 38 : 200 + Math.random() * 40,
      })
    }

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => { mouse.current = { x: -999, y: -999 } }
    canvas.addEventListener('mousemove', handleMouse)
    canvas.addEventListener('mouseleave', handleLeave)

    let frame = 0
    const animate = () => {
      frame++
      const cw = w(), ch = h()
      const mx = mouse.current.x, my = mouse.current.y

      // Semi-transparent clear for motion trails
      ctx.fillStyle = 'rgba(2, 6, 23, 0.25)'
      ctx.fillRect(0, 0, cw, ch)

      // Move gravity wells slowly
      for (const well of wells.current) {
        well.x += well.vx
        well.y += well.vy
        // Soft bounce
        if (well.x < cw * 0.1 || well.x > cw * 0.9) well.vx *= -1
        if (well.y < ch * 0.1 || well.y > ch * 0.9) well.vy *= -1
      }

      // Update star positions
      for (const s of stars.current) {
        s.phase += s.twinkleSpeed

        // Gravitational pull from wells → orbital motion
        for (const well of wells.current) {
          const dx = well.x - s.x
          const dy = well.y - s.y
          const dist = Math.sqrt(dx * dx + dy * dy) + 50
          const force = well.mass / (dist * 0.01)
          s.vx += (dx / dist) * force
          s.vy += (dy / dist) * force
        }

        // Mouse attraction (gentle pull toward cursor)
        if (mx > 0 && my > 0) {
          const dmx = mx - s.x, dmy = my - s.y
          const dm = Math.sqrt(dmx * dmx + dmy * dmy)
          if (dm < MOUSE_RADIUS * 2 && dm > 10) {
            const pull = 0.15 / (dm * 0.05)
            s.vx += (dmx / dm) * pull
            s.vy += (dmy / dm) * pull
          }
        }

        // Speed limit & damping
        const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy)
        if (speed > 2) { s.vx *= 2 / speed; s.vy *= 2 / speed }
        s.vx *= 0.995
        s.vy *= 0.995

        s.x += s.vx
        s.y += s.vy

        // Wrap around edges (like a toroidal universe)
        if (s.x < -10) s.x = cw + 10
        if (s.x > cw + 10) s.x = -10
        if (s.y < -10) s.y = ch + 10
        if (s.y > ch + 10) s.y = -10
      }

      // Draw connections (constellation lines)
      const pts = stars.current
      for (let i = 0; i < pts.length; i++) {
        if (!pts[i].hub && !pts[i].bright && Math.random() > 0.3) continue // sparse connections for regular stars
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const d = dx * dx + dy * dy
          if (d < CONNECT_DIST * CONNECT_DIST) {
            const dist = Math.sqrt(d)
            const alpha = (1 - dist / CONNECT_DIST) * 0.3
            if (pts[i].hub || pts[j].hub) {
              ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`
              ctx.lineWidth = 1
            } else {
              ctx.strokeStyle = `rgba(100, 140, 220, ${alpha * 0.4})`
              ctx.lineWidth = 0.4
            }
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw stars
      for (const s of pts) {
        const twinkle = (Math.sin(s.phase) + 1) * 0.5
        const r = s.r * (0.7 + twinkle * 0.6)

        if (s.hub) {
          // Pulsing nebula glow
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 8)
          grd.addColorStop(0, `hsla(38, 90%, 55%, ${0.15 + twinkle * 0.1})`)
          grd.addColorStop(0.4, `hsla(38, 80%, 45%, ${0.05 + twinkle * 0.03})`)
          grd.addColorStop(1, 'hsla(38, 80%, 45%, 0)')
          ctx.fillStyle = grd
          ctx.beginPath()
          ctx.arc(s.x, s.y, r * 8, 0, Math.PI * 2)
          ctx.fill()

          // Core
          ctx.fillStyle = `hsla(38, 95%, 65%, ${0.8 + twinkle * 0.2})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, r + 0.5, 0, Math.PI * 2)
          ctx.fill()
        } else if (s.bright) {
          // Blue-ish bright star with cross-spike
          const spike = r * 3
          ctx.strokeStyle = `hsla(${s.hue}, 70%, 70%, ${0.1 + twinkle * 0.15})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(s.x - spike, s.y); ctx.lineTo(s.x + spike, s.y)
          ctx.moveTo(s.x, s.y - spike); ctx.lineTo(s.x, s.y + spike)
          ctx.stroke()

          ctx.fillStyle = `hsla(${s.hue}, 60%, 80%, ${0.6 + twinkle * 0.4})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Regular dim star
          ctx.fillStyle = `hsla(220, 30%, 70%, ${0.15 + twinkle * 0.25})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Comets / shooting stars
      if (frame % COMET_INTERVAL === 0) spawnComet()

      for (let i = comets.current.length - 1; i >= 0; i--) {
        const c = comets.current[i]
        c.x += c.vx
        c.y += c.vy
        c.life -= c.decay

        if (c.life <= 0 || c.x < -100 || c.x > cw + 100 || c.y > ch + 50) {
          comets.current.splice(i, 1)
          continue
        }

        // Comet tail
        const tailX = c.x - c.vx * c.tailLen * 0.3
        const tailY = c.y - c.vy * c.tailLen * 0.3
        const grd = ctx.createLinearGradient(c.x, c.y, tailX, tailY)
        grd.addColorStop(0, `hsla(${c.hue}, 85%, 75%, ${c.life * 0.8})`)
        grd.addColorStop(1, `hsla(${c.hue}, 85%, 75%, 0)`)
        ctx.strokeStyle = grd
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(tailX, tailY)
        ctx.stroke()

        // Comet head
        ctx.fillStyle = `hsla(${c.hue}, 90%, 85%, ${c.life})`
        ctx.beginPath()
        ctx.arc(c.x, c.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      // Cursor nebula effect
      if (mx > 0 && my > 0) {
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS)
        mg.addColorStop(0, 'rgba(245, 158, 11, 0.04)')
        mg.addColorStop(0.5, 'rgba(100, 120, 200, 0.02)')
        mg.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = mg
        ctx.beginPath()
        ctx.arc(mx, my, MOUSE_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }

      raf.current = requestAnimationFrame(animate)
    }

    // Initial full clear
    ctx.fillStyle = 'rgb(2, 6, 23)'
    ctx.fillRect(0, 0, w(), h())

    animate()

    const resizeObs = new ResizeObserver(resize)
    resizeObs.observe(canvas)

    return () => {
      cancelAnimationFrame(raf.current)
      canvas.removeEventListener('mousemove', handleMouse)
      canvas.removeEventListener('mouseleave', handleLeave)
      resizeObs.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  )
}
