'use client'

import { useEffect, useRef } from 'react'

export default function AnimatedBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // 型別窄化（narrowing）不會延伸進下面用 function 宣告的 resize()，
    // 另外存一個明確型別（非 null）的常數給它用，才不會一直報 canvas 可能是 null
    const canvasEl: HTMLCanvasElement = canvas
    const ctx = canvas.getContext('2d')!
    let animId: number
    let t = 0
    let W = 0, H = 0
    const TAU = Math.PI * 2
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    type Blob     = { x:number; y:number; r:number; color:string; phase:number }
    type Circle   = { x:number; y:number; r:number; lw:number; color:string; phase:number }
    type Wave     = { x:number; y:number; amp:number; freq:number; len:number; color:string; phase:number }
    type Dot      = { x:number; y:number; r:number; color:string; phase:number }
    type Star     = { x:number; y:number; r:number; color:string; phase:number; rot:number }
    type Triangle = { x:number; y:number; size:number; color:string; phase:number; rot:number; filled:boolean }

    let blobs: Blob[], circles: Circle[], waves: Wave[], dots: Dot[], stars: Star[], triangles: Triangle[]

    function resize() {
      W = canvasEl.offsetWidth
      H = canvasEl.offsetHeight
      canvasEl.width  = W * devicePixelRatio
      canvasEl.height = H * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
      init()
    }

    function init() {
      blobs = [
        { x:W*0.05, y:H*0.08, r:W*0.30, color:'rgba(160,210,240,0.50)', phase:0   },
        { x:W*0.80, y:H*0.10, r:W*0.24, color:'rgba(170,225,185,0.45)', phase:1.4 },
        { x:W*0.12, y:H*0.78, r:W*0.22, color:'rgba(170,230,192,0.42)', phase:2.6 },
        { x:W*0.76, y:H*0.74, r:W*0.32, color:'rgba(250,238,148,0.48)', phase:0.9 },
      ]
      circles = [
        { x:rand(.1,.9), y:rand(.1,.9), r:rand(20,38), lw:1.2, color:'rgba(90,160,210,0.28)',  phase:rand(0,TAU) },
        { x:rand(.1,.9), y:rand(.1,.9), r:rand(14,28), lw:1.0, color:'rgba(205,185,65,0.28)',  phase:rand(0,TAU) },
        { x:rand(.1,.9), y:rand(.1,.9), r:rand(22,40), lw:1.0, color:'rgba(100,178,125,0.25)', phase:rand(0,TAU) },
        { x:rand(.1,.9), y:rand(.1,.9), r:rand(16,30), lw:0.9, color:'rgba(90,160,210,0.20)',  phase:rand(0,TAU) },
      ]
      waves = [
        { x:rand(.05,.80), y:rand(.20,.75), amp:rand(5,8), freq:rand(.5,.8), len:rand(35,55), color:'rgba(75,155,205,0.50)',  phase:rand(0,TAU) },
        { x:rand(.05,.80), y:rand(.20,.75), amp:rand(4,7), freq:rand(.4,.7), len:rand(30,50), color:'rgba(195,165,58,0.50)',  phase:rand(0,TAU) },
        { x:rand(.05,.80), y:rand(.20,.75), amp:rand(4,6), freq:rand(.5,.9), len:rand(25,45), color:'rgba(85,170,118,0.45)',  phase:rand(0,TAU) },
      ]
      dots = Array.from({ length: 10 }, () => ({
        x:rand(.05,.95), y:rand(.05,.95), r:rand(2.5,4.5),
        color: ['rgba(90,165,215,0.75)','rgba(225,195,72,0.82)','rgba(105,185,135,0.72)'][Math.floor(rand(0,3))],
        phase: rand(0,TAU),
      }))
      stars = Array.from({ length: 6 }, () => ({
        x:rand(.05,.93), y:rand(.05,.93), r:rand(5,11),
        color: ['rgba(90,165,215,0.55)','rgba(225,195,72,0.62)','rgba(105,185,135,0.55)'][Math.floor(rand(0,3))],
        phase: rand(0,TAU), rot: rand(0,TAU),
      }))
      triangles = Array.from({ length: 5 }, () => ({
        x:rand(.05,.92), y:rand(.05,.92), size:rand(10,20),
        color: ['rgba(90,165,215,0.30)','rgba(225,195,72,0.34)','rgba(105,185,135,0.30)'][Math.floor(rand(0,3))],
        phase: rand(0,TAU), rot: rand(0,TAU),
        filled: Math.random() > 0.5,
      }))
    }

    function drawBlob(x:number, y:number, r:number, color:string) {
      const g = ctx.createRadialGradient(x,y,0, x,y,r)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill()
    }

    function drawStar(cx:number, cy:number, r:number, rot:number, color:string) {
      const pts=5, ir=r*0.42
      ctx.fillStyle = color; ctx.beginPath()
      for(let i=0; i<pts*2; i++){
        const a = rot + (i*Math.PI/pts) - Math.PI/2
        const rr = i%2===0 ? r : ir
        i===0 ? ctx.moveTo(cx+rr*Math.cos(a), cy+rr*Math.sin(a))
              : ctx.lineTo(cx+rr*Math.cos(a), cy+rr*Math.sin(a))
      }
      ctx.closePath(); ctx.fill()
    }

    function drawTriangle(cx:number, cy:number, size:number, rot:number, color:string, filled:boolean) {
      ctx.beginPath()
      for(let i=0; i<3; i++){
        const a = rot + (i/3)*TAU - Math.PI/2
        i===0 ? ctx.moveTo(cx+size*Math.cos(a), cy+size*Math.sin(a))
              : ctx.lineTo(cx+size*Math.cos(a), cy+size*Math.sin(a))
      }
      ctx.closePath()
      if(filled){ ctx.fillStyle=color; ctx.fill() }
      else { ctx.strokeStyle=color; ctx.lineWidth=1.2; ctx.stroke() }
    }

    function frame() {
      t += 0.010
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle = '#f7f5ef'
      ctx.fillRect(0,0,W,H)

      blobs.forEach(b => {
        const x = b.x + Math.sin(t*0.22+b.phase)*W*0.10 + Math.cos(t*0.15+b.phase*1.2)*W*0.06
        const y = b.y + Math.cos(t*0.18+b.phase)*H*0.11 + Math.sin(t*0.13+b.phase*1.4)*H*0.06
        drawBlob(x, y, b.r*(0.93+0.07*Math.sin(t*0.30+b.phase)), b.color)
      })
      circles.forEach(c => {
        const cx = (c.x+Math.sin(t*0.11+c.phase)*0.035)*W
        const cy = (c.y+Math.cos(t*0.09+c.phase)*0.035)*H
        const sc = 0.88+0.12*Math.sin(t*0.22+c.phase)
        ctx.strokeStyle=c.color; ctx.lineWidth=c.lw
        ctx.beginPath(); ctx.arc(cx,cy,c.r*sc,0,TAU); ctx.stroke()
      })
      waves.forEach(w => {
        const wx = (w.x+Math.sin(t*0.08+w.phase)*0.025)*W
        const wy = (w.y+Math.cos(t*0.07+w.phase)*0.025)*H
        ctx.strokeStyle=w.color; ctx.lineWidth=1.4; ctx.lineCap='round'
        ctx.beginPath()
        for(let i=0; i<=32; i++){
          const px = wx+(i/32)*w.len
          const py = wy+Math.sin(i*w.freq+(t+w.phase)*2.2)*w.amp
          i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py)
        }
        ctx.stroke()
      })
      stars.forEach(s => {
        const sx = (s.x+Math.sin(t*0.13+s.phase)*0.045)*W
        const sy = (s.y+Math.cos(t*0.10+s.phase)*0.045)*H
        drawStar(sx,sy, s.r*(0.90+0.10*Math.sin(t*0.25+s.phase)), s.rot+t*0.18, s.color)
      })
      triangles.forEach(tr => {
        const tx = (tr.x+Math.sin(t*0.09+tr.phase)*0.035)*W
        const ty = (tr.y+Math.cos(t*0.11+tr.phase)*0.035)*H
        drawTriangle(tx,ty, tr.size*(0.92+0.08*Math.sin(t*0.20+tr.phase)), tr.rot+t*0.10, tr.color, tr.filled)
      })
      dots.forEach(d => {
        const dx = (d.x+Math.sin(t*0.14+d.phase)*0.055)*W
        const dy = (d.y+Math.cos(t*0.12+d.phase)*0.055)*H
        ctx.fillStyle=d.color; ctx.beginPath(); ctx.arc(dx,dy,d.r,0,TAU); ctx.fill()
      })

      animId = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    frame()

    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  )
}
