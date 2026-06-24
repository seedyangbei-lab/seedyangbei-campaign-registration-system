'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

declare global {
  interface Window {
    html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>
  }
}

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

// ── colour helpers ──────────────────────────────────────────────────────────
function lum(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function textCol(bg: string) { return lum(bg) > 0.35 ? '#111111' : '#ffffff' }

// ── schemes ─────────────────────────────────────────────────────────────────
const SCHEMES = [
  { id: 'sky',    label: '天藍',   bg: '#38bdf8' },
  { id: 'lime',   label: '螢光綠', bg: '#a3e635' },
  { id: 'orange', label: '亮橘',   bg: '#fb923c' },
  { id: 'yellow', label: '亮黃',   bg: '#fde047' },
  { id: 'white',  label: '白',     bg: '#ffffff' },
  { id: 'black',  label: '黑',     bg: '#111111' },
  { id: 'pink',   label: '亮粉',   bg: '#f472b6' },
]

// ── Google Fonts ─────────────────────────────────────────────────────────────
// ZH: Noto Sans TC / Noto Serif TC
// EN: curated diverse selection — modern / future / retro / expressive
const ZH_FONTS = [
  { label: 'Noto Sans TC（黑體）',  value: "'Noto Sans TC', sans-serif",  gf: 'Noto+Sans+TC:wght@300;400;500;700' },
  { label: 'Noto Serif TC（明體）', value: "'Noto Serif TC', serif",       gf: 'Noto+Serif+TC:wght@300;400;500;700' },
]
const EN_FONTS = [
  // modern
  { label: 'DM Sans',          value: "'DM Sans', sans-serif",          gf: 'DM+Sans:wght@300;400;500;700',    tag: '現代' },
  { label: 'Inter',            value: "'Inter', sans-serif",            gf: 'Inter:wght@300;400;500;700',      tag: '現代' },
  { label: 'Outfit',           value: "'Outfit', sans-serif",           gf: 'Outfit:wght@300;400;500;700',     tag: '現代' },
  // future
  { label: 'Space Grotesk',    value: "'Space Grotesk', sans-serif",    gf: 'Space+Grotesk:wght@300;400;500;700', tag: '未來' },
  { label: 'Syne',             value: "'Syne', sans-serif",             gf: 'Syne:wght@400;500;700;800',       tag: '未來' },
  { label: 'Space Mono',       value: "'Space Mono', monospace",        gf: 'Space+Mono:wght@400;700',         tag: '未來' },
  // retro
  { label: 'Playfair Display', value: "'Playfair Display', serif",      gf: 'Playfair+Display:wght@400;500;700;900', tag: '復古' },
  { label: 'DM Serif Display', value: "'DM Serif Display', serif",      gf: 'DM+Serif+Display',                tag: '復古' },
  { label: 'Libre Baskerville',value: "'Libre Baskerville', serif",     gf: 'Libre+Baskerville:wght@400;700',  tag: '復古' },
  // expressive
  { label: 'Bebas Neue',       value: "'Bebas Neue', sans-serif",       gf: 'Bebas+Neue',                      tag: '展示' },
  { label: 'Oswald',           value: "'Oswald', sans-serif",           gf: 'Oswald:wght@300;400;500;700',     tag: '展示' },
  { label: 'Cormorant Garamond',value:"'Cormorant Garamond', serif",    gf: 'Cormorant+Garamond:wght@300;400;500;700', tag: '展示' },
]

// ── deco shape SVG (viewBox 0 0 210 180, photo zone) ──────────────────────
// Each shape: additive colour overlay. Photo shows through open areas.
// uid prefix prevents mask-id collision.
type DecoId = 'none' | 'drift' | 'arc' | 'tower' | 'scatter'
const DECO_SHAPES: { id: DecoId; label: string }[] = [
  { id: 'none',    label: '無裝飾' },
  { id: 'drift',   label: '漂流' },
  { id: 'arc',     label: '弧帶' },
  { id: 'tower',   label: '立柱' },
  { id: 'scatter', label: '碎形' },
]

function DecoSvg({ shapeId, fill, opacity, uid }: { shapeId: string; fill: string; opacity: number; uid: string }) {
  const op = (opacity / 100).toFixed(2)
  const mid = `${uid}-${shapeId}`
  if (shapeId === 'none') return null

  const svgs: Record<string, JSX.Element> = {

    // DRIFT — kidney-ish large form bleeding top-left, small teardrop lower-right, ghost satellite
    drift: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
        <defs>
          <mask id={`${mid}-a`}>
            <rect width="210" height="180" fill="black"/>
            {/* large organic kidney bleeding top-left */}
            <ellipse cx="-28" cy="44" rx="115" ry="92" fill="white" transform="rotate(-25 -28 44)"/>
            <ellipse cx="-8" cy="82" rx="78" ry="58" fill="white" transform="rotate(-18 -8 82)"/>
          </mask>
          <mask id={`${mid}-b`}>
            <rect width="210" height="180" fill="black"/>
            {/* teardrop lower-right */}
            <ellipse cx="188" cy="158" rx="46" ry="36" fill="white" transform="rotate(38 188 158)"/>
          </mask>
          <mask id={`${mid}-c`}>
            <rect width="210" height="180" fill="black"/>
            {/* ghost satellite */}
            <ellipse cx="130" cy="86" rx="14" ry="11" fill="white" transform="rotate(12 130 86)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-a)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-b)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-c)`} opacity={(opacity * 0.38 / 100).toFixed(2)}/>
      </svg>
    ),

    // ARC — bold crescent top + elongated drop lower-left + micro sliver top-right
    arc: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
        <defs>
          <mask id={`${mid}-outer`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="105" cy="-16" rx="148" ry="104" fill="white"/>
          </mask>
          <mask id={`${mid}-inner`}>
            <rect width="210" height="180" fill="white"/>
            {/* punch hole to make crescent */}
            <ellipse cx="105" cy="-20" rx="108" ry="70" fill="black"/>
          </mask>
          <mask id={`${mid}-drop`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="22" cy="148" rx="36" ry="56" fill="white" transform="rotate(-42 22 148)"/>
          </mask>
          <mask id={`${mid}-sliver`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="180" cy="26" rx="26" ry="9" fill="white" transform="rotate(55 180 26)"/>
          </mask>
        </defs>
        {/* crescent = outer minus inner */}
        <g mask={`url(#${mid}-inner)`}>
          <rect width="210" height="180" fill={fill} mask={`url(#${mid}-outer)`} opacity={op}/>
        </g>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-drop)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-sliver)`} opacity={(opacity * 0.55 / 100).toFixed(2)}/>
      </svg>
    ),

    // TOWER — tall spine left + wide counter top-right + tension slash + ghost dot
    tower: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
        <defs>
          <mask id={`${mid}-spine`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="40" cy="90" rx="50" ry="116" fill="white" transform="rotate(-5 40 90)"/>
          </mask>
          <mask id={`${mid}-wide`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="162" cy="28" rx="76" ry="40" fill="white" transform="rotate(18 162 28)"/>
          </mask>
          <mask id={`${mid}-slash`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="108" cy="118" rx="60" ry="9" fill="white" transform="rotate(-38 108 118)"/>
          </mask>
          <mask id={`${mid}-ghost`}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="176" cy="148" rx="13" ry="11" fill="white" transform="rotate(20 176 148)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-spine)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-wide)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-slash)`} opacity={(opacity * 0.60 / 100).toFixed(2)}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-ghost)`} opacity={(opacity * 0.32 / 100).toFixed(2)}/>
      </svg>
    ),

    // SCATTER — 3 distinct bodies (round/elongated/puddle) + ghost bridge
    scatter: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
        <defs>
          <mask id={`${mid}-L`}>
            <rect width="210" height="180" fill="black"/>
            {/* main voice: big, round, slightly offset left */}
            <ellipse cx="58" cy="42" rx="70" ry="60" fill="white" transform="rotate(-15 58 42)"/>
          </mask>
          <mask id={`${mid}-M`}>
            <rect width="210" height="180" fill="black"/>
            {/* harmonic: elongated vertical right edge */}
            <ellipse cx="184" cy="105" rx="32" ry="60" fill="white" transform="rotate(8 184 105)"/>
          </mask>
          <mask id={`${mid}-S`}>
            <rect width="210" height="180" fill="black"/>
            {/* bass: low-left puddle shape */}
            <ellipse cx="48" cy="155" rx="54" ry="28" fill="white" transform="rotate(-8 48 155)"/>
          </mask>
          <mask id={`${mid}-G`}>
            <rect width="210" height="180" fill="black"/>
            {/* ghost bridge */}
            <ellipse cx="118" cy="74" rx="24" ry="17" fill="white" transform="rotate(30 118 74)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-L)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-M)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-S)`} opacity={op}/>
        <rect width="210" height="180" fill={fill} mask={`url(#${mid}-G)`} opacity={(opacity * 0.36 / 100).toFixed(2)}/>
      </svg>
    ),
  }
  return svgs[shapeId] ?? null
}

const BORDER_TEXT = 'YANGBEI COMMUNITY · SEED COURSE · YANGBEI · SEED COURSE · '

// ── load Google Fonts dynamically ────────────────────────────────────────────
function useGoogleFont(gfParam: string) {
  useEffect(() => {
    if (!gfParam) return
    const id = `gf-${gfParam.replace(/[^a-z0-9]/gi, '')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${gfParam}&display=swap`
    document.head.appendChild(link)
  }, [gfParam])
}

export default function CoursePosterEditor({ course, initialImage, onClose }: Props) {
  const [imgSrc, setImgSrc]     = useState<string | null>(initialImage || null)
  const [imgPos, setImgPos]     = useState({ x: 0, y: 0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const [scheme, setScheme]       = useState(SCHEMES[2])
  const [customBg, setCustomBg]   = useState('')
  const [decoId, setDecoId]       = useState<DecoId>('drift')
  const [decoOp, setDecoOp]       = useState(45)
  const [borderOn, setBorderOn]   = useState(true)

  // fonts
  const [zhFontIdx, setZhFontIdx] = useState(0)
  const [enFontIdx, setEnFontIdx] = useState(0)
  // title weight
  const [titleWeight, setTitleWeight] = useState<300 | 400 | 500 | 700>(500)

  const [isExporting, setIsExporting] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  const activeBg  = customBg || scheme.bg
  const tc        = textCol(activeBg)
  const zhFont    = ZH_FONTS[zhFontIdx]
  const enFont    = EN_FONTS[enFontIdx]

  // load selected fonts
  useGoogleFont(zhFont.gf)
  useGoogleFont(enFont.gf)
  // preload all EN fonts for fast switching
  EN_FONTS.forEach(f => useGoogleFont(f.gf))
  ZH_FONTS.forEach(f => useGoogleFont(f.gf))

  // ── drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return; e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: imgPos.x, py: imgPos.y }
  }, [imgSrc, imgPos])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my })
  }, [isDragging])
  const onMouseUp   = useCallback(() => setIsDragging(false), [])
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imgSrc) return
    const t = e.touches[0]; setIsDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, px: imgPos.x, py: imgPos.y }
  }, [imgSrc, imgPos])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const t = e.touches[0]
    setImgPos({ x: dragStart.current.px + t.clientX - dragStart.current.mx, y: dragStart.current.py + t.clientY - dragStart.current.my })
  }, [isDragging])
  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImgSrc(ev.target?.result as string); setImgPos({ x:0, y:0 }); setImgScale(1) }
    reader.readAsDataURL(file)
  }

  // ── export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!posterRef.current) return; setIsExporting(true)
    try {
      if (!window.html2canvas) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          s.onload = () => res(); s.onerror = () => rej(new Error('load fail'))
          document.head.appendChild(s)
        })
      }
      await document.fonts.ready
      const canvas = await window.html2canvas(posterRef.current, { scale: 3, useCORS: true, backgroundColor: activeBg, logging: false })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${course.title || 'poster'}.png`
      a.click()
    } catch (_e) { console.error('export failed', _e) }
    finally { setIsExporting(false) }
  }, [activeBg, course.title])

  const tagBg     = lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)'
  const tagBorder = lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.20)'  : 'rgba(255,255,255,0.35)'
  const timeBg    = lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.09)'  : 'rgba(255,255,255,0.18)'
  const divider   = lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.15)'  : 'rgba(255,255,255,0.25)'

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full md:max-w-4xl md:mx-4 flex flex-col md:flex-row bg-white md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '95dvh' }}>

        {/* close */}
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* ── LEFT: poster ── */}
        <div className="md:w-[340px] flex-shrink-0 flex flex-col items-center justify-center bg-stone-100 p-6 gap-3">
          <div ref={posterRef}
            className="relative overflow-hidden rounded-sm select-none flex-shrink-0"
            style={{ width:'210px', height:'297px', minWidth:'210px', minHeight:'297px', backgroundColor: activeBg }}>

            {/* UPPER ZONE: photo + deco (top 178px) */}
            <div className="absolute left-0 right-0 top-0 overflow-hidden"
              style={{ height:'178px', cursor: imgSrc ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

              {imgSrc ? (
                <img src={imgSrc} alt="" draggable={false} style={{
                  position:'absolute', width:`${imgScale*100}%`, height:`${imgScale*100}%`,
                  objectFit:'cover', left:`${imgPos.x}px`, top:`${imgPos.y}px`,
                  pointerEvents:'none', userSelect:'none'
                }}/>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-200">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
              )}

              {/* deco shapes */}
              <DecoSvg shapeId={decoId} fill={activeBg} opacity={decoOp} uid="poster"/>

              {/* border text: top + sides */}
              {borderOn && (
                <svg viewBox="0 0 210 178" xmlns="http://www.w3.org/2000/svg"
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }}>
                  <defs>
                    <path id="bte3" d="M 9,10 H 201"/>
                    <path id="bre3" d="M 203,10 V 168"/>
                    <path id="ble3" d="M 7,168 V 10"/>
                  </defs>
                  {(['bte3','bre3','ble3'] as const).map((id, i) => (
                    <text key={id} fontSize="5.5" letterSpacing="3" fill={tc} opacity="0.42" fontFamily={enFont.value}>
                      <textPath href={`#${id}`} {...(i===2?{side:'right'}:{})}>
                        {BORDER_TEXT.repeat(6)}
                      </textPath>
                    </text>
                  ))}
                </svg>
              )}
            </div>

            {/* divider */}
            <div style={{ position:'absolute', left:'14px', right:'14px', top:'178px', height:'0.5px', background: divider }}/>

            {/* LOWER ZONE: info (178px → 297px) */}
            <div className="absolute left-0 right-0 bottom-0 flex flex-col justify-end"
              style={{ top:'178px', padding:'12px 14px 14px', pointerEvents:'none' }}>

              {/* tag */}
              <div style={{
                display:'inline-flex', alignItems:'center', marginBottom:'7px', width:'fit-content',
                borderRadius:'20px', padding:'2px 7px',
                background: tagBg, border:`0.5px solid ${tagBorder}`, color: tc,
                fontFamily: enFont.value, fontSize:'7px', letterSpacing:'0.16em', textTransform:'uppercase'
              }}>SEED COURSE</div>

              {/* title */}
              <div style={{
                color: tc, fontSize:'17px', fontWeight: titleWeight, lineHeight:1.3,
                marginBottom:'6px', fontFamily: zhFont.value
              }}>
                {course.title || '課程名稱'}
              </div>

              {/* time */}
              {(course.timeStart || course.timeEnd || course.date) && (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:'3px', marginBottom:'5px', width:'fit-content',
                  borderRadius:'4px', padding:'2px 5px',
                  background: timeBg, fontFamily: enFont.value, fontSize:'9px', color: tc, letterSpacing:'0.04em'
                }}>
                  {course.date && <span>{course.date}</span>}
                  {course.date && (course.timeStart || course.timeEnd) && <span style={{ opacity:0.5, margin:'0 2px' }}>·</span>}
                  {course.timeStart && <span>{course.timeStart}</span>}
                  {course.timeEnd && <span> – {course.timeEnd}</span>}
                </div>
              )}

              {/* location */}
              {course.location && (
                <div style={{ color:tc, fontFamily:zhFont.value, fontSize:'9.5px', opacity:0.82, lineHeight:1.6 }}>
                  {course.location}
                </div>
              )}
              {course.instructor && (
                <div style={{ color:tc, fontFamily:zhFont.value, fontSize:'9px', opacity:0.62, marginTop:'2px' }}>
                  {course.instructor}
                </div>
              )}

              {/* border bottom */}
              {borderOn && (
                <svg viewBox="0 0 210 28" xmlns="http://www.w3.org/2000/svg"
                  style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'28px', pointerEvents:'none' }}>
                  <defs><path id="bbe3" d="M 201,20 H 9"/></defs>
                  <text fontSize="5.5" letterSpacing="3" fill={tc} opacity="0.32" fontFamily={enFont.value}>
                    <textPath href="#bbe3" side="right">{BORDER_TEXT.repeat(4)}</textPath>
                  </text>
                </svg>
              )}
            </div>
          </div>

          {/* zoom */}
          <div className="w-[210px] flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
            <input type="range" min="0.5" max="3" step="0.05" value={imgScale} onChange={e => setImgScale(parseFloat(e.target.value))} className="flex-1 accent-orange-500"/>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400 flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
          </div>
        </div>

        {/* ── RIGHT: controls ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* upload */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">上半部背景圖片</p>
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-3 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              {imgSrc ? '更換圖片' : '上傳圖片'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
          </section>

          {/* colour */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">下半部色彩</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SCHEMES.map(s => (
                <button key={s.id} title={s.label} aria-label={s.label}
                  onClick={() => { setScheme(s); setCustomBg('') }}
                  className="relative rounded overflow-hidden aspect-square transition-transform hover:scale-105"
                  style={{ outline: (!customBg && scheme.id===s.id) ? '2px solid #f97316' : '2px solid transparent', outlineOffset:'2px' }}>
                  <div style={{ background:s.bg, width:'100%', height:'100%', display:'flex', flexDirection:'column' }}>
                    <div style={{ marginTop:'auto', padding:'2px 3px' }}>
                      <span style={{ fontSize:'6.5px', color:textCol(s.bg), fontFamily:'Arial' }}>{s.label}</span>
                    </div>
                  </div>
                </button>
              ))}
              <label className="relative rounded overflow-hidden aspect-square cursor-pointer transition-transform hover:scale-105 border border-stone-200"
                style={{ outline: customBg ? '2px solid #f97316' : '2px solid transparent', outlineOffset:'2px' }}>
                <div className="w-full h-full flex items-center justify-center" style={{ background: customBg || '#ffffff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={customBg ? textCol(customBg) : '#888'} strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                </div>
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={customBg || scheme.bg} onChange={e => setCustomBg(e.target.value)}/>
              </label>
            </div>
          </section>

          {/* deco shapes */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">上半部裝飾形狀</p>
            <div className="grid grid-cols-5 gap-1.5">
              {DECO_SHAPES.map(d => (
                <button key={d.id} onClick={() => setDecoId(d.id)}
                  className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all"
                  style={{
                    background: decoId===d.id ? '#fff7ed' : 'transparent',
                    outline: decoId===d.id ? '1.5px solid #f97316' : '1.5px solid #e7e5e4'
                  }}>
                  <div className="w-9 h-[52px] rounded-sm overflow-hidden relative">
                    <div style={{ position:'absolute', inset:0, background:'linear-gradient(160deg,#94a3b8 0%,#cbd5e1 100%)' }}/>
                    <DecoSvg shapeId={d.id} fill={activeBg} opacity={decoOp} uid={`thumb-${d.id}`}/>
                  </div>
                  <span className="text-[8.5px] text-stone-500 leading-none">{d.label}</span>
                </button>
              ))}
            </div>
            {decoId !== 'none' && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[10px] text-stone-400 flex-shrink-0 w-8">強度</span>
                <input type="range" min="10" max="100" step="1" value={decoOp}
                  onChange={e => setDecoOp(parseInt(e.target.value))} className="flex-1 accent-orange-500"/>
                <span className="text-[10px] text-stone-400 w-8 text-right">{decoOp}%</span>
              </div>
            )}
          </section>

          {/* border */}
          <section>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase">邊框英文</p>
              <button onClick={() => setBorderOn(v => !v)} aria-label="切換邊框文字"
                className="relative rounded-full transition-colors flex-shrink-0"
                style={{ height:'18px', width:'30px', background: borderOn ? '#f97316' : '#d1d5db' }}>
                <span className="absolute top-0.5 rounded-full bg-white transition-all"
                  style={{ width:'14px', height:'14px', left: borderOn ? '14px' : '2px' }}/>
              </button>
            </div>
          </section>

          {/* fonts */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-3">字體</p>
            <div className="space-y-3">
              {/* ZH font */}
              <div>
                <p className="text-[10px] text-stone-400 mb-1.5">中文 <span className="opacity-60">標題 / 地點</span></p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ZH_FONTS.map((f, i) => (
                    <button key={f.label} onClick={() => setZhFontIdx(i)}
                      className="text-left px-3 py-2 rounded-lg border transition-all text-[11px]"
                      style={{
                        fontFamily: f.value,
                        border: zhFontIdx===i ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                        background: zhFontIdx===i ? '#fff7ed' : 'transparent',
                        color: '#374151'
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* title weight */}
              <div>
                <p className="text-[10px] text-stone-400 mb-1.5">標題粗細</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([300,400,500,700] as const).map(w => (
                    <button key={w} onClick={() => setTitleWeight(w)}
                      className="py-1.5 rounded-lg border text-[11px] transition-all"
                      style={{
                        fontWeight: w,
                        border: titleWeight===w ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                        background: titleWeight===w ? '#fff7ed' : 'transparent',
                        color: '#374151'
                      }}>
                      {w === 300 ? '細' : w === 400 ? '標準' : w === 500 ? '中' : '粗'}
                    </button>
                  ))}
                </div>
              </div>

              {/* EN font */}
              <div>
                <p className="text-[10px] text-stone-400 mb-1.5">英文 <span className="opacity-60">時間 / 邊框</span></p>
                <div className="space-y-1">
                  {['現代','未來','復古','展示'].map(tag => (
                    <div key={tag}>
                      <p className="text-[9px] text-stone-300 tracking-widest uppercase mb-1">{tag}</p>
                      <div className="grid grid-cols-3 gap-1">
                        {EN_FONTS.filter(f => f.tag === tag).map((f, _i) => {
                          const idx = EN_FONTS.indexOf(f)
                          return (
                            <button key={f.label} onClick={() => setEnFontIdx(idx)}
                              className="text-left px-2 py-1.5 rounded-lg border transition-all"
                              style={{
                                fontFamily: f.value,
                                border: enFontIdx===idx ? '1.5px solid #f97316' : '1px solid #e7e5e4',
                                background: enFontIdx===idx ? '#fff7ed' : 'transparent',
                                fontSize: '10px', color:'#374151'
                              }}>
                              {f.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* export */}
          <button onClick={handleExport} disabled={isExporting}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-wide text-white transition-opacity disabled:opacity-60"
            style={{ background:'#f97316' }}>
            {isExporting ? '產生中...' : '匯出 PNG'}
          </button>

        </div>
      </div>
    </div>
  )
}
