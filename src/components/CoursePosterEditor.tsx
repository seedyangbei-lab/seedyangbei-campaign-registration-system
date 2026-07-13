'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface CourseData {
  id?: string
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
  photos?: string[]
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

// ── 主視覺色彩：2026 年度流行色（Pantone／WGSN·Coloro 趨勢色彙整，刻意跨色相避開相近色）──
// 固定黑、白置於倒數兩個，最後一個為自訂色（+）
const SCHEMES = [
  { id: 'lava',    label: '熔岩橘',   bg: '#C13A1F' }, // Lava Falls（Pantone 2026 亮色）
  { id: 'amber',   label: '琥珀金',   bg: '#D4A017' }, // Amber Haze（Coloro SS26 關鍵色）
  { id: 'sage',    label: '鼠尾草綠', bg: '#8A9A6B' }, // Sage Green（2026 大地色系）
  { id: 'mint',    label: '果凍薄荷', bg: '#3FBE8B' }, // Jelly Mint（Coloro SS26 關鍵色）
  { id: 'teal',    label: '蛻變藍綠', bg: '#1F6B72' }, // Transformative Teal（WGSN×Coloro 2026 年度色）
  { id: 'aura',    label: '靜謐藍',   bg: '#7C9FD9' }, // Blue Aura（Coloro SS26 關鍵色）
  { id: 'alex',    label: '紫水晶',   bg: '#6E4E85' }, // Alexandrite（Pantone 2026 亮色）
  { id: 'fuchsia', label: '電光桃紅', bg: '#D6308F' }, // Electric Fuchsia（Coloro SS26 關鍵色）
  { id: 'cocoa',   label: '可可棕',   bg: '#5C4033' }, // Cocoa Powder（2026 大地色系）
  { id: 'angora',  label: '安哥拉駝', bg: '#C9A876' }, // Angora（2026 大地色系）
  { id: 'cloud',   label: '雲舞灰',   bg: '#B5AFA3' }, // Cloud Dancer 延伸中性灰（Pantone 2026 年度色）
  { id: 'black',   label: '黑',       bg: '#111111' },
  { id: 'white',   label: '白',       bg: '#ffffff' },
]

// ── fonts（原 4 中 + 4 英，額外補上熱門 Google Fonts 各 4 款，共 8+8）──────────────
const ZH_FONTS = [
  { label: 'Noto Sans TC',        value: "'Noto Sans TC', sans-serif",        gf: 'Noto+Sans+TC:wght@300;400;500;700' },
  { label: 'Zen Kaku Gothic New', value: "'Zen Kaku Gothic New', sans-serif", gf: 'Zen+Kaku+Gothic+New:wght@400;500;700;900' },
  { label: 'Noto Serif TC',       value: "'Noto Serif TC', serif",            gf: 'Noto+Serif+TC:wght@300;400;500;700' },
  { label: 'Zen Maru Gothic',     value: "'Zen Maru Gothic', sans-serif",     gf: 'Zen+Maru+Gothic:wght@300;400;500;700' },
  { label: 'cwTeX Kai',           value: "'cwTeX Kai', serif",                gf: 'cwTeX+Kai' },
  { label: 'cwTeX Yen',           value: "'cwTeX Yen', sans-serif",           gf: 'cwTeX+Yen' },
  { label: 'Klee One',            value: "'Klee One', sans-serif",            gf: 'Klee+One:wght@400;600' },
  { label: 'Zen Old Mincho',      value: "'Zen Old Mincho', serif",           gf: 'Zen+Old+Mincho:wght@400;500;600;700' },
]
const EN_FONTS = [
  { label: 'Outfit',              value: "'Outfit', sans-serif",                            gf: 'Outfit:wght@300;400;500;700' },
  { label: 'Space Mono',          value: "'Space Mono', monospace",                          gf: 'Space+Mono:wght@400;700' },
  { label: 'Helvetica',           value: "'Helvetica Neue', Helvetica, Arial, sans-serif",   gf: '' },
  { label: 'Betania Patmos',      value: "'Betania Patmos', 'Playfair Display', serif",      gf: 'Playfair+Display:wght@400;700' },
  { label: 'Space Grotesk',       value: "'Space Grotesk', sans-serif",                      gf: 'Space+Grotesk:wght@300;400;500;700' },
  { label: 'Instrument Serif',    value: "'Instrument Serif', serif",                        gf: 'Instrument+Serif' },
  { label: 'DM Sans',             value: "'DM Sans', sans-serif",                            gf: 'DM+Sans:wght@300;400;500;700' },
  { label: 'Bricolage Grotesque', value: "'Bricolage Grotesque', sans-serif",                gf: 'Bricolage+Grotesque:wght@300;400;500;700' },
]

// Load all Google Fonts once (no hooks in loops)
function loadAllGoogleFonts() {
  const allGf = [...ZH_FONTS, ...EN_FONTS].map(f => f.gf).filter(Boolean)
  allGf.forEach(gfParam => {
    const id = `gf-${gfParam.replace(/[^a-z0-9]/gi,'')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${gfParam}&display=swap`
    document.head.appendChild(link)
  })
}

// ── dot pattern ────────────────────────────────────────────────────────────────
type DotShape = 'none' | 'circle' | 'star' | 'triangle' | 'heart' | 'custom'
type DotCoverage = 'photo' | 'full'
type DotArrangement = 'grid' | 'random'

const DOT_SHAPES: { id: DotShape; label: string; symbol: string }[] = [
  { id: 'none',     label: '無',   symbol: '✕' },
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
      const a=(i*72-90)*Math.PI/180; const b=(i*72-90+36)*Math.PI/180
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

// ── poster dimensions（A4：210×297）─────────────────────────────────────────────
const POSTER_W = 210
const POSTER_H = 297
const PHOTO_H  = Math.round(POSTER_H * 0.639)  // ≈ 190
const INFO_PAD = 16  // uniform 16px padding all sides in info zone

// ── canvas helpers ────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// 手動逐字繪製＋間距，確保跨瀏覽器一致的字距效果（不依賴 ctx.letterSpacing）
function measureSpaced(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + spacing
  return text.length ? w - spacing : 0
}
function fillTextSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number, spacing = 0): string[] {
  const chars = text.split(''); const lines: string[] = []; let cur = ''
  for (const ch of chars) {
    const test = cur+ch
    if (measureSpaced(ctx, test, spacing) > maxW && cur) { lines.push(cur); cur=ch }
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

function drawBorderText(ctx: CanvasRenderingContext2D, text: string, color: string, fontFamily: string, fontSize: number, letterSpacing: number, W: number, H: number) {
  const fs=fontSize, lsp=letterSpacing, margin=8, r=8
  ctx.save()
  ctx.globalAlpha=0.42; ctx.fillStyle=color
  ctx.font=`400 ${fs}px ${fontFamily}`
  ctx.textAlign='center'; ctx.textBaseline='middle'
  const charW=fs*0.6+lsp
  const rep=text.repeat(50)
  const chars=rep.split('')
  const arcLen=r*Math.PI/2
  const segA=H-margin-(margin+r)
  const segB=arcLen
  const segC=W-2*(margin+r)
  const segD=arcLen
  const segE=H-margin-(margin+r)
  const totalLen=segA+segB+segC+segD+segE
  let dist=0
  for (const ch of chars) {
    if (dist>=totalLen) break
    const d=dist+charW/2
    let x: number, y: number, angle: number
    if (d<segA) {
      x=margin; y=(H-margin)-d; angle=-Math.PI/2
    } else if (d<segA+segB) {
      const t=(d-segA)/segB
      const a=Math.PI+t*Math.PI/2
      x=(margin+r)+r*Math.cos(a); y=(margin+r)+r*Math.sin(a); angle=a+Math.PI/2
    } else if (d<segA+segB+segC) {
      x=margin+r+(d-segA-segB); y=margin; angle=0
    } else if (d<segA+segB+segC+segD) {
      const t=(d-segA-segB-segC)/segD
      const a=-Math.PI/2+t*Math.PI/2
      x=(W-margin-r)+r*Math.cos(a); y=(margin+r)+r*Math.sin(a); angle=a+Math.PI/2
    } else {
      x=W-margin; y=margin+r+(d-segA-segB-segC-segD); angle=Math.PI/2
    }
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.fillText(ch,0,0); ctx.restore()
    dist+=charW
  }
  ctx.restore()
}

function drawIcon(ctx: CanvasRenderingContext2D, type: 'place'|'person', x: number, y: number, size: number, color: string) {
  ctx.save(); ctx.fillStyle=color
  ctx.translate(x-size/2, y-size/2)
  const s=size/24; ctx.scale(s,s)
  if (type==='place') {
    ctx.fill(new Path2D('M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'))
  } else {
    ctx.fill(new Path2D('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'))
  }
  ctx.restore()
}

// ── 固定字重（原「粗細」選項已依需求移除，改用固定值）──────────────────────────────
const TITLE_WEIGHT = 700
const EN_WEIGHT = 500

// ── 小型共用 UI ────────────────────────────────────────────────────────────────
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function MinusIcon({ className }: { className?: string }) {
  return <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
}
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
}

function SliderRow({ label, min, max, step, value, onChange, unit, decimals }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v:number)=>void; unit: string; decimals?: number
}) {
  return (
    <div className="bg-stone-100 rounded-lg px-2 py-1 flex-1">
      <p className="text-[11px] text-stone-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))} className="flex-1 accent-orange-500 h-5" />
        <span className="text-[11px] font-medium text-orange-600 w-8 text-right shrink-0">
          {decimals!==undefined ? value.toFixed(decimals) : value}{unit}
        </span>
      </div>
    </div>
  )
}

export default function CoursePosterEditor({ course, initialImage, photos, onClose }: Props) {
  const storageKey = `yangbei-poster-settings:${course.id || 'default'}`

  const [imgSrc, setImgSrc]     = useState<string|null>(initialImage||null)
  const [imgPos, setImgPos]     = useState({ x:0, y:0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx:0, my:0, px:0, py:0 })

  const [scheme, setScheme]   = useState(SCHEMES[0])
  const [customBg, setCustomBg] = useState('')

  const [activeTab, setActiveTab] = useState<'字體設定'|'裝飾'>('字體設定')

  const [dotShape, setDotShape]             = useState<DotShape>('circle')
  const dotShapeMemory = useRef<DotShape>('circle')
  const [dotCustomChar, setDotCustomChar]   = useState('央')
  const [dotColor, setDotColor]             = useState('')
  const [dotOpacity, setDotOpacity]         = useState(30)
  const [dotSize, setDotSize]               = useState(6)
  const [dotDensity, setDotDensity]         = useState(50)
  const [dotCoverage, setDotCoverage]       = useState<DotCoverage>('photo')
  const [dotArrangement, setDotArrangement] = useState<DotArrangement>('grid')
  const [dotSeed, setDotSeed]               = useState(42)

  const [textColorOverride, setTextColorOverride]     = useState('')
  const [enTextColorOverride, setEnTextColorOverride] = useState('')
  const [borderOn, setBorderOn] = useState(true)
  const [borderText, setBorderText] = useState('YANGBEI COMMUNITY · SEED COURSE · ')

  const [zhFontIdx, setZhFontIdx] = useState(0)
  const [enFontIdx, setEnFontIdx] = useState(0)
  const [zhFontSize, setZhFontSize] = useState(17)   // 標題／地點
  const [enFontSize, setEnFontSize] = useState(9)    // 時間／邊框裝飾

  const [letterSpacingPct, setLetterSpacingPct] = useState(2)   // 字距：文字與文字間的距離（標題／內文共用）
  const [lineSpacingMult, setLineSpacingMult]   = useState(1.5) // 行距：標題與內文（課程時間起）的距離

  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const [isExporting, setIsExporting] = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)
  const panelRef   = useRef<HTMLDivElement>(null)   // preview column（用來量測可用高度）
  const [previewScale, setPreviewScale] = useState(1)

  // Load all Google Fonts once on mount — no hooks in loops
  useEffect(() => { loadAllGoogleFonts() }, [])

  // ── 讀取上次「儲存設定」──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.schemeId) { const found = SCHEMES.find(x=>x.id===s.schemeId); if (found) setScheme(found) }
      if (typeof s.customBg === 'string') setCustomBg(s.customBg)
      if (typeof s.dotShape === 'string') setDotShape(s.dotShape)
      if (typeof s.dotCustomChar === 'string') setDotCustomChar(s.dotCustomChar)
      if (typeof s.dotColor === 'string') setDotColor(s.dotColor)
      if (typeof s.dotOpacity === 'number') setDotOpacity(s.dotOpacity)
      if (typeof s.dotSize === 'number') setDotSize(s.dotSize)
      if (typeof s.dotDensity === 'number') setDotDensity(s.dotDensity)
      if (typeof s.dotCoverage === 'string') setDotCoverage(s.dotCoverage)
      if (typeof s.dotArrangement === 'string') setDotArrangement(s.dotArrangement)
      if (typeof s.textColorOverride === 'string') setTextColorOverride(s.textColorOverride)
      if (typeof s.enTextColorOverride === 'string') setEnTextColorOverride(s.enTextColorOverride)
      if (typeof s.borderOn === 'boolean') setBorderOn(s.borderOn)
      if (typeof s.borderText === 'string') setBorderText(s.borderText)
      if (typeof s.zhFontIdx === 'number') setZhFontIdx(s.zhFontIdx)
      if (typeof s.enFontIdx === 'number') setEnFontIdx(s.enFontIdx)
      if (typeof s.zhFontSize === 'number') setZhFontSize(s.zhFontSize)
      if (typeof s.enFontSize === 'number') setEnFontSize(s.enFontSize)
      if (typeof s.letterSpacingPct === 'number') setLetterSpacingPct(s.letterSpacingPct)
      if (typeof s.lineSpacingMult === 'number') setLineSpacingMult(s.lineSpacingMult)
    } catch (_e) { /* ignore malformed cache */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSettings = () => {
    const payload = {
      schemeId: scheme.id, customBg,
      dotShape, dotCustomChar, dotColor, dotOpacity, dotSize, dotDensity, dotCoverage, dotArrangement,
      textColorOverride, enTextColorOverride, borderOn, borderText,
      zhFontIdx, enFontIdx, zhFontSize, enFontSize, letterSpacingPct, lineSpacingMult,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch (_e) { /* localStorage 不可用時靜默略過 */ }
  }

  // ResizeObserver: 量測預覽欄可用高度，扣掉固定的底部按鈕區
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const BOTTOM_H = 140  // zoom row + 儲存/變更圖片 buttons + 匯出按鈕 + 分隔線
    const PADDING  = 32
    const update = () => {
      const availH = el.clientHeight - BOTTOM_H - PADDING
      const availW = el.clientWidth  - 32
      setPreviewScale(Math.min(availH/POSTER_H, availW/POSTER_W, 1))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeBg  = customBg || scheme.bg
  const tc        = textColorOverride   || textCol(activeBg)
  const enTc      = enTextColorOverride || tc
  const dotOn     = dotShape !== 'none'
  const dotFill   = dotColor || activeBg
  const iconColor = dotColor || tc
  const zhFont    = ZH_FONTS[zhFontIdx]
  const enFont    = EN_FONTS[enFontIdx]

  const zhLetterPx  = zhFontSize * (letterSpacingPct/100)
  const enLetterPx  = enFontSize * (letterSpacingPct/100)
  const locFontSize = Math.max(8, Math.round(zhFontSize*0.53))
  const borderFontSize = Math.max(4, +(enFontSize*0.61).toFixed(1))
  const titleGap    = Math.round(6 * lineSpacingMult)

  const tagBg     = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.12)'  : 'rgba(255,255,255,0.22)'
  const tagBorder = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.20)'  : 'rgba(255,255,255,0.35)'
  const timeBg    = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.09)'  : 'rgba(255,255,255,0.18)'
  const divider   = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.15)'  : 'rgba(255,255,255,0.25)'

  const scaledW = POSTER_W * previewScale
  const scaledH = POSTER_H * previewScale

  // ── drag（拖曳照片位置）─────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return; e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx:e.clientX, my:e.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x:dragStart.current.px+e.clientX-dragStart.current.mx, y:dragStart.current.py+e.clientY-dragStart.current.my })
  }, [isDragging])
  const onMouseUp   = useCallback(() => setIsDragging(false), [])
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imgSrc) return
    e.preventDefault()
    const t=e.touches[0]; setIsDragging(true)
    dragStart.current = { mx:t.clientX, my:t.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const t=e.touches[0]
    setImgPos({ x:dragStart.current.px+t.clientX-dragStart.current.mx, y:dragStart.current.py+t.clientY-dragStart.current.my })
  }, [isDragging])
  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  // ── 上傳 / 變更圖片 ────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if (!file) return
    const reader=new FileReader()
    reader.onload = ev => { setImgSrc(ev.target?.result as string); setImgPos({x:0,y:0}); setImgScale(1); setShowPhotoPicker(false) }
    reader.readAsDataURL(file)
  }
  const pickPhoto = (url: string) => {
    setImgSrc(url); setImgPos({x:0,y:0}); setImgScale(1); setShowPhotoPicker(false)
  }

  // ── Canvas export ─────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await document.fonts.ready
      const SCALE=3
      const canvas=document.createElement('canvas')
      canvas.width=POSTER_W*SCALE; canvas.height=POSTER_H*SCALE
      const ctx=canvas.getContext('2d')!
      ctx.scale(SCALE,SCALE)
      const W=POSTER_W, H=POSTER_H, PH=PHOTO_H

      // background
      ctx.fillStyle=activeBg; ctx.fillRect(0,0,W,H)

      // photo zone (clipped)
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,PH); ctx.clip()
      if (imgSrc) {
        const img=await new Promise<HTMLImageElement>((res,rej)=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=imgSrc })
        const iw=img.naturalWidth, ih=img.naturalHeight
        const containScale=Math.min(W/iw, PH/ih)
        const scaledW=iw*containScale*imgScale, scaledH=ih*containScale*imgScale
        ctx.drawImage(img, W/2-scaledW/2+imgPos.x, PH/2-scaledH/2+imgPos.y, scaledW, scaledH)
      } else {
        ctx.fillStyle='#d6d3d1'; ctx.fillRect(0,0,W,PH)
      }
      // dots on photo
      if (dotOn && dotCoverage==='photo') drawDotsCanvas(ctx,dotShape,dotCustomChar,dotFill,dotOpacity,dotSize,dotDensity,dotArrangement,dotSeed,W,PH)
      // border text
      if (borderOn && borderText) drawBorderText(ctx,borderText,enTc,enFont.value,borderFontSize,enLetterPx,W,PH)
      // SEED COURSE tag — photo zone top-left, 16px from edges
      const tagText='SEED COURSE'
      ctx.font=`700 7px ${enFont.value}`
      const tagW=measureSpaced(ctx,tagText,enLetterPx)+14
      const tagBgC = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)'
      const tagBdC = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.35)'
      ctx.fillStyle=tagBgC; roundRect(ctx,INFO_PAD,INFO_PAD,tagW,14,7); ctx.fill()
      ctx.strokeStyle=tagBdC; ctx.lineWidth=0.5; roundRect(ctx,INFO_PAD,INFO_PAD,tagW,14,7); ctx.stroke()
      ctx.fillStyle=enTc; ctx.textAlign='left'; fillTextSpaced(ctx,tagText,INFO_PAD+7,INFO_PAD+9.5,enLetterPx)
      ctx.restore()

      // full-coverage dots (no clip)
      if (dotOn && dotCoverage==='full') drawDotsCanvas(ctx,dotShape,dotCustomChar,dotFill,dotOpacity,dotSize,dotDensity,dotArrangement,dotSeed,W,H)

      // divider
      ctx.fillStyle=lum(activeBg)>0.35 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'
      ctx.fillRect(INFO_PAD,PH,W-INFO_PAD*2,0.5)

      // info zone — 16px padding, NO clip so content flows freely
      ctx.save()
      const timeBgC=lum(activeBg)>0.35 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.18)'
      const maxTitleW=W-INFO_PAD*2

      let cy=PH+INFO_PAD

      // title
      let titleSize=zhFontSize
      ctx.font=`${TITLE_WEIGHT} ${titleSize}px ${zhFont.value}`
      const titleStr=course.title||'課程名稱'
      while (titleSize>10 && measureSpaced(ctx,titleStr,zhLetterPx*(titleSize/zhFontSize))>maxTitleW) { titleSize-=0.5; ctx.font=`${TITLE_WEIGHT} ${titleSize}px ${zhFont.value}` }
      const titleLines=wrapCanvasText(ctx,titleStr,maxTitleW,zhLetterPx)
      ctx.fillStyle=tc; ctx.textAlign='left'
      titleLines.slice(0,3).forEach((line,i)=>{ fillTextSpaced(ctx,line,INFO_PAD,cy+titleSize+i*titleSize*1.3,zhLetterPx) })
      cy+=titleSize*1.3*Math.min(titleLines.length,3)+titleGap

      // time badge
      if (course.timeStart||course.timeEnd||course.date) {
        const timeParts=[course.date||'',(course.date&&(course.timeStart||course.timeEnd))?'·':'',course.timeStart||'',course.timeEnd?`– ${course.timeEnd}`:''].filter(Boolean).join(' ')
        ctx.font=`${EN_WEIGHT} ${enFontSize}px ${enFont.value}`
        const tw=measureSpaced(ctx,timeParts,enLetterPx)+10
        ctx.fillStyle=timeBgC; roundRect(ctx,INFO_PAD,cy,tw,enFontSize+7,4); ctx.fill()
        ctx.fillStyle=enTc; fillTextSpaced(ctx,timeParts,INFO_PAD+5,cy+enFontSize+2,enLetterPx)
        cy+=enFontSize+11
      }
      // location
      if (course.location) {
        ctx.save(); ctx.globalAlpha=0.82
        drawIcon(ctx,'place',INFO_PAD+5,cy+9,11,iconColor)
        ctx.restore()
        ctx.font=`400 ${locFontSize}px ${zhFont.value}`; ctx.fillStyle=tc; ctx.globalAlpha=0.82
        wrapCanvasText(ctx,course.location,maxTitleW-14,zhLetterPx).forEach((line,i)=>{ fillTextSpaced(ctx,line,INFO_PAD+14,cy+10+i*13,zhLetterPx) })
        cy+=13+2; ctx.globalAlpha=1
      }
      // instructor
      if (course.instructor) {
        ctx.save(); ctx.globalAlpha=0.62
        drawIcon(ctx,'person',INFO_PAD+5,cy+9,11,iconColor)
        ctx.restore()
        ctx.font=`400 ${locFontSize}px ${zhFont.value}`; ctx.fillStyle=tc; ctx.globalAlpha=0.62
        fillTextSpaced(ctx,course.instructor,INFO_PAD+14,cy+10,zhLetterPx); ctx.globalAlpha=1
      }
      ctx.restore()

      const a=document.createElement('a')
      a.href=canvas.toDataURL('image/png'); a.download=`${course.title||'poster'}.png`; a.click()
    } catch (_e) { console.error('export failed',_e) }
    finally { setIsExporting(false) }
  }, [activeBg,tc,enTc,iconColor,dotFill,dotOn,dotShape,dotCustomChar,dotOpacity,dotSize,dotDensity,dotCoverage,dotArrangement,dotSeed,borderOn,borderText,imgSrc,imgPos,imgScale,enFont,zhFont,zhFontSize,enFontSize,zhLetterPx,enLetterPx,locFontSize,borderFontSize,titleGap,course])

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full md:w-[960px] md:max-w-[960px] md:mx-4 flex flex-col md:flex-row bg-white md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl h-[95dvh] max-h-[95dvh] md:h-[755px] md:max-h-[755px]">

        {/* close（白底方圓角浮動按鈕，貼齊整個彈窗右上角） */}
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-4 right-4 z-20 bg-white border border-stone-200 rounded-md p-1.5 hover:bg-stone-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-600"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* ── LEFT：海報編輯器（controls） ── */}
        <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-stone-100 px-4 pt-5 pb-4">
            <h3 className="text-stone-600 font-bold text-xl">海報編輯器</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {/* 主視覺色彩 */}
            <section>
              <p className="text-sm font-medium text-stone-500 mb-2">主視覺色彩</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {SCHEMES.map(s=>(
                  <button key={s.id} title={s.label} aria-label={s.label}
                    onClick={()=>{ setScheme(s); setCustomBg('') }}
                    className="rounded-full transition-transform active:scale-95 shrink-0"
                    style={{ width:'28px', height:'28px', background:s.bg, outline:(!customBg&&scheme.id===s.id)?'2px solid #f97316':'2px solid transparent', outlineOffset:'2px',
                      boxShadow:s.id==='white'?'inset 0 0 0 1px rgba(0,0,0,0.15)':'0px 0px 0px 0.5px rgba(0,0,0,0.09)' }} />
                ))}
                <label className="rounded-full cursor-pointer transition-transform hover:scale-105 flex items-center justify-center shrink-0 relative border border-dashed border-stone-300 bg-white"
                  style={{ width:'28px', height:'28px', outline:customBg?'2px solid #f97316':'none', outlineOffset:'2px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    value={customBg||scheme.bg} onChange={e=>setCustomBg(e.target.value)} />
                </label>
              </div>
            </section>

            {/* Tab bar：字體設定／裝飾 */}
            <div className="flex gap-1 p-[5px] border border-stone-300 rounded-xl w-full">
              {(['字體設定','裝飾'] as const).map(t=>(
                <button key={t} onClick={()=>setActiveTab(t)}
                  className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${activeTab===t ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                  {t}
                </button>
              ))}
            </div>

            {activeTab === '字體設定' ? (
              <div className="space-y-4">
                {/* 中文字體設定 */}
                <section className="border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-sm font-medium text-stone-600">中文字體設定</p>
                    <p className="text-xs text-stone-400">標題 / 地點</p>
                  </div>
                  <div className="bg-stone-100 rounded-lg p-3 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">中文字體</p>
                      <div className="relative">
                        <select value={zhFontIdx} onChange={e=>setZhFontIdx(parseInt(e.target.value))}
                          className="w-full appearance-none bg-white border border-stone-200 rounded-md pl-2 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300">
                          {ZH_FONTS.map((f,i)=><option key={f.label} value={i} style={{fontFamily:f.value}}>{f.label}</option>)}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <p className="text-[11px] text-stone-500 mb-1">文字顏色</p>
                      <label className="relative w-full h-[30px] rounded-md border border-stone-200 overflow-hidden cursor-pointer block">
                        <div className="w-full h-full" style={{background:tc}} />
                        <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={tc} onChange={e=>setTextColorOverride(e.target.value)} />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SliderRow label="中文字體大小" min={12} max={28} step={1} value={zhFontSize} onChange={setZhFontSize} unit="px" />
                    </div>
                  </div>
                  {textColorOverride && <button onClick={()=>setTextColorOverride('')} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors mt-1.5">重設自動配色</button>}
                </section>

                {/* 英文字體設定 */}
                <section className="border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-sm font-medium text-stone-600">英文字體設定</p>
                    <p className="text-xs text-stone-400">時間 / 邊框裝飾</p>
                  </div>
                  <div className="bg-stone-100 rounded-lg p-3 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">英文字體</p>
                      <div className="relative">
                        <select value={enFontIdx} onChange={e=>setEnFontIdx(parseInt(e.target.value))}
                          className="w-full appearance-none bg-white border border-stone-200 rounded-md pl-2 pr-7 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300">
                          {EN_FONTS.map((f,i)=><option key={f.label} value={i} style={{fontFamily:f.value}}>{f.label}</option>)}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
                      </div>
                    </div>
                    <div className="w-20 shrink-0">
                      <p className="text-[11px] text-stone-500 mb-1">文字顏色</p>
                      <label className="relative w-full h-[30px] rounded-md border border-stone-200 overflow-hidden cursor-pointer block">
                        <div className="w-full h-full" style={{background:enTc}} />
                        <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={enTc} onChange={e=>setEnTextColorOverride(e.target.value)} />
                      </label>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SliderRow label="英文字體大小" min={7} max={14} step={0.5} value={enFontSize} onChange={setEnFontSize} unit="px" />
                    </div>
                  </div>
                  {enTextColorOverride && <button onClick={()=>setEnTextColorOverride('')} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors mt-1.5">重設自動配色</button>}
                </section>

                {/* 間距定義 */}
                <section className="border border-stone-200 rounded-2xl p-4">
                  <p className="text-sm font-medium text-stone-600 mb-3">間距定義</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-stone-600">字距</p>
                      <p className="text-xs text-stone-400 mb-2">文字跟文字間的距離</p>
                      <SliderRow label="字距" min={0} max={10} step={0.5} value={letterSpacingPct} onChange={setLetterSpacingPct} unit="%" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-stone-600">行距</p>
                      <p className="text-xs text-stone-400 mb-2">標題跟內文間的距離</p>
                      <SliderRow label="行距" min={0.5} max={3} step={0.1} value={lineSpacingMult} onChange={setLineSpacingMult} unit="" decimals={1} />
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2">課程地點與年齡彼此間距固定，行距僅調整它們與標題的距離。</p>
                </section>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 裝飾點 */}
                <section className="border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-stone-600">裝飾點</p>
                    <button onClick={()=>{
                        if (dotShape==='none') setDotShape(dotShapeMemory.current)
                        else { dotShapeMemory.current = dotShape; setDotShape('none') }
                      }} aria-label="切換裝飾點" className="relative rounded-full transition-colors shrink-0"
                      style={{ height:'18px', width:'30px', background:dotOn?'#f97316':'#d1d5db' }}>
                      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width:'14px', height:'14px', left:dotOn?'14px':'2px' }} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {DOT_SHAPES.map(d=>(
                        <button key={d.id} onClick={()=>setDotShape(d.id)}
                          className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all"
                          style={{ border:dotShape===d.id?'1.5px solid #f97316':'1px solid #e7e5e4', background:dotShape===d.id?'#fff7ed':'transparent' }}>
                          <span className="text-sm leading-none">{d.symbol}</span>
                          <span className="text-[8px] text-stone-400">{d.label}</span>
                        </button>
                      ))}
                    </div>

                    {dotShape!=='none' && (<>
                      {dotShape==='custom' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 flex-shrink-0">自訂文字</span>
                          <input type="text" maxLength={1} value={dotCustomChar} onChange={e=>setDotCustomChar(e.target.value)}
                            className="w-10 text-center border border-stone-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-stone-400 mb-1">放置位置</p>
                        <div className="flex gap-1.5">
                          {(['photo','full'] as const).map(c=>(
                            <button key={c} onClick={()=>setDotCoverage(c)}
                              className="flex-1 py-1.5 rounded-lg border text-[11px] transition-all"
                              style={{ border:dotCoverage===c?'1.5px solid #f97316':'1px solid #e7e5e4', background:dotCoverage===c?'#fff7ed':'transparent', color:'#374151' }}>
                              {c==='photo'?'照片上':'滿版'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 mb-1">排列方式</p>
                        <div className="flex gap-1.5">
                          {(['grid','random'] as const).map(a=>(
                            <button key={a} onClick={()=>{ setDotArrangement(a); if(a==='random') setDotSeed(s=>s+1) }}
                              className="flex-1 py-1.5 rounded-lg border text-[11px] transition-all flex items-center justify-center gap-1"
                              style={{ border:dotArrangement===a?'1.5px solid #f97316':'1px solid #e7e5e4', background:dotArrangement===a?'#fff7ed':'transparent', color:'#374151' }}>
                              {a==='grid'?'整齊格狀':(
                                <>隨機散落{dotArrangement==='random'&&(
                                  <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center" onClick={e=>{e.stopPropagation();setDotSeed(s=>s+1)}}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                                  </span>
                                )}</>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-400 flex-shrink-0">裝飾點顏色</span>
                        <label className="relative w-5 h-5 rounded border border-stone-200 overflow-hidden cursor-pointer flex-shrink-0">
                          <div className="w-full h-full" style={{background:dotFill}} />
                          <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" value={dotFill} onChange={e=>setDotColor(e.target.value)} />
                        </label>
                        <span className="text-[10px] text-stone-400">{dotFill.toUpperCase()}</span>
                        {dotColor && <button onClick={()=>setDotColor('')} className="text-[9px] text-stone-400 hover:text-orange-500 transition-colors ml-auto">重設</button>}
                      </div>
                      <div className="flex gap-2">
                        <SliderRow label="透明" min={5} max={100} step={1} value={dotOpacity} onChange={setDotOpacity} unit="%" />
                        <SliderRow label="大小" min={2} max={24} step={0.5} value={dotSize} onChange={setDotSize} unit="px" />
                        <SliderRow label="密度" min={10} max={90} step={1} value={dotDensity} onChange={setDotDensity} unit="" />
                      </div>
                    </>)}
                  </div>
                </section>

                {/* 邊框英文裝飾 */}
                <section className="border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-stone-600">邊框英文裝飾</p>
                    <button onClick={()=>setBorderOn(v=>!v)} aria-label="切換邊框文字"
                      className="relative rounded-full transition-colors flex-shrink-0"
                      style={{ height:'18px', width:'30px', background:borderOn?'#f97316':'#d1d5db' }}>
                      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width:'14px', height:'14px', left:borderOn?'14px':'2px' }} />
                    </button>
                  </div>
                  <input type="text" value={borderText} onChange={e=>setBorderText(e.target.value)} placeholder="請輸入邊框裝飾英文字"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </section>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT：預覽畫面 ── */}
        <div ref={panelRef} className="order-1 md:order-2 md:w-[360px] w-full shrink-0 flex flex-col bg-gradient-to-b from-orange-50 to-white md:border-l border-stone-100 overflow-hidden">

          <div className="shrink-0 border-b border-stone-100 px-4 pt-5 pb-4 text-center">
            <h3 className="text-stone-600 text-xl">預覽畫面</h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 py-3 gap-2">
            <div style={{ width:scaledW, height:scaledH, position:'relative', flexShrink:0, overflow:'hidden', borderRadius:'2px' }}>
              <div className="absolute top-0 left-0 origin-top-left"
                style={{ transform:`scale(${previewScale})`, width:POSTER_W, height:POSTER_H }}>

                <div className="relative select-none"
                  style={{ width:POSTER_W, height:POSTER_H, backgroundColor:activeBg, overflow:'visible' }}>

                  {/* photo zone */}
                  <div className="absolute left-0 right-0 top-0 overflow-hidden"
                  style={{ height:PHOTO_H, cursor:imgSrc?(isDragging?'grabbing':'grab'):'default', zIndex:1, touchAction:'none' }}
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

                    {imgSrc ? (
                      <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
                        <img src={imgSrc} alt="" draggable={false} style={{
                          position:'absolute', width:'100%', height:'100%', objectFit:'contain',
                          transform:`translate(${imgPos.x}px,${imgPos.y}px) scale(${imgScale})`,
                          transformOrigin:'center center', pointerEvents:'none', userSelect:'none', zIndex:0,
                        }} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-stone-200" style={{zIndex:0}}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
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

                    {/* border text U-path */}
                    {borderOn && borderText && (
                      <svg viewBox={`0 0 ${POSTER_W} ${PHOTO_H}`} xmlns="http://www.w3.org/2000/svg"
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3 }}>
                        <defs>
                          <path id="border-u-path"
                            d={`M 8,${PHOTO_H} L 8,16 Q 8,8 16,8 L ${POSTER_W-16},8 Q ${POSTER_W-8},8 ${POSTER_W-8},16 L ${POSTER_W-8},${PHOTO_H}`} />
                        </defs>
                        <text fontSize={borderFontSize} letterSpacing={enLetterPx} fill={enTc} opacity={0.42} fontFamily={enFont.value} dominantBaseline="middle">
                          <textPath href="#border-u-path" startOffset="0">{borderText.repeat(20)}</textPath>
                        </text>
                      </svg>
                    )}

                    {/* SEED COURSE tag — photo zone top-left, 16px from edges */}
                    <div style={{
                      position:'absolute', top:INFO_PAD, left:INFO_PAD, zIndex:10,
                      display:'inline-flex', alignItems:'center',
                      borderRadius:'20px', padding:'2px 7px',
                      background:tagBg, border:`0.5px solid ${tagBorder}`, color:enTc,
                      fontFamily:enFont.value, fontSize:'7px', letterSpacing:`${enLetterPx}px`, textTransform:'uppercase',
                    }}>SEED COURSE</div>
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

                  {/* divider */}
                  <div style={{ position:'absolute', left:INFO_PAD, right:INFO_PAD, top:PHOTO_H, height:'0.5px', background:divider, zIndex:4 }} />

                  {/* info zone — 16px padding all sides, overflow visible */}
                  <div className="absolute left-0 right-0 flex flex-col"
                    style={{ top:PHOTO_H, bottom:0, padding:INFO_PAD, overflow:'visible', zIndex:3 }}>

                    {/* title */}
                    <div style={{
                      color:tc, fontWeight:TITLE_WEIGHT, lineHeight:1.3, marginBottom:`${titleGap}px`,
                      fontFamily:zhFont.value, fontSize:`${zhFontSize}px`, letterSpacing:`${zhLetterPx}px`, flexShrink:0,
                      overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical',
                    }}>
                      {course.title||'課程名稱'}
                    </div>

                    {/* time badge */}
                    {(course.timeStart||course.timeEnd||course.date) && (
                      <div style={{
                        display:'inline-flex', alignItems:'center', gap:'3px', marginBottom:'4px', width:'fit-content',
                        borderRadius:'4px', padding:'2px 5px', background:timeBg,
                        fontFamily:enFont.value, fontWeight:EN_WEIGHT, fontSize:`${enFontSize}px`, color:enTc, letterSpacing:`${enLetterPx}px`,
                        flexShrink:0,
                      }}>
                        {course.date && <span>{course.date}</span>}
                        {course.date&&(course.timeStart||course.timeEnd) && <span style={{opacity:0.5,margin:'0 2px'}}>·</span>}
                        {course.timeStart && <span>{course.timeStart}</span>}
                        {course.timeEnd && <span> – {course.timeEnd}</span>}
                      </div>
                    )}

                    {/* location */}
                    {course.location && (
                      <div style={{ display:'flex', alignItems:'flex-start', gap:'4px', marginBottom:'4px', flexShrink:0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill={iconColor} stroke="none" aria-hidden="true" style={{flexShrink:0,marginTop:'1px',opacity:0.82}}>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <div style={{ color:tc, fontFamily:zhFont.value, fontSize:`${locFontSize}px`, letterSpacing:`${zhLetterPx}px`, opacity:0.82, lineHeight:1.4 }}>
                          {course.location}
                        </div>
                      </div>
                    )}

                    {/* instructor */}
                    {course.instructor && (
                      <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:INFO_PAD, flexShrink:0 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill={iconColor} stroke="none" aria-hidden="true" style={{flexShrink:0,opacity:0.62}}>
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                        <div style={{ color:tc, fontFamily:zhFont.value, fontSize:`${locFontSize}px`, letterSpacing:`${zhLetterPx}px`, opacity:0.62, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {course.instructor}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* zoom（+ / − Scrollbar，調整照片在照片框中的呈現範圍） */}
            <div style={{ width:scaledW || 226 }} className="flex items-center gap-2 flex-shrink-0">
              <MinusIcon className="text-stone-400 flex-shrink-0" />
              <input type="range" min="0.5" max="3" step="0.05" value={imgScale} onChange={e=>setImgScale(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
              <PlusIcon className="text-stone-400 flex-shrink-0" />
            </div>
          </div>

          {/* 儲存設定 / 變更圖片 */}
          <div className="shrink-0 px-4 pb-3 flex gap-3">
            <button onClick={handleSaveSettings}
              className="flex-1 h-9 rounded-lg border border-stone-300 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
              {savedFlash ? '已儲存！' : '儲存設定'}
            </button>
            <button onClick={()=>setShowPhotoPicker(true)}
              className="flex-1 h-9 rounded-lg border text-sm font-medium transition-colors"
              style={{ background:'#fff7ed', borderColor:'#fed7aa', color:'#ea580c' }}>
              變更圖片
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* 完成！匯出 PNG */}
          <div className="shrink-0 border-t border-stone-200 px-4 py-4">
            <button onClick={handleExport} disabled={isExporting}
              className="w-full py-2.5 rounded-lg text-sm font-medium tracking-wide text-white transition-opacity disabled:opacity-60"
              style={{ background:'#f97316' }}>
              {isExporting ? '產生中...' : '完成！匯出 PNG'}
            </button>
          </div>
        </div>

        {/* 變更圖片 picker */}
        {showPhotoPicker && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40" onClick={e=>{ if (e.target===e.currentTarget) setShowPhotoPicker(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-[300px] max-h-[80%] overflow-y-auto p-4">
              <p className="text-sm font-medium text-stone-600 mb-3">選擇課程照片</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(photos && photos.length ? photos : []).slice(0,5).map((p,i)=>(
                  <button key={i} onClick={()=>pickPhoto(p)}
                    className="aspect-square rounded-lg overflow-hidden border-2 transition-all"
                    style={{ borderColor: imgSrc===p ? '#f97316' : 'transparent' }}>
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <button onClick={()=>fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-2.5 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                另外上傳新照片
              </button>
              <button onClick={()=>setShowPhotoPicker(false)} className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-3 transition-colors">取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
