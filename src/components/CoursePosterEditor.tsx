'use client'

import { useState, useRef, useCallback } from 'react'

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

const SCHEMES = [
  { id: 'sky',    label: '天藍',   bg: '#38bdf8' },
  { id: 'lime',   label: '螢光綠', bg: '#a3e635' },
  { id: 'orange', label: '亮橘',   bg: '#fb923c' },
  { id: 'yellow', label: '亮黃',   bg: '#fde047' },
  { id: 'white',  label: '白',     bg: '#ffffff' },
  { id: 'black',  label: '黑',     bg: '#111111' },
  { id: 'pink',   label: '亮粉',   bg: '#f472b6' },
]

// ── decoration shapes (upper photo zone, in 210×180 viewBox) ──────────────
// These are ADDITIVE overlays on top of the photo, not covering it fully.
// The shapes use the scheme colour at low opacity so the photo shows through.
type DecoShape = { id: string; label: string }
const DECO_SHAPES: DecoShape[] = [
  { id: 'none',    label: '無裝飾' },
  { id: 'drift',   label: '漂流' },
  { id: 'arc',     label: '弧帶' },
  { id: 'tower',   label: '立柱' },
  { id: 'scatter', label: '碎形' },
]

// Render decoration SVG for the photo zone (viewBox 0 0 210 180)
// uid prefix prevents mask-id collision between thumb previews and the live poster
function DecoSvg({ shapeId, fill, opacity, uid }: { shapeId: string; fill: string; opacity: number; uid: string }) {
  const op = (opacity / 100).toFixed(2)
  const maskId = `${uid}-${shapeId}`

  if (shapeId === 'none') return null

  // Each shape: coloured organic blobs at ~40% opacity over the photo
  // They do NOT cover the whole area — they're accent shapes only
  const shapes: Record<string, JSX.Element> = {
    drift: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id={maskId}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="-10" cy="40" rx="90" ry="80" fill="white" transform="rotate(-12 -10 40)"/>
            <ellipse cx="200" cy="150" rx="55" ry="48" fill="white" transform="rotate(18 200 150)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${maskId})`} opacity={op}/>
      </svg>
    ),
    arc: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id={maskId}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="105" cy="-30" rx="130" ry="85" fill="white"/>
            <ellipse cx="30" cy="165" rx="65" ry="50" fill="white" transform="rotate(-8 30 165)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${maskId})`} opacity={op}/>
      </svg>
    ),
    tower: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id={maskId}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="35" cy="90" rx="55" ry="110" fill="white" transform="rotate(-6 35 90)"/>
            <ellipse cx="188" cy="35" rx="70" ry="55" fill="white" transform="rotate(14 188 35)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${maskId})`} opacity={op}/>
      </svg>
    ),
    scatter: (
      <svg viewBox="0 0 210 180" xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id={maskId}>
            <rect width="210" height="180" fill="black"/>
            <ellipse cx="22" cy="38" rx="52" ry="44" fill="white" transform="rotate(-20 22 38)"/>
            <ellipse cx="196" cy="90" rx="40" ry="60" fill="white" transform="rotate(10 196 90)"/>
            <ellipse cx="80" cy="162" rx="65" ry="38" fill="white" transform="rotate(-8 80 162)"/>
          </mask>
        </defs>
        <rect width="210" height="180" fill={fill} mask={`url(#${maskId})`} opacity={op}/>
      </svg>
    ),
  }
  return shapes[shapeId] ?? null
}

const BORDER_TEXT = 'YANGBEI COMMUNITY · SEED COURSE · YANGBEI · SEED COURSE · '

export default function CoursePosterEditor({ course, initialImage, onClose }: Props) {
  // image state
  const [imgSrc, setImgSrc] = useState<string | null>(initialImage || null)
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  // style state
  const [scheme, setScheme] = useState(SCHEMES[2])
  const [customBg, setCustomBg] = useState('')
  const [decoId, setDecoId] = useState<string>('drift')
  const [decoOpacity, setDecoOpacity] = useState(45)
  const [borderOn, setBorderOn] = useState(true)
  const [enFont, setEnFont] = useState('Arial, sans-serif')   // time block + border text
  const [zhFont, setZhFont] = useState('Arial, sans-serif')   // title + location

  const [isExporting, setIsExporting] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const activeBg = customBg || scheme.bg
  const tc = textCol(activeBg)

  // ── drag ──────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: imgPos.x, py: imgPos.y }
  }, [imgSrc, imgPos])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x: dragStart.current.px + (e.clientX - dragStart.current.mx), y: dragStart.current.py + (e.clientY - dragStart.current.my) })
  }, [isDragging])
  const onMouseUp = useCallback(() => setIsDragging(false), [])
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imgSrc) return
    const t = e.touches[0]
    setIsDragging(true)
    dragStart.current = { mx: t.clientX, my: t.clientY, px: imgPos.x, py: imgPos.y }
  }, [imgSrc, imgPos])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const t = e.touches[0]
    setImgPos({ x: dragStart.current.px + (t.clientX - dragStart.current.mx), y: dragStart.current.py + (t.clientY - dragStart.current.my) })
  }, [isDragging])
  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  // ── upload ─────────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setImgSrc(ev.target?.result as string); setImgPos({ x: 0, y: 0 }); setImgScale(1) }
    reader.readAsDataURL(file)
  }

  // ── export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!posterRef.current) return
    setIsExporting(true)
    try {
      if (!window.html2canvas) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          s.onload = () => res()
          s.onerror = () => rej(new Error('load failed'))
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

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full md:max-w-4xl md:mx-4 flex flex-col md:flex-row bg-white md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '95dvh' }}
      >
        {/* close */}
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── LEFT: poster ── */}
        <div className="md:w-[340px] flex-shrink-0 flex flex-col items-center justify-center bg-stone-100 p-6 gap-3">

          {/* poster: A4 = 210 × 297 */}
          <div
            ref={posterRef}
            className="relative overflow-hidden rounded-sm select-none flex-shrink-0"
            style={{ width: '210px', height: '297px', minWidth: '210px', minHeight: '297px', backgroundColor: activeBg }}
          >
            {/* ── UPPER ZONE: photo (top 60%) ── */}
            <div
              className="absolute left-0 right-0 top-0 overflow-hidden"
              style={{ height: '178px', cursor: imgSrc ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* photo */}
              {imgSrc ? (
                <img
                  src={imgSrc} alt="" draggable={false}
                  style={{
                    position: 'absolute',
                    width: `${imgScale * 100}%`, height: `${imgScale * 100}%`,
                    objectFit: 'cover',
                    left: `${imgPos.x}px`, top: `${imgPos.y}px`,
                    pointerEvents: 'none', userSelect: 'none',
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#e5e7eb' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
              )}

              {/* decorative organic shapes over photo */}
              <DecoSvg shapeId={decoId} fill={activeBg} opacity={decoOpacity} uid="poster" />

              {/* border text top edge */}
              {borderOn && (
                <svg viewBox="0 0 210 178" xmlns="http://www.w3.org/2000/svg"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs>
                    <path id="bte2" d="M 9,10 H 201"/>
                    <path id="bre2" d="M 203,10 V 168"/>
                    <path id="ble2" d="M 7,168 V 10"/>
                  </defs>
                  {(['bte2','bre2','ble2'] as const).map((id, i) => (
                    <text key={id} fontSize="5.5" letterSpacing="3" fill={tc} opacity="0.45" fontFamily={enFont}>
                      <textPath href={`#${id}`} {...(i === 2 ? { side: 'right' } : {})}>
                        {BORDER_TEXT.repeat(6)}
                      </textPath>
                    </text>
                  ))}
                </svg>
              )}
            </div>

            {/* ── LOWER ZONE: info block (bottom 40%) ── */}
            <div
              className="absolute left-0 right-0 bottom-0 flex flex-col justify-end"
              style={{ top: '178px', padding: '12px 14px 14px', pointerEvents: 'none' }}
            >
              {/* tag */}
              <div
                className="inline-flex items-center mb-2 rounded-full px-2 py-0.5"
                style={{
                  width: 'fit-content',
                  background: lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)',
                  border: `0.5px solid ${lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.35)'}`,
                  color: tc,
                  fontFamily: enFont,
                  fontSize: '7px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                SEED COURSE
              </div>

              {/* title */}
              <div style={{ color: tc, fontSize: '17px', fontWeight: 500, lineHeight: 1.3, marginBottom: '6px', fontFamily: zhFont }}>
                {course.title || '課程名稱'}
              </div>

              {/* time row */}
              {(course.timeStart || course.timeEnd || course.date) && (
                <div
                  className="inline-flex items-center gap-1 mb-1.5 rounded px-1.5 py-0.5"
                  style={{
                    width: 'fit-content',
                    background: lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.18)',
                    fontFamily: enFont,
                    fontSize: '9px',
                    color: tc,
                    letterSpacing: '0.04em',
                  }}
                >
                  {course.date && <span>{course.date}</span>}
                  {course.date && (course.timeStart || course.timeEnd) && <span style={{ opacity: 0.5, margin: '0 2px' }}>·</span>}
                  {course.timeStart && <span>{course.timeStart}</span>}
                  {course.timeEnd && <span> – {course.timeEnd}</span>}
                </div>
              )}

              {/* location */}
              {course.location && (
                <div style={{ color: tc, fontFamily: zhFont, fontSize: '9.5px', opacity: 0.82, lineHeight: 1.6 }}>
                  {course.location}
                </div>
              )}

              {/* instructor */}
              {course.instructor && (
                <div style={{ color: tc, fontFamily: zhFont, fontSize: '9px', opacity: 0.65, marginTop: '2px' }}>
                  {course.instructor}
                </div>
              )}

              {/* border text bottom edge */}
              {borderOn && (
                <svg viewBox="0 0 210 30" xmlns="http://www.w3.org/2000/svg"
                  style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '30px', pointerEvents: 'none' }}>
                  <defs><path id="bbe2" d="M 201,22 H 9"/></defs>
                  <text fontSize="5.5" letterSpacing="3" fill={tc} opacity="0.35" fontFamily={enFont}>
                    <textPath href="#bbe2" side="right">{BORDER_TEXT.repeat(4)}</textPath>
                  </text>
                </svg>
              )}
            </div>

            {/* divider line between zones */}
            <div style={{
              position: 'absolute', left: '14px', right: '14px', top: '178px',
              height: '0.5px', background: lum(activeBg) > 0.35 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'
            }} />
          </div>

          {/* zoom slider */}
          <div className="w-[210px] flex items-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
            </svg>
            <input type="range" min="0.5" max="3" step="0.05" value={imgScale}
              onChange={e => setImgScale(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500" />
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
            </svg>
          </div>
        </div>

        {/* ── RIGHT: controls ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* upload */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">上半部背景圖片</p>
            <button onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-3 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              {imgSrc ? '更換圖片' : '上傳圖片'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </section>

          {/* colour scheme */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">下半部色彩</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SCHEMES.map(s => (
                <button key={s.id} title={s.label} aria-label={s.label}
                  onClick={() => { setScheme(s); setCustomBg('') }}
                  className="relative rounded overflow-hidden aspect-square transition-transform hover:scale-105"
                  style={{ outline: (!customBg && scheme.id === s.id) ? '2px solid #f97316' : '2px solid transparent', outlineOffset: '2px' }}>
                  <div style={{ background: s.bg, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginTop: 'auto', padding: '2px 3px' }}>
                      <span style={{ fontSize: '6.5px', color: textCol(s.bg), fontFamily: 'Arial' }}>{s.label}</span>
                    </div>
                  </div>
                </button>
              ))}
              <label className="relative rounded overflow-hidden aspect-square cursor-pointer transition-transform hover:scale-105 border border-stone-200"
                style={{ outline: customBg ? '2px solid #f97316' : '2px solid transparent', outlineOffset: '2px' }}
                title="自訂" aria-label="自訂顏色">
                <div className="w-full h-full flex items-center justify-center" style={{ background: customBg || '#ffffff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={customBg ? textCol(customBg) : '#888'} strokeWidth="1.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                  </svg>
                </div>
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={customBg || scheme.bg} onChange={e => setCustomBg(e.target.value)} />
              </label>
            </div>
          </section>

          {/* deco shape */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">上半部裝飾形狀</p>
            <div className="grid grid-cols-5 gap-1.5">
              {DECO_SHAPES.map(d => (
                <button key={d.id} onClick={() => setDecoId(d.id)}
                  className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all"
                  style={{
                    background: decoId === d.id ? '#fff7ed' : 'transparent',
                    outline: decoId === d.id ? '1.5px solid #f97316' : '1.5px solid #e7e5e4',
                  }}>
                  {/* mini preview — photo zone only */}
                  <div className="w-9 h-[52px] rounded-sm overflow-hidden relative bg-stone-200">
                    {/* simulated photo bg */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)' }} />
                    <DecoSvg shapeId={d.id} fill={activeBg} opacity={decoOpacity} uid={`thumb-${d.id}`} />
                  </div>
                  <span className="text-[8.5px] text-stone-500 leading-none">{d.label}</span>
                </button>
              ))}
            </div>
            {decoId !== 'none' && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[10px] text-stone-400 flex-shrink-0">強度</span>
                <input type="range" min="10" max="80" step="1" value={decoOpacity}
                  onChange={e => setDecoOpacity(parseInt(e.target.value))}
                  className="flex-1 accent-orange-500" />
                <span className="text-[10px] text-stone-400 w-7 text-right">{decoOpacity}%</span>
              </div>
            )}
          </section>

          {/* border text */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase">邊框英文</p>
              <button onClick={() => setBorderOn(v => !v)} aria-label="切換邊框文字"
                className="relative rounded-full transition-colors flex-shrink-0"
                style={{ height: '18px', width: '30px', background: borderOn ? '#f97316' : '#d1d5db' }}>
                <span className="absolute top-0.5 rounded-full bg-white transition-all"
                  style={{ width: '14px', height: '14px', left: borderOn ? '14px' : '2px' }} />
              </button>
            </div>
          </section>

          {/* fonts */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-3">字體</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-stone-500 w-16 flex-shrink-0">中文<br/><span className="opacity-60">標題 / 地點</span></span>
                <select value={zhFont} onChange={e => setZhFont(e.target.value)}
                  className="flex-1 text-[11px] border border-stone-200 rounded-lg px-2 py-1.5 bg-stone-50">
                  <option value="Arial, sans-serif">Arial（無襯線）</option>
                  <option value="'Times New Roman', serif">Times New Roman（襯線）</option>
                  <option value="'Courier New', monospace">Courier New（等寬）</option>
                  <option value="Georgia, serif">Georgia（襯線）</option>
                  <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-stone-500 w-16 flex-shrink-0">英文<br/><span className="opacity-60">時間 / 邊框</span></span>
                <select value={enFont} onChange={e => setEnFont(e.target.value)}
                  className="flex-1 text-[11px] border border-stone-200 rounded-lg px-2 py-1.5 bg-stone-50">
                  <option value="Arial, sans-serif">Arial（無襯線）</option>
                  <option value="'Times New Roman', serif">Times New Roman（襯線）</option>
                  <option value="'Courier New', monospace">Courier New（等寬）</option>
                  <option value="Georgia, serif">Georgia（襯線）</option>
                  <option value="Impact, sans-serif">Impact（粗展示）</option>
                  <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                </select>
              </div>
            </div>
          </section>

          {/* export */}
          <button onClick={handleExport} disabled={isExporting}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-wide text-white transition-opacity disabled:opacity-60"
            style={{ background: '#f97316' }}>
            {isExporting ? '產生中...' : '匯出 PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
