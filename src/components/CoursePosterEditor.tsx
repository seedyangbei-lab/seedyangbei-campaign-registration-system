'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

declare global {
  interface Window { html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement> }
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

// ── colour-scheme helpers ──────────────────────────────────────────────────
function lum(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function textCol(bg: string) { return lum(bg) > 0.35 ? '#111111' : '#ffffff' }
function tagStyle(bg: string) {
  const dark = lum(bg) > 0.35
  return {
    bg: dark ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)',
    border: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)',
    text: dark ? '#111111' : '#ffffff',
  }
}

const SCHEMES = [
  { id: 'sky',    label: '天藍',   bg: '#38bdf8', mk: '#0284c7' },
  { id: 'lime',   label: '螢光綠', bg: '#a3e635', mk: '#4d7c0f' },
  { id: 'orange', label: '亮橘',   bg: '#fb923c', mk: '#ea580c' },
  { id: 'yellow', label: '亮黃',   bg: '#fde047', mk: '#a16207' },
  { id: 'white',  label: '白',     bg: '#ffffff', mk: '#d1d5db' },
  { id: 'black',  label: '黑',     bg: '#111111', mk: '#374151' },
  { id: 'pink',   label: '亮粉',   bg: '#f472b6', mk: '#be185d' },
]

// ── mask shape definitions (SVG path clip descriptions) ───────────────────
// All paths are in a 210×297 (A4 prop) coordinate space
// Each mask: array of ellipse/path specs rendered as SVG
type MaskShape = { id: string; label: string; desc: string; svgContent: string }

const MASKS: MaskShape[] = [
  {
    id: 'none',
    label: '無蒙版',
    desc: '純色疊加',
    svgContent: '', // full rect, no holes
  },
  {
    id: 'drift',
    label: '漂流',
    desc: '左大右小',
    // Large blob bleeds off top-left, small floats bottom-right
    svgContent: `
      <defs>
        <mask id="m-drift">
          <rect width="210" height="297" fill="white"/>
          <ellipse cx="-18" cy="95" rx="118" ry="108" fill="black" transform="rotate(-12 -18 95)"/>
          <ellipse cx="188" cy="235" rx="72" ry="62" fill="black" transform="rotate(18 188 235)"/>
        </mask>
      </defs>
      <rect id="mask-rect" width="210" height="297" fill="FILL" mask="url(#m-drift)" opacity="OPACITY"/>
    `,
  },
  {
    id: 'arc',
    label: '弧帶',
    desc: '頂部弧+底角',
    // Arc band at top, fragment at bottom-left
    svgContent: `
      <defs>
        <mask id="m-arc">
          <rect width="210" height="297" fill="white"/>
          <ellipse cx="105" cy="-52" rx="145" ry="108" fill="black"/>
          <ellipse cx="38" cy="268" rx="82" ry="68" fill="black" transform="rotate(-8 38 268)"/>
        </mask>
      </defs>
      <rect id="mask-rect" width="210" height="297" fill="FILL" mask="url(#m-arc)" opacity="OPACITY"/>
    `,
  },
  {
    id: 'tower',
    label: '立柱',
    desc: '高瘦形+寬帶',
    // Tall narrow left blob + wide shallow top-right
    svgContent: `
      <defs>
        <mask id="m-tower">
          <rect width="210" height="297" fill="white"/>
          <ellipse cx="42" cy="128" rx="72" ry="145" fill="black" transform="rotate(-6 42 128)"/>
          <ellipse cx="185" cy="58" rx="92" ry="72" fill="black" transform="rotate(14 185 58)"/>
        </mask>
      </defs>
      <rect id="mask-rect" width="210" height="297" fill="FILL" mask="url(#m-tower)" opacity="OPACITY"/>
    `,
  },
  {
    id: 'scatter',
    label: '碎形',
    desc: '三個散點',
    // Three irregular blobs at different corners
    svgContent: `
      <defs>
        <mask id="m-scatter">
          <rect width="210" height="297" fill="white"/>
          <ellipse cx="28" cy="62" rx="68" ry="58" fill="black" transform="rotate(-20 28 62)"/>
          <ellipse cx="195" cy="148" rx="52" ry="78" fill="black" transform="rotate(10 195 148)"/>
          <ellipse cx="72" cy="268" rx="82" ry="52" fill="black" transform="rotate(-8 72 268)"/>
        </mask>
      </defs>
      <rect id="mask-rect" width="210" height="297" fill="FILL" mask="url(#m-scatter)" opacity="OPACITY"/>
    `,
  },
]

// ── border-text paths (A4 210×297 space) ─────────────────────────────────
const BORDER_TEXT = 'YANGBEI COMMUNITY · SEED COURSE · YANGBEI · SEED COURSE · '
// ── MaskThumb: isolated SVG per mask to avoid id collision ───────────────
function MaskThumb({ maskId, fill }: { maskId: string; fill: string }) {
  const uid = `thumb-${maskId}`
  if (maskId === 'none') {
    return <div style={{ position: 'absolute', inset: 0, background: fill, opacity: 0.5 }} />
  }
  if (maskId === 'drift') return (
    <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs><mask id={uid}>
        <rect width="210" height="297" fill="white"/>
        <ellipse cx="-18" cy="95" rx="118" ry="108" fill="black" transform="rotate(-12 -18 95)"/>
        <ellipse cx="188" cy="235" rx="72" ry="62" fill="black" transform="rotate(18 188 235)"/>
      </mask></defs>
      <rect width="210" height="297" fill={fill} mask={`url(#${uid})`} opacity="0.82"/>
    </svg>
  )
  if (maskId === 'arc') return (
    <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs><mask id={uid}>
        <rect width="210" height="297" fill="white"/>
        <ellipse cx="105" cy="-52" rx="145" ry="108" fill="black"/>
        <ellipse cx="38" cy="268" rx="82" ry="68" fill="black" transform="rotate(-8 38 268)"/>
      </mask></defs>
      <rect width="210" height="297" fill={fill} mask={`url(#${uid})`} opacity="0.82"/>
    </svg>
  )
  if (maskId === 'tower') return (
    <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs><mask id={uid}>
        <rect width="210" height="297" fill="white"/>
        <ellipse cx="42" cy="128" rx="72" ry="145" fill="black" transform="rotate(-6 42 128)"/>
        <ellipse cx="185" cy="58" rx="92" ry="72" fill="black" transform="rotate(14 185 58)"/>
      </mask></defs>
      <rect width="210" height="297" fill={fill} mask={`url(#${uid})`} opacity="0.82"/>
    </svg>
  )
  if (maskId === 'scatter') return (
    <svg viewBox="0 0 210 297" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs><mask id={uid}>
        <rect width="210" height="297" fill="white"/>
        <ellipse cx="28" cy="62" rx="68" ry="58" fill="black" transform="rotate(-20 28 62)"/>
        <ellipse cx="195" cy="148" rx="52" ry="78" fill="black" transform="rotate(10 195 148)"/>
        <ellipse cx="72" cy="268" rx="82" ry="52" fill="black" transform="rotate(-8 72 268)"/>
      </mask></defs>
      <rect width="210" height="297" fill={fill} mask={`url(#${uid})`} opacity="0.82"/>
    </svg>
  )
  return null
}

export default function CoursePosterEditor({ course, initialImage, onClose }: Props) {
  // image state
  const [imgSrc, setImgSrc] = useState<string | null>(initialImage || null)
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  // scheme / mask / border
  const [scheme, setScheme] = useState(SCHEMES[2]) // 亮橘 default
  const [customBg, setCustomBg] = useState('')      // empty = not in use
  const [maskId, setMaskId] = useState<string>('drift')
  const [maskOpacity, setMaskOpacity] = useState(82)
  const [borderOn, setBorderOn] = useState(true)
  const [borderFont, setBorderFont] = useState('Arial, sans-serif')
  const [borderSize, setBorderSize] = useState(6)
  const [metaFont, setMetaFont] = useState('Arial, sans-serif')

  const [isExporting, setIsExporting] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // derived colours
  const activeBg = customBg || scheme.bg
  const activeMk = customBg || scheme.mk
  const tc = textCol(activeBg)
  const tg = tagStyle(activeBg)

  // image drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: imgPos.x, py: imgPos.y }
  }, [imgSrc, imgPos])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    })
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
    setImgPos({
      x: dragStart.current.px + (t.clientX - dragStart.current.mx),
      y: dragStart.current.py + (t.clientY - dragStart.current.my),
    })
  }, [isDragging])

  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  // file upload
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImgSrc(ev.target?.result as string)
      setImgPos({ x: 0, y: 0 })
      setImgScale(1)
    }
    reader.readAsDataURL(file)
  }

  // html2canvas dynamic load + export
  const handleExport = useCallback(async () => {
    if (!posterRef.current) return
    setIsExporting(true)
    try {
      if (!window.html2canvas) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          s.onload = () => res()
          s.onerror = () => rej(new Error('html2canvas load failed'))
          document.head.appendChild(s)
        })
      }
      await document.fonts.ready
      const canvas = await window.html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: activeBg,
        logging: false,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${course.title || 'poster'}.png`
      a.click()
    } catch (_e) {
      console.error('Export failed', _e)
    } finally {
      setIsExporting(false)
    }
  }, [activeBg, course.title])

  // build poster SVG mask string
  const maskDef = MASKS.find(m => m.id === maskId)
  const maskSvg = maskDef && maskDef.svgContent
    ? maskDef.svgContent
        .replace(/FILL/g, activeMk)
        .replace(/OPACITY/g, (maskOpacity / 100).toFixed(2))
    : null

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full md:max-w-4xl md:mx-4 flex flex-col md:flex-row bg-white md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '95dvh' }}
      >
        {/* close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          aria-label="關閉"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* ── LEFT: poster preview ── */}
        <div className="md:w-[340px] flex-shrink-0 flex flex-col items-center justify-center bg-stone-100 p-6 gap-3">
          {/* A4 ratio = 1:√2 ≈ 210:297 */}
          <div
            ref={posterRef}
            className="relative overflow-hidden rounded-sm select-none flex-shrink-0"
            style={{
              width: '210px',
              height: '297px',
              minWidth: '210px',
              minHeight: '297px',
              backgroundColor: activeBg,
              cursor: imgSrc ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* photo layer */}
            {imgSrc && (
              <img
                src={imgSrc}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  width: `${imgScale * 100}%`,
                  height: `${imgScale * 100}%`,
                  objectFit: 'cover',
                  left: `${imgPos.x}px`,
                  top: `${imgPos.y}px`,
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              />
            )}

            {/* colour mask layer (SVG) */}
            {maskSvg ? (
              <svg
                viewBox="0 0 210 297"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                dangerouslySetInnerHTML={{ __html: maskSvg }}
              />
            ) : maskId === 'none' ? (
              /* no-mask mode: solid colour overlay at reduced opacity so photo shows through */
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: activeMk,
                  opacity: maskOpacity / 100,
                  pointerEvents: 'none',
                }}
              />
            ) : null}

            {/* border text SVG */}
            {borderOn && (
              <svg
                viewBox="0 0 210 297"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              >
                <defs>
                  <path id="bte" d="M 9,10 H 201"/>
                  <path id="bre" d="M 203,10 V 287"/>
                  <path id="bbe" d="M 201,289 H 9"/>
                  <path id="ble" d="M 7,287 V 10"/>
                </defs>
                {(['bte','bre','bbe','ble'] as const).map((id, i) => (
                  <text key={id} fontSize={borderSize} letterSpacing="3" fill={tc} opacity="0.38" fontFamily={borderFont}>
                    <textPath href={`#${id}`} {...(i >= 2 ? { side: 'right' } : {})}>
                      {BORDER_TEXT.repeat(5)}
                    </textPath>
                  </text>
                ))}
              </svg>
            )}

            {/* course info */}
            <div
              className="absolute inset-0 flex flex-col justify-end"
              style={{ padding: '14px', pointerEvents: 'none' }}
            >
              {/* tag pill */}
              <div
                className="inline-flex items-center mb-2 rounded-full px-2 py-0.5 text-[7px] tracking-widest uppercase"
                style={{
                  width: 'fit-content',
                  background: tg.bg,
                  border: `0.5px solid ${tg.border}`,
                  color: tg.text,
                  fontFamily: 'Arial, sans-serif',
                  letterSpacing: '0.16em',
                }}
              >
                種子課程
              </div>

              <div
                className="text-[17px] font-medium leading-snug mb-1.5"
                style={{ color: tc }}
              >
                {course.title || '課程名稱'}
              </div>

              <div
                className="text-[9.5px] leading-loose opacity-88"
                style={{ color: tc, fontFamily: metaFont }}
              >
                {course.date && <span>{course.date}<br /></span>}
                {(course.timeStart || course.timeEnd) && (
                  <span>{course.timeStart}{course.timeEnd ? ` – ${course.timeEnd}` : ''}<br /></span>
                )}
                {course.location && <span>{course.location}<br /></span>}
                {course.instructor && <span>{course.instructor}</span>}
              </div>
            </div>
          </div>

          {/* zoom slider */}
          <div className="w-[210px] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M8 11h6"/>
            </svg>
            <input
              type="range" min="0.5" max="3" step="0.05" value={imgScale}
              onChange={e => setImgScale(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/>
            </svg>
          </div>
        </div>

        {/* ── RIGHT: controls panel ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* upload */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">背景圖片</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-3 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              {imgSrc ? '更換圖片' : '上傳圖片'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </section>

          {/* colour scheme */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">色彩方案</p>
            <div className="grid grid-cols-4 gap-1.5">
              {SCHEMES.map(s => (
                <button
                  key={s.id}
                  title={s.label}
                  aria-label={s.label}
                  onClick={() => { setScheme(s); setCustomBg('') }}
                  className="relative rounded overflow-hidden aspect-square transition-transform hover:scale-105"
                  style={{
                    outline: (!customBg && scheme.id === s.id) ? '2px solid #f97316' : '2px solid transparent',
                    outlineOffset: '2px',
                  }}
                >
                  <div style={{ background: s.bg, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginTop: 'auto', padding: '2px 3px', background: s.mk + '44' }}>
                      <span style={{ fontSize: '6.5px', color: textCol(s.bg), fontFamily: 'Arial' }}>{s.label}</span>
                    </div>
                  </div>
                </button>
              ))}
              {/* custom colour */}
              <label
                className="relative rounded overflow-hidden aspect-square cursor-pointer transition-transform hover:scale-105 border border-stone-200"
                style={{ outline: customBg ? '2px solid #f97316' : '2px solid transparent', outlineOffset: '2px' }}
                title="自訂"
                aria-label="自訂顏色"
              >
                <div className="w-full h-full flex items-center justify-center" style={{ background: customBg || '#ffffff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={customBg ? textCol(customBg) : '#888'} strokeWidth="1.5" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                  </svg>
                </div>
                <input
                  type="color"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  value={customBg || scheme.bg}
                  onChange={e => setCustomBg(e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* mask style */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">蒙版樣式</p>
            <div className="grid grid-cols-5 gap-1.5">
              {MASKS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMaskId(m.id)}
                  className="flex flex-col items-center gap-1 rounded-lg p-1.5 transition-all"
                  style={{
                    background: maskId === m.id ? '#fff7ed' : 'transparent',
                    outline: maskId === m.id ? '1.5px solid #f97316' : '1.5px solid #e7e5e4',
                  }}
                >
                 {/* mini preview — each gets unique id to avoid SVG mask collision */}
                  <div className="w-8 h-[45px] rounded-sm overflow-hidden relative" style={{ background: activeBg }}>
                    <MaskThumb maskId={m.id} fill={activeMk} />
                  </div>
                  <span className="text-[8.5px] text-stone-500 leading-none">{m.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] text-stone-400 flex-shrink-0">透明度</span>
              <input
                type="range" min="0" max="100" step="1" value={maskOpacity}
                onChange={e => setMaskOpacity(parseInt(e.target.value))}
                className="flex-1 accent-orange-500"
              />
              <span className="text-[10px] text-stone-400 w-7 text-right">{maskOpacity}%</span>
            </div>
          </section>

          {/* border text */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase">邊框文字</p>
              <button
                onClick={() => setBorderOn(v => !v)}
                className={`w-8 h-4.5 rounded-full relative transition-colors ${borderOn ? 'bg-orange-400' : 'bg-stone-300'}`}
                style={{ height: '18px', width: '30px' }}
                aria-label="切換邊框文字"
              >
                <span
                  className="absolute top-0.5 rounded-full bg-white transition-all"
                  style={{ width: '14px', height: '14px', left: borderOn ? '14px' : '2px' }}
                />
              </button>
            </div>
            {borderOn && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 w-10">字體</span>
                  <select
                    value={borderFont}
                    onChange={e => setBorderFont(e.target.value)}
                    className="flex-1 text-[10px] border border-stone-200 rounded px-1.5 py-1 bg-stone-50"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 w-10">字級</span>
                  <input
                    type="range" min="4" max="14" step="0.5" value={borderSize}
                    onChange={e => setBorderSize(parseFloat(e.target.value))}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-[10px] text-stone-400 w-7 text-right">{borderSize}px</span>
                </div>
              </div>
            )}
          </section>

          {/* meta font */}
          <section>
            <p className="text-[10px] font-medium text-stone-400 tracking-widest uppercase mb-2">日期 / 資訊字體</p>
            <select
              value={metaFont}
              onChange={e => setMetaFont(e.target.value)}
              className="w-full text-[11px] border border-stone-200 rounded-lg px-2 py-1.5 bg-stone-50"
            >
              <option value="Arial, sans-serif">Arial</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
            </select>
          </section>

          {/* export */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-3 rounded-xl text-sm font-medium tracking-wide text-white transition-opacity disabled:opacity-60"
            style={{ background: '#f97316' }}
          >
            {isExporting ? '產生中...' : '匯出 PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}
