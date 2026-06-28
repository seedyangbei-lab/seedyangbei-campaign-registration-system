'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface CourseData {
  title: string
  instructor?: string
  date?: string
  timeStart?: string
  timeEnd?: string
  location?: string
  suitableAge?: string
  notes?: string
}

interface Props {
  course: CourseData
  initialImage?: string | null
  onClose: () => void
}

// ── colour helpers ─────────────────────────────────────────────────────────────
function lum(hex: string) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  const lin = (c: number) => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4)
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)
}
function textCol(bg: string) { return lum(bg) > 0.35 ? '#111111' : '#ffffff' }

// ── schemes ────────────────────────────────────────────────────────────────────
const SCHEMES = [
  { id: 'sky',    label: '天藍',   bg: '#38bdf8' },
  { id: 'lime',   label: '螢光綠', bg: '#a3e635' },
  { id: 'orange', label: '亮橘',   bg: '#fb923c' },
  { id: 'yellow', label: '亮黃',   bg: '#fde047' },
  { id: 'white',  label: '白',     bg: '#ffffff' },
  { id: 'black',  label: '黑',     bg: '#111111' },
  { id: 'pink',   label: '亮粉',   bg: '#f472b6' },
]

// ── fonts ──────────────────────────────────────────────────────────────────────
const ZH_FONTS = [
  { label: 'Noto Sans TC',           value: "'Noto Sans TC', sans-serif",           gf: 'Noto+Sans+TC:wght@300;400;500;700' },
  { label: 'Zen Kaku Gothic New',    value: "'Zen Kaku Gothic New', sans-serif",    gf: 'Zen+Kaku+Gothic+New:wght@400;500;700;900' },
  { label: 'Noto Serif TC',          value: "'Noto Serif TC', serif",               gf: 'Noto+Serif+TC:wght@300;400;500;700' },
  { label: 'Zen Maru Gothic',        value: "'Zen Maru Gothic', sans-serif",        gf: 'Zen+Maru+Gothic:wght@300;400;500;700' },
]
const EN_FONTS = [
  { label: 'Outfit',           value: "'Outfit', sans-serif",          gf: 'Outfit:wght@300;400;500;700' },
  { label: 'Space Mono',       value: "'Space Mono', monospace",       gf: 'Space+Mono:wght@400;700' },
  { label: 'Helvetica',        value: "'Helvetica Neue', Helvetica, Arial, sans-serif", gf: '' },
  { label: 'Betania Patmos',   value: "'Betania Patmos', 'Playfair Display', serif",    gf: 'Playfair+Display:wght@400;700' },
]

// ── dot pattern ────────────────────────────────────────────────────────────────
type DotShape = 'none' | 'circle' | 'star' | 'triangle' | 'heart' | 'custom'
type DotCoverage = 'photo' | 'full'
type DotArrangement = 'grid' | 'random'

const DOT_SHAPES: { id: DotShape; label: string; symbol: string }[] = [
  { id: 'none',     label: '無',   symbol: '○' },
  { id: 'circle',   label: '圓',   symbol: '●' },
  { id: 'star',     label: '星',   symbol: '★' },
  { id: 'triangle', label: '三角', symbol: '▲' },
  { id: 'heart',    label: '愛心', symbol: '♥' },
  { id: 'custom',   label: '文字', symbol: 'A' },
]

function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff }
}

function renderDotShape(
  shape: DotShape, customChar: string,
  x: number, y: number, size: number,
  fill: string, opacity: number, key: string
) {
  const op = opacity/100
  if (shape === 'none') return null
  if (shape === 'circle') return <circle key={key} cx={x} cy={y} r={size/2} fill={fill} opacity={op} />
  if (shape === 'star') {
    const pts = Array.from({length:5}).map((_,i) => {
      const a = (i*72-90)*Math.PI/180; const b = (i*72-90+36)*Math.PI/180
      const ro=size/2, ri=size/4.5
      return `${x+ro*Math.cos(a)},${y+ro*Math.sin(a)} ${x+ri*Math.cos(b)},${y+ri*Math.sin(b)}`
    }).join(' ')
    return <polygon key={key} points={pts} fill={fill} opacity={op} />
  }
  if (shape === 'triangle') {
    const h = size*0.866
    return <polygon key={key} points={`${x},${y-h/2} ${x-size/2},${y+h/2} ${x+size/2},${y+h/2}`} fill={fill} opacity={op} />
  }
  if (shape === 'heart') {
    const s = size/16
    return <path key={key} transform={`translate(${x},${y}) scale(${s})`} d="M0-4 C0-9-8-9-8-4 C-8 0 0 7 0 7 C0 7 8 0 8-4 C8-9 0-9 0-4Z" fill={fill} opacity={op} />
  }
  const char = customChar.charAt(0) || 'A'
  return <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fill={fill} opacity={op} style={{userSelect:'none'}}>{char}</text>
}

function DotPatternSvg({ shape, customChar, color, opacity, size, density, coverage, arrangement, seed, totalHeight, photoHeight, posterWidth }: {
  shape: DotShape; customChar: string; color: string; opacity: number
  size: number; density: number; coverage: DotCoverage; arrangement: DotArrangement; seed: number
  totalHeight: number; photoHeight: number; posterWidth: number
}) {
  if (shape === 'none') return null
  const W = posterWidth
  const H = coverage === 'full' ? totalHeight : photoHeight
  const gap = Math.max(size*1.4, (100-density)*0.75+size)
  const dots: React.ReactElement[] = []

  if (arrangement === 'grid') {
    const cols = Math.ceil(W/gap)+1, rows = Math.ceil(H/gap)+1
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      const offsetX = r%2===0 ? 0 : gap/2
      const el = renderDotShape(shape, customChar, c*gap+offsetX-gap/2, r*gap-gap/2, size, color, opacity, `d-${r}-${c}`)
      if (el) dots.push(el)
    }
  } else {
    const rng = seededRandom(seed), count = Math.floor((W*H)/(gap*gap)*1.2)
    for (let i=0; i<count; i++) {
      const el = renderDotShape(shape, customChar, rng()*W, rng()*H, size, color, opacity, `dr-${i}`)
      if (el) dots.push(el)
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', left:0, top:0, width:'100%', height: coverage==='full' ? `${totalHeight}px` : `${photoHeight}px`, pointerEvents:'none', zIndex:2 }}>
      {dots}
    </svg>
  )
}

const BORDER_TEXT = 'YANGBEI COMMUNITY · SEED COURSE · '

function useGoogleFont(gfParam: string) {
  useEffect(() => {
    if (!gfParam) return
    const id = `gf-${gfParam.replace(/[^a-z0-9]/gi,'')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id=id; link.rel='stylesheet'
    link.href=`https://fonts.googleapis.com/css2?family=${gfParam}&display=swap`
    document.head.appendChild(link)
  }, [gfParam])
}

// ── poster dimensions (A4 portrait proportions) ───────────────────────────────
// Figma: 595×843 — photo zone 539px = 63.9%, info 304px = 36.1%
const POSTER_W = 210
const POSTER_H = 297
const PHOTO_H  = Math.round(POSTER_H * 0.639)  // ≈ 190
const INFO_H   = POSTER_H - PHOTO_H             // ≈ 107

// ── canvas helpers ──────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const chars = text.split(''); const lines: string[] = []; let cur = ''
  for (const ch of chars) {
    const test = cur+ch
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur=ch }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

function drawDotsCanvas(ctx: CanvasRenderingContext2D, shape: DotShape, customChar: string, color: string, opacity: number, size: number, density: number, arrangement: DotArrangement, seed: number, W: number, H: number) {
  if (shape === 'none') return
  ctx.save(); ctx.globalAlpha = opacity/100
  const gap = Math.max(size*1.4, (100-density)*0.75+size)
  if (arrangement === 'grid') {
    const cols=Math.ceil(W/gap)+1, rows=Math.ceil(H/gap)+1
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      const offsetX = r%2===0 ? 0 : gap/2
      drawOneDot(ctx, shape, customChar, c*gap+offsetX-gap/2, r*gap-gap/2, size, color)
    }
  } else {
    const rng=seededRandom(seed), count=Math.floor((W*H)/(gap*gap)*1.2)
    for (let i=0; i<count; i++) drawOneDot(ctx, shape, customChar, rng()*W, rng()*H, size, color)
  }
  ctx.restore()
}

function drawOneDot(ctx: CanvasRenderingContext2D, shape: DotShape, customChar: string, x: number, y: number, size: number, color: string) {
  ctx.fillStyle=color; ctx.strokeStyle=color
  if (shape==='circle') { ctx.beginPath(); ctx.arc(x,y,size/2,0,Math.PI*2); ctx.fill() }
  else if (shape==='star') {
    ctx.beginPath()
    for (let i=0; i<5; i++) {
      const a=(i*72-90)*Math.PI/180, b=(i*72-90+36)*Math.PI/180, ro=size/2, ri=size/4.5
      i===0 ? ctx.moveTo(x+ro*Math.cos(a),y+ro*Math.sin(a)) : ctx.lineTo(x+ro*Math.cos(a),y+ro*Math.sin(a))
      ctx.lineTo(x+ri*Math.cos(b),y+ri*Math.sin(b))
    }
    ctx.closePath(); ctx.fill()
  } else if (shape==='triangle') {
    const h=size*0.866; ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x-size/2,y+h/2); ctx.lineTo(x+size/2,y+h/2); ctx.closePath(); ctx.fill()
  } else if (shape==='heart') {
    ctx.save(); ctx.translate(x,y); ctx.scale(size/16,size/16); ctx.beginPath()
    ctx.moveTo(0,-4); ctx.bezierCurveTo(0,-9,-8,-9,-8,-4); ctx.bezierCurveTo(-8,0,0,7,0,7)
    ctx.bezierCurveTo(0,7,8,0,8,-4); ctx.bezierCurveTo(8,-9,0,-9,0,-4); ctx.closePath(); ctx.fill(); ctx.restore()
  } else {
    ctx.font=`${size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(customChar.charAt(0)||'A', x, y)
  }
}

function drawBorderText(ctx: CanvasRenderingContext2D, text: string, color: string, fontFamily: string, W: number, H: number) {
  // U-shaped path with rounded corners (r=8):
  // left-bottom → up left side → arc top-left → right top → arc top-right → down right side → right-bottom
  const fs = 5.5, lsp = 3.5, margin = 8, r = 8
  ctx.save()
  ctx.globalAlpha = 0.42
  ctx.fillStyle = color
  ctx.font = `400 ${fs}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const charW = fs * 0.6 + lsp
  const rep = text.repeat(50)
  const chars = rep.split('')

  // Path segments (lengths):
  // A: left straight,  from (margin, H-margin) going UP to (margin, margin+r)
  // B: top-left arc,   quarter circle r=r, from left→top, arc length = r*π/2
  // C: top straight,   from (margin+r, margin) going RIGHT to (W-margin-r, margin)
  // D: top-right arc,  quarter circle r=r, from top→right, arc length = r*π/2
  // E: right straight, from (W-margin, margin+r) going DOWN to (W-margin, H-margin)
  const arcLen = r * Math.PI / 2
  const segA = H - margin - (margin + r)   // left straight
  const segB = arcLen                       // top-left corner arc
  const segC = W - 2*(margin + r)          // top straight
  const segD = arcLen                       // top-right corner arc
  const segE = H - margin - (margin + r)   // right straight

  const totalLen = segA + segB + segC + segD + segE

  let dist = 0
  for (const ch of chars) {
    if (dist >= totalLen) break
    const d = dist + charW/2

    let x: number, y: number, angle: number

    if (d < segA) {
      // Segment A: left side going UP
      x = margin
      y = (H - margin) - d
      angle = -Math.PI/2
    } else if (d < segA + segB) {
      // Segment B: top-left arc — center at (margin+r, margin+r)
      const t = (d - segA) / segB  // 0→1
      const a = Math.PI + t * Math.PI/2  // goes from 180° (left) to 270° (top)
      x = (margin + r) + r * Math.cos(a)
      y = (margin + r) + r * Math.sin(a)
      angle = a + Math.PI/2
    } else if (d < segA + segB + segC) {
      // Segment C: top going RIGHT
      x = margin + r + (d - segA - segB)
      y = margin
      angle = 0
    } else if (d < segA + segB + segC + segD) {
      // Segment D: top-right arc — center at (W-margin-r, margin+r)
      const t = (d - segA - segB - segC) / segD  // 0→1
      const a = -Math.PI/2 + t * Math.PI/2  // goes from 270° (top) to 0° (right)
      x = (W - margin - r) + r * Math.cos(a)
      y = (margin + r) + r * Math.sin(a)
      angle = a + Math.PI/2
    } else {
      // Segment E: right side going DOWN
      x = W - margin
      y = margin + r + (d - segA - segB - segC - segD)
      angle = Math.PI/2
    }

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.fillText(ch, 0, 0)
    ctx.restore()

    dist += charW
  }
  ctx.restore()
}

// Draw icon on canvas using Material Icons filled paths (matches Figma)
function drawIcon(ctx: CanvasRenderingContext2D, type: 'place'|'person', x: number, y: number, size: number, color: string) {
  ctx.save(); ctx.fillStyle=color
  ctx.translate(x - size/2, y - size/2)
  const s = size/24
  ctx.scale(s, s)
  if (type === 'place') {
    // ic:baseline-place — filled map pin (matches Figma node 1414:83)
    const p = new Path2D('M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z')
    ctx.fill(p)
  } else {
    // iconamoon:profile-fill — filled person (matches Figma node 1414:94)
    const p = new Path2D('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z')
    ctx.fill(p)
  }
  ctx.restore()
}

export default function CoursePosterEditor({ course, initialImage, onClose }: Props) {
  const [imgSrc, setImgSrc]     = useState<string|null>(initialImage||null)
  const [imgPos, setImgPos]     = useState({ x:0, y:0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx:0, my:0, px:0, py:0 })

  const [scheme, setScheme]     = useState(SCHEMES[2])
  const [customBg, setCustomBg] = useState('')

  // dot state
  const [dotShape, setDotShape]         = useState<DotShape>('circle')
  const [dotCustomChar, setDotCustomChar] = useState('央')
  const [dotColor, setDotColor]         = useState('')
  const [dotOpacity, setDotOpacity]     = useState(30)
  const [dotSize, setDotSize]           = useState(6)
  const [dotDensity, setDotDensity]     = useState(50)
  const [dotCoverage, setDotCoverage]   = useState<DotCoverage>('photo')
  const [dotArrangement, setDotArrangement] = useState<DotArrangement>('grid')
  const [dotSeed, setDotSeed]           = useState(42)

  // text / border
  const [textColorOverride, setTextColorOverride] = useState('')
  const [enTextColorOverride, setEnTextColorOverride] = useState('')
  const [borderOn, setBorderOn] = useState(true)

  // fonts
  const [zhFontIdx, setZhFontIdx]   = useState(0)
  const [enFontIdx, setEnFontIdx]   = useState(0)
  const [titleWeight, setTitleWeight]   = useState<300|400|500|700>(500)
  const [enWeight, setEnWeight]         = useState<300|400|500|700>(400)

  const [isExporting, setIsExporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeBg = customBg || scheme.bg
  const tc       = textColorOverride || textCol(activeBg)
  const dotOn    = dotShape !== 'none'
  const dotFill  = dotColor || activeBg
  const zhFont   = ZH_FONTS[zhFontIdx]
  const enFont   = EN_FONTS[enFontIdx]
  // enTc applies to ALL English text: time badge, border text — not just border
  const enTc     = enTextColorOverride || tc
  // icon color: use dotColor if set, otherwise fall back to tc (main text color)
  // avoids invisible icons when dotColor === activeBg (e.g. orange on orange)
  const iconColor = dotColor || tc

  // load fonts
  useGoogleFont(zhFont.gf)
  useGoogleFont(enFont.gf)
  ZH_FONTS.forEach(f => useGoogleFont(f.gf))
  EN_FONTS.forEach(f => useGoogleFont(f.gf))

  // ── drag ────────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return; e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx:e.clientX, my:e.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x: dragStart.current.px+e.clientX-dragStart.current.mx, y: dragStart.current.py+e.clientY-dragStart.current.my })
  }, [isDragging])
  const onMouseUp = useCallback(() => setIsDragging(false), [])
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imgSrc) return
    const t=e.touches[0]; setIsDragging(true)
    dragStart.current = { mx:t.clientX, my:t.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const t=e.touches[0]
    setImgPos({ x: dragStart.current.px+t.clientX-dragStart.current.mx, y: dragStart.current.py+t.clientY-dragStart.current.my })
  }, [isDragging])
  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  // ── upload ───────────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImgSrc(ev.target?.result as string)
      // Reset position & scale so image starts cover-fit without any offset
      setImgPos({x:0, y:0})
      setImgScale(1)
    }
    reader.readAsDataURL(file)
  }

  // ── Canvas export ────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await document.fonts.ready
      const SCALE = 3
      const canvas = document.createElement('canvas')
      canvas.width = POSTER_W*SCALE; canvas.height = POSTER_H*SCALE
      const ctx = canvas.getContext('2d')!
      ctx.scale(SCALE, SCALE)
      const W=POSTER_W, H=POSTER_H, PH=PHOTO_H, IH=INFO_H

      // background
      ctx.fillStyle = activeBg; ctx.fillRect(0,0,W,H)

      // photo zone
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,PH); ctx.clip()
      if (imgSrc) {
        const img = await new Promise<HTMLImageElement>((res,rej) => {
          const i=new Image(); i.crossOrigin='anonymous'
          i.onload=()=>res(i); i.onerror=rej; i.src=imgSrc
        })
        // contain-fit: scale image so it fits entirely within W×PH, centered
        // then apply user scale (zoom) and pan. Same math as preview CSS.
        const iw=img.naturalWidth, ih=img.naturalHeight
        const baseScale = Math.min(W/iw, PH/ih)   // contain: fit inside
        const containW = iw*baseScale, containH = ih*baseScale
        const scaledW = containW*imgScale, scaledH = containH*imgScale
        const cx = (W - scaledW)/2, cy2 = (PH - scaledH)/2
        ctx.drawImage(img, cx + imgPos.x, cy2 + imgPos.y, scaledW, scaledH)
      } else {
        ctx.fillStyle='#d6d3d1'; ctx.fillRect(0,0,W,PH)
      }
      // dots on photo
      if (dotOn && dotCoverage==='photo') {
        drawDotsCanvas(ctx, dotShape, dotCustomChar, dotFill, dotOpacity, dotSize, dotDensity, dotArrangement, dotSeed, W, PH)
      }
      // border text (3 sides: top, left, right)
      if (borderOn) {
        drawBorderText(ctx, BORDER_TEXT, enTc, enFont.value, W, PH)
      }
      ctx.restore()

      // dots full coverage
      if (dotOn && dotCoverage==='full') {
        ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); ctx.clip()
        drawDotsCanvas(ctx, dotShape, dotCustomChar, dotFill, dotOpacity, dotSize, dotDensity, dotArrangement, dotSeed, W, H)
        ctx.restore()
      }

      // divider
      ctx.fillStyle = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'
      ctx.fillRect(14,PH,W-28,0.5)

      // info zone (no clip height limit — let content flow)
      ctx.save(); ctx.beginPath(); ctx.rect(0,PH,W,H-PH); ctx.clip()

      const tagBg     = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)'
      const tagBorder = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.20)'  : 'rgba(255,255,255,0.35)'
      const timeBg    = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.09)'  : 'rgba(255,255,255,0.18)'

      let cy = PH+14
      // SEED COURSE tag
      const tagText = 'SEED COURSE'
      ctx.font=`700 7px ${enFont.value}`
      const tagW = ctx.measureText(tagText).width+14
      ctx.fillStyle=tagBg; roundRect(ctx,14,cy,tagW,14,7); ctx.fill()
      ctx.strokeStyle=tagBorder; ctx.lineWidth=0.5; roundRect(ctx,14,cy,tagW,14,7); ctx.stroke()
      ctx.fillStyle=enTc; ctx.textAlign='left'; ctx.fillText(tagText,21,cy+9.5)
      cy+=18

      // title
      const maxTitleW = W-28; let titleSize=17
      ctx.font=`${titleWeight} ${titleSize}px ${zhFont.value}`
      const titleStr = course.title||'課程名稱'
      while (titleSize>10 && ctx.measureText(titleStr).width>maxTitleW) {
        titleSize-=0.5; ctx.font=`${titleWeight} ${titleSize}px ${zhFont.value}`
      }
      const titleLines = wrapCanvasText(ctx, titleStr, maxTitleW)
      ctx.fillStyle=tc
      // max 3 lines
      titleLines.slice(0,3).forEach((line,i) => { ctx.fillText(line,14,cy+titleSize+i*titleSize*1.3) })
      cy += titleSize*1.3*Math.min(titleLines.length,3)+6

      // time badge — uses enTc
      const hasTime = course.timeStart||course.timeEnd||course.date
      if (hasTime) {
        const timeParts = [
          course.date||'',
          (course.date&&(course.timeStart||course.timeEnd)) ? '·' : '',
          course.timeStart||'',
          course.timeEnd ? `– ${course.timeEnd}` : '',
        ].filter(Boolean).join(' ')
        ctx.font=`${enWeight} 9px ${enFont.value}`
        const timeW = ctx.measureText(timeParts).width+10
        ctx.fillStyle=timeBg; roundRect(ctx,14,cy,timeW,16,4); ctx.fill()
        ctx.fillStyle=enTc; ctx.fillText(timeParts,19,cy+11)
        cy+=20
      }
      // location with icon
      if (course.location) {
        ctx.save(); ctx.globalAlpha=0.82
        drawIcon(ctx, 'place', 14+5, cy+9, 11, iconColor)
        ctx.restore()
        ctx.font=`400 9px ${zhFont.value}`; ctx.fillStyle=tc; ctx.globalAlpha=0.82
        const locLines = wrapCanvasText(ctx, course.location, maxTitleW-14)
        locLines.forEach((line,i) => { ctx.fillText(line,28,cy+10+i*13) })
        cy+=13*locLines.length+2; ctx.globalAlpha=1
      }
      // instructor with icon
      if (course.instructor) {
        ctx.save(); ctx.globalAlpha=0.62
        drawIcon(ctx, 'person', 14+5, cy+9, 11, iconColor)
        ctx.restore()
        ctx.font=`400 9px ${zhFont.value}`; ctx.fillStyle=tc; ctx.globalAlpha=0.62
        ctx.fillText(course.instructor,28,cy+10); ctx.globalAlpha=1
      }
      ctx.restore()

      const a=document.createElement('a')
      a.href=canvas.toDataURL('image/png'); a.download=`${course.title||'poster'}.png`; a.click()
    } catch (_e) { console.error('export failed',_e) }
    finally { setIsExporting(false) }
  }, [activeBg, tc, enTc, iconColor, dotFill, dotOn, dotShape, dotCustomChar, dotOpacity, dotSize, dotDensity, dotCoverage, dotArrangement, dotSeed, borderOn, imgSrc, imgPos, imgScale, enFont, zhFont, titleWeight, enWeight, course])

  // ── derived UI values ────────────────────────────────────────────────────────
  const tagBg     = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)'
  const tagBorder = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.20)'  : 'rgba(255,255,255,0.35)'
  const timeBg    = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.09)'  : 'rgba(255,255,255,0.18)'
  const divider   = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.15)'  : 'rgba(255,255,255,0.25)'

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full md:max-w-4xl md:mx-4 flex flex-col md:flex-row bg-white md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '95dvh', height: '95dvh' }}
      >
        {/* close */}
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        {/* ── LEFT: poster preview + upload + export ── */}
        <div className="md:w-[380px] flex-shrink-0 flex flex-col bg-stone-100 overflow-hidden">
          {/* poster area */}
          <div className="flex-1 flex flex-col items-center justify-center py-4 px-4 gap-3 overflow-hidden min-h-0">
            {/* poster — min height is A4, can grow if info zone has more content */}
            <div
              className="relative rounded-sm select-none flex-shrink-0"
              style={{ width:`${POSTER_W}px`, minHeight:`${POSTER_H}px`, backgroundColor: activeBg }}
            >
              {/* UPPER: photo zone */}
              <div
                className="absolute left-0 right-0 top-0 overflow-hidden"
                style={{ height:`${PHOTO_H}px`, cursor: imgSrc?(isDragging?'grabbing':'grab'):'default', zIndex:1 }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
              >
                {imgSrc ? (
                  // Preview uses object-fit:contain so the full image is visible.
                  // User drags/zooms to set crop area; canvas export uses cover-fit math.
                  <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
                    <img
                      src={imgSrc} alt="" draggable={false}
                      style={{
                        position:'absolute',
                        width:'100%',
                        height:'100%',
                        objectFit:'contain',
                        transform:`translate(${imgPos.x}px, ${imgPos.y}px) scale(${imgScale})`,
                        transformOrigin:'center center',
                        pointerEvents:'none', userSelect:'none', zIndex:0,
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-200" style={{zIndex:0}}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}

                {/* dots on photo */}
                {dotOn && dotCoverage==='photo' && (
                  <DotPatternSvg shape={dotShape} customChar={dotCustomChar} color={dotFill}
                    opacity={dotOpacity} size={dotSize} density={dotDensity}
                    coverage="photo" arrangement={dotArrangement} seed={dotSeed}
                    totalHeight={POSTER_H} photoHeight={PHOTO_H} posterWidth={POSTER_W} />
                )}

                {/* border text: U-shaped continuous path with rounded corners, left-bottom → left-top → right-top → right-bottom */}
                {borderOn && (
                  <svg viewBox={`0 0 ${POSTER_W} ${PHOTO_H}`} xmlns="http://www.w3.org/2000/svg"
                    style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3 }}>
                    <defs>
                      {/* U path with r=8 rounded corners at top-left and top-right */}
                      <path id="border-u-path"
                        d={`M 8,${PHOTO_H} L 8,16 Q 8,8 16,8 L ${POSTER_W-16},8 Q ${POSTER_W-8},8 ${POSTER_W-8},16 L ${POSTER_W-8},${PHOTO_H}`} />
                    </defs>
                    <text fontSize={5.5} letterSpacing={3} fill={enTc} opacity={0.42} fontFamily={enFont.value} dominantBaseline="middle">
                      <textPath href="#border-u-path" startOffset="0">
                        {BORDER_TEXT.repeat(20)}
                      </textPath>
                    </text>
                  </svg>
                )}
              </div>

              {/* dots full */}
              {dotOn && dotCoverage==='full' && (
                <div className="absolute inset-0 overflow-hidden" style={{zIndex:2,pointerEvents:'none'}}>
                  <DotPatternSvg shape={dotShape} customChar={dotCustomChar} color={dotFill}
                    opacity={dotOpacity} size={dotSize} density={dotDensity}
                    coverage="full" arrangement={dotArrangement} seed={dotSeed}
                    totalHeight={POSTER_H} photoHeight={PHOTO_H} posterWidth={POSTER_W} />
                </div>
              )}

              {/* divider — sits at bottom of photo zone */}
              <div style={{ position:'absolute', left:'14px', right:'14px', top:`${PHOTO_H}px`, height:'0.5px', background:divider, zIndex:4 }} />

              {/* LOWER: info zone — flows after photo zone, symmetric padding */}
              <div className="flex flex-col"
                style={{ marginTop:`${PHOTO_H}px`, padding:'14px 14px 14px', zIndex:3 }}>
                {/* SEED COURSE tag */}
                <div style={{
                  display:'inline-flex', alignItems:'center', marginBottom:'6px', width:'fit-content',
                  borderRadius:'20px', padding:'2px 7px',
                  background:tagBg, border:`0.5px solid ${tagBorder}`, color:enTc,
                  fontFamily:enFont.value, fontSize:'7px', letterSpacing:'0.16em', textTransform:'uppercase',
                  flexShrink:0,
                }}>SEED COURSE</div>

                {/* title */}
                <div style={{
                  color:tc, fontWeight:titleWeight, lineHeight:1.3, marginBottom:'5px', fontFamily:zhFont.value,
                  flexShrink:0, fontSize:'clamp(11px,4vw,17px)',
                  overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical',
                }}>
                  {course.title||'課程名稱'}
                </div>

                {/* time badge — uses enTc */}
                {(course.timeStart||course.timeEnd||course.date) && (
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:'3px', marginBottom:'4px', width:'fit-content',
                    borderRadius:'4px', padding:'2px 5px',
                    background:timeBg, fontFamily:enFont.value, fontWeight:enWeight, fontSize:'9px', color:enTc, letterSpacing:'0.04em',
                    flexShrink:0,
                  }}>
                    {course.date && <span>{course.date}</span>}
                    {course.date&&(course.timeStart||course.timeEnd) && <span style={{opacity:0.5,margin:'0 2px'}}>·</span>}
                    {course.timeStart && <span>{course.timeStart}</span>}
                    {course.timeEnd && <span> – {course.timeEnd}</span>}
                  </div>
                )}

                {/* location with icon */}
                {course.location && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'4px', marginBottom:'2px', flexShrink:0, overflow:'hidden' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={iconColor} stroke="none" aria-hidden="true" style={{flexShrink:0,marginTop:'1px',opacity:0.82}}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <div style={{
                      color:tc, fontFamily:zhFont.value, fontSize:'9px', opacity:0.82, lineHeight:1.4,
                      overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
                    }}>
                      {course.location}
                    </div>
                  </div>
                )}

                {/* instructor with icon */}
                {course.instructor && (
                  <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink:0, overflow:'hidden' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill={iconColor} stroke="none" aria-hidden="true" style={{flexShrink:0,opacity:0.62}}>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    <div style={{
                      color:tc, fontFamily:zhFont.value, fontSize:'9px', opacity:0.62,
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                    }}>
                      {course.instructor}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* zoom slider */}
            <div className="w-[210px] flex items-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400 flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M8 11h6" /></svg>
              <input type="range" min="0.5" max="3" step="0.05" value={imgScale} onChange={e => setImgScale(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400 flex-shrink-0"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" /></svg>
            </div>
          </div>

          {/* upload + export */}
          <div className="flex-shrink-0 bg-white border-t border-stone-200 px-4 py-3 space-y-2">
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-2.5 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
              {imgSrc ? '更換圖片' : '上傳圖片'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button onClick={handleExport} disabled={isExporting}
              className="w-full py-3 rounded-xl text-sm font-medium tracking-wide text-white transition-opacity disabled:opacity-60"
              style={{ background:'#f97316' }}>
              {isExporting ? '產生中...' : '完成！匯出 PNG'}
            </button>
          </div>
        </div>

        {/* ── RIGHT: controls ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* colour */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">主視覺色彩</p>
            <div className="flex gap-1.5 items-center">
              {SCHEMES.map(s => (
                <button key={s.id} title={s.label} aria-label={s.label}
                  onClick={() => { setScheme(s); setCustomBg('') }}
                  className="rounded flex-1 transition-transform hover:scale-105 flex-shrink-0"
                  style={{
                    height:'28px', background:s.bg,
                    outline: (!customBg&&scheme.id===s.id) ? '2px solid #f97316' : '2px solid transparent',
                    outlineOffset:'2px',
                    // white needs a border to be visible against white panel background
                    boxShadow: s.id==='white' ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'none',
                  }} />
              ))}
              <label className="rounded cursor-pointer transition-transform hover:scale-105 flex items-center justify-center flex-1 flex-shrink-0 relative"
                style={{
                  height:'28px', background:customBg||'#ffffff',
                  outline: customBg ? '2px solid #f97316' : '2px solid transparent',
                  outlineOffset:'2px',
                  boxShadow: !customBg ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'none',
                }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={customBg ? textCol(customBg) : '#888'} strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg>
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={customBg||scheme.bg} onChange={e => setCustomBg(e.target.value)} />
              </label>
            </div>
          </section>

          <hr className="border-stone-100" />

          {/* dot pattern */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">裝飾點</p>
            <div className="space-y-3">
              {/* shape */}
              <div className="flex gap-1">
                {DOT_SHAPES.map(d => (
                  <button key={d.id} onClick={() => setDotShape(d.id)}
                    className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all"
                    style={{
                      border: dotShape===d.id ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                      background: dotShape===d.id ? '#fff7ed' : 'transparent',
                    }}>
                    <span className="text-sm leading-none">{d.symbol}</span>
                    <span className="text-[8px] text-stone-400">{d.label}</span>
                  </button>
                ))}
              </div>

              {dotShape !== 'none' && (<>
                {/* custom char input */}
                {dotShape === 'custom' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 flex-shrink-0">自訂文字</span>
                    <input type="text" maxLength={1} value={dotCustomChar}
                      onChange={e => setDotCustomChar(e.target.value)}
                      className="w-10 text-center border border-stone-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </div>
                )}

                {/* coverage */}
                <div>
                  <p className="text-[10px] text-stone-400 mb-1">放置位置</p>
                  <div className="flex gap-1.5">
                    {(['photo','full'] as const).map(c => (
                      <button key={c} onClick={() => setDotCoverage(c)}
                        className="flex-1 py-1.5 rounded-lg border text-[11px] transition-all"
                        style={{
                          border: dotCoverage===c ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                          background: dotCoverage===c ? '#fff7ed' : 'transparent', color:'#374151',
                        }}>
                        {c==='photo' ? '照片上' : '滿版'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* arrangement */}
                <div>
                  <p className="text-[10px] text-stone-400 mb-1">排列方式</p>
                  <div className="flex gap-1.5">
                    {(['grid','random'] as const).map(a => (
                      <button key={a} onClick={() => { setDotArrangement(a); if(a==='random') setDotSeed(s=>s+1) }}
                        className="flex-1 py-1.5 rounded-lg border text-[11px] transition-all flex items-center justify-center gap-1"
                        style={{
                          border: dotArrangement===a ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                          background: dotArrangement===a ? '#fff7ed' : 'transparent', color:'#374151',
                        }}>
                        {a==='grid' ? '整齊格狀' : (
                          <>
                            隨機散落
                            {dotArrangement==='random' && (
                              <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center" onClick={e=>{e.stopPropagation();setDotSeed(s=>s+1)}}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* dot color */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 flex-shrink-0">裝飾點顏色</span>
                  <label className="relative w-5 h-5 rounded border border-stone-200 overflow-hidden cursor-pointer flex-shrink-0">
                    <div className="w-full h-full" style={{ background:dotFill }} />
                    <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      value={dotFill} onChange={e => setDotColor(e.target.value)} />
                  </label>
                  <span className="text-[10px] text-stone-400">{dotFill.toUpperCase()}</span>
                  {dotColor && (
                    <button onClick={() => setDotColor('')} className="text-[9px] text-stone-400 hover:text-orange-500 transition-colors ml-auto">重設</button>
                  )}
                </div>

                {/* opacity */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 flex-shrink-0 w-8">透明</span>
                  <input type="range" min="5" max="100" step="1" value={dotOpacity}
                    onChange={e => setDotOpacity(parseInt(e.target.value))} className="flex-1 accent-orange-500" />
                  <span className="text-[10px] text-stone-400 w-8 text-right">{dotOpacity}%</span>
                </div>

                {/* size */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 flex-shrink-0 w-8">大小</span>
                  <input type="range" min="2" max="24" step="0.5" value={dotSize}
                    onChange={e => setDotSize(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                  <span className="text-[10px] text-stone-400 w-8 text-right">{dotSize}px</span>
                </div>

                {/* density */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 flex-shrink-0 w-8">密度</span>
                  <input type="range" min="10" max="90" step="1" value={dotDensity}
                    onChange={e => setDotDensity(parseInt(e.target.value))} className="flex-1 accent-orange-500" />
                  <span className="text-[10px] text-stone-400 w-8 text-right">{dotDensity}</span>
                </div>
              </>)}
            </div>
          </section>

          <hr className="border-stone-100" />

          {/* ZH font */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-1">
              中文字體設定 <span className="normal-case font-normal opacity-70">標題 / 地點</span>
            </p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {ZH_FONTS.map((f,i) => (
                <button key={f.label} onClick={() => setZhFontIdx(i)}
                  className="text-left px-2 py-2 rounded-lg border transition-all"
                  style={{
                    fontFamily:f.value, fontSize:'10px',
                    border: zhFontIdx===i ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                    background: zhFontIdx===i ? '#fff7ed' : 'transparent', color:'#374151',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mb-1">標題粗細</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {([300,400,500,700] as const).map(w => (
                <button key={w} onClick={() => setTitleWeight(w)}
                  className="py-1.5 rounded-lg border text-[11px] transition-all"
                  style={{
                    fontWeight:w,
                    border: titleWeight===w ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                    background: titleWeight===w ? '#fff7ed' : 'transparent', color:'#374151',
                  }}>
                  {w===300?'細':w===400?'標準':w===500?'中':'粗'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 flex-shrink-0">字體顏色</span>
              <label className="relative w-5 h-5 rounded border border-stone-200 overflow-hidden cursor-pointer flex-shrink-0">
                <div className="w-full h-full" style={{ background:tc }} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={tc} onChange={e => setTextColorOverride(e.target.value)} />
              </label>
              <span className="text-[10px] text-stone-400">{tc.toUpperCase()}</span>
              {textColorOverride && (
                <button onClick={() => setTextColorOverride('')} className="text-[9px] text-stone-400 hover:text-orange-500 transition-colors ml-auto">重設自動</button>
              )}
            </div>
          </section>

          <hr className="border-stone-100" />

          {/* EN font */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-1">
              英文字體設定 <span className="normal-case font-normal opacity-70">時間 / 邊框</span>
            </p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {EN_FONTS.map((f,i) => (
                <button key={f.label} onClick={() => setEnFontIdx(i)}
                  className="text-left px-2 py-2 rounded-lg border transition-all"
                  style={{
                    fontFamily:f.value, fontSize:'10px',
                    border: enFontIdx===i ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                    background: enFontIdx===i ? '#fff7ed' : 'transparent', color:'#374151',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400 mb-1">字體粗細</p>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {([300,400,500,700] as const).map(w => (
                <button key={w} onClick={() => setEnWeight(w)}
                  className="py-1.5 rounded-lg border text-[11px] transition-all"
                  style={{
                    fontWeight:w,
                    border: enWeight===w ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                    background: enWeight===w ? '#fff7ed' : 'transparent', color:'#374151',
                  }}>
                  {w===300?'細':w===400?'標準':w===500?'中':'粗'}
                </button>
              ))}
            </div>
            {/* EN color picker — controls ALL English text (time badge + border text) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 flex-shrink-0">字體顏色</span>
              <label className="relative w-5 h-5 rounded border border-stone-200 overflow-hidden cursor-pointer flex-shrink-0">
                <div className="w-full h-full" style={{ background:enTc }} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={enTc} onChange={e => setEnTextColorOverride(e.target.value)} />
              </label>
              <span className="text-[10px] text-stone-400">{enTc.toUpperCase()}</span>
              {enTextColorOverride && (
                <button onClick={() => setEnTextColorOverride('')} className="text-[9px] text-stone-400 hover:text-orange-500 transition-colors ml-auto">重設自動</button>
              )}
            </div>
          </section>

          <hr className="border-stone-100" />

          {/* border text toggle */}
          <section>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase">邊框英文</p>
              <button onClick={() => setBorderOn(v => !v)} aria-label="切換邊框文字"
                className="relative rounded-full transition-colors flex-shrink-0"
                style={{ height:'18px', width:'30px', background: borderOn ? '#f97316' : '#d1d5db' }}>
                <span className="absolute top-0.5 rounded-full bg-white transition-all"
                  style={{ width:'14px', height:'14px', left: borderOn ? '14px' : '2px' }} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
