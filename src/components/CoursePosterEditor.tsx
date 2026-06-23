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
  posterUrl?: string
}

interface Props {
  course: CourseData
  onClose: () => void
}

const THEMES = [
  { name: '橘', bg: '#FF6B1A', text: '#ffffff' },
  { name: '黃', bg: '#FFD600', text: '#1a1a1a' },
  { name: '天藍', bg: '#00AEEF', text: '#ffffff' },
  { name: '草綠', bg: '#2DB84B', text: '#ffffff' },
  { name: '珊瑚', bg: '#FF4D6D', text: '#ffffff' },
  { name: '白', bg: '#FFFFFF', text: '#1a1a1a' },
]

const A4_RATIO = 1.4142

export default function CoursePosterEditor({ course, onClose }: Props) {
  const [themeIndex, setThemeIndex] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(course.posterUrl || null)
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 })
  const [imgScale, setImgScale] = useState(1)
  const [isExporting, setIsExporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const imageAreaRef = useRef<HTMLDivElement>(null)
  const dragState = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number }>({
    active: false, startX: 0, startY: 0, originX: 0, originY: 0,
  })

  const theme = THEMES[themeIndex]
  const isLight = theme.text === '#1a1a1a'

  // poster width → derive height
  const [posterW, setPosterW] = useState(320)
  const posterH = Math.round(posterW * A4_RATIO)
  const imageAreaH = Math.round(posterW * 0.75) // top image area

  const previewContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!previewContainerRef.current) return
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w > 0) setPosterW(Math.min(w, 400))
    })
    obs.observe(previewContainerRef.current)
    return () => obs.disconnect()
  }, [])

  // File upload
  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      setUploadedImage(e.target?.result as string)
      setImgOffset({ x: 0, y: 0 })
      setImgScale(1)
    }
    reader.readAsDataURL(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('image/')) handleFile(f)
  }

  // Image drag (mouse)
  const onImgMouseDown = useCallback((e: React.MouseEvent) => {
    if (!uploadedImage) return
    e.preventDefault()
    dragState.current = { active: true, startX: e.clientX, startY: e.clientY, originX: imgOffset.x, originY: imgOffset.y }
  }, [uploadedImage, imgOffset])

  const onImgMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.active) return
    setImgOffset({
      x: dragState.current.originX + e.clientX - dragState.current.startX,
      y: dragState.current.originY + e.clientY - dragState.current.startY,
    })
  }, [])

  const onImgMouseUp = useCallback(() => { dragState.current.active = false }, [])

  // Image drag (touch)
  const onImgTouchStart = useCallback((e: React.TouchEvent) => {
    if (!uploadedImage) return
    const t = e.touches[0]
    dragState.current = { active: true, startX: t.clientX, startY: t.clientY, originX: imgOffset.x, originY: imgOffset.y }
  }, [uploadedImage, imgOffset])

  const onImgTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.active) return
    e.preventDefault()
    const t = e.touches[0]
    setImgOffset({
      x: dragState.current.originX + t.clientX - dragState.current.startX,
      y: dragState.current.originY + t.clientY - dragState.current.startY,
    })
  }, [])

  const onImgTouchEnd = useCallback(() => { dragState.current.active = false }, [])

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setImgScale(s => Math.min(3, Math.max(0.3, s - e.deltaY * 0.001)))
  }, [])

  // Export
  const handleDownload = async () => {
    if (!posterRef.current) return
    setIsExporting(true)
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2canvas) { resolve(); return }
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        s.onload = () => resolve()
        s.onerror = () => reject()
        document.head.appendChild(s)
      })
      const canvas = await (window as any).html2canvas(posterRef.current, {
        scale: 2, useCORS: true, backgroundColor: theme.bg,
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${course.title || 'poster'}.png`
      a.click()
    } catch { /* silent */ }
    setIsExporting(false)
  }

  const tagBg = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full md:max-w-3xl max-h-[95dvh] flex flex-col md:flex-row bg-[#111] md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl">

        {/* Close */}
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Left: preview */}
        <div ref={previewContainerRef} className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a] min-h-0 overflow-auto">
          {!uploadedImage ? (
            /* Upload prompt */
            <label
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/20 hover:border-orange-400 rounded-2xl p-10 cursor-pointer transition-colors w-full max-w-xs text-center"
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              <p className="text-white/50 text-sm">上傳課程海報圖片</p>
              <p className="text-white/25 text-xs">JPG / PNG，拖曳或點擊</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
          ) : (
            /* Poster preview */
            <div
              ref={posterRef}
              style={{ backgroundColor: theme.bg, color: theme.text, width: posterW, height: posterH }}
              className="relative flex-shrink-0 rounded-xl overflow-hidden flex flex-col select-none shadow-2xl"
            >
              {/* Image area */}
              <div
                ref={imageAreaRef}
                style={{ height: imageAreaH }}
                className="relative overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing"
                onMouseDown={onImgMouseDown}
                onMouseMove={onImgMouseMove}
                onMouseUp={onImgMouseUp}
                onMouseLeave={onImgMouseUp}
                onTouchStart={onImgTouchStart}
                onTouchMove={onImgTouchMove}
                onTouchEnd={onImgTouchEnd}
                onWheel={onWheel}
              >
                <img
                  src={uploadedImage}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${imgOffset.x}px), calc(-50% + ${imgOffset.y}px)) scale(${imgScale})`,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {/* Info area */}
              <div className="flex-1 flex flex-col justify-between px-5 py-4">
                <div>
                  <span className="inline-block text-[10px] tracking-[0.18em] px-2.5 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: tagBg, color: theme.text }}>
                    央北種子課程
                  </span>
                  <h2 className="text-lg font-bold leading-snug mb-0.5" style={{ color: theme.text }}>
                    {course.title || '課程名稱'}
                  </h2>
                  {course.instructor && (
                    <p className="text-sm opacity-60" style={{ color: theme.text }}>{course.instructor}</p>
                  )}
                </div>

                <div className="space-y-1.5 mt-3">
                  {(course.date || course.timeStart) && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                      <span className="opacity-75">{course.date}{course.timeStart ? ` ${course.timeStart}` : ''}{course.timeEnd ? `–${course.timeEnd}` : ''}</span>
                    </div>
                  )}
                  {course.location && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                      <span className="opacity-75">{course.location}</span>
                    </div>
                  )}
                  {course.suitableAge && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                      <span className="opacity-75">{course.suitableAge}</span>
                    </div>
                  )}
                  {course.notes && (
                    <p className="text-[10px] opacity-40 leading-relaxed pt-0.5" style={{ color: theme.text }}>{course.notes}</p>
                  )}
                  <div className="text-[9px] tracking-widest opacity-25 pt-2 border-t"
                    style={{ borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', color: theme.text }}>
                    yangbei-campaign.vercel.app
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div className="w-full md:w-60 flex-shrink-0 flex flex-col gap-5 p-5 border-t md:border-t-0 md:border-l border-white/[0.08] overflow-y-auto">

          {uploadedImage && (
            <>
              <div>
                <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2.5">主題色</p>
                <div className="grid grid-cols-3 gap-2">
                  {THEMES.map((t, i) => (
                    <button key={t.name} onClick={() => setThemeIndex(i)} title={t.name}
                      className={`h-9 rounded-lg border-2 transition-all duration-150 ${themeIndex === i ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
                      style={{ backgroundColor: t.bg }} />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2.5">調整圖片</p>
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-lg border border-white/[0.12] text-white/60 text-xs hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 mb-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  換圖片
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                <p className="text-[10px] text-white/25 text-center mb-2">在預覽上拖曳移動 · 滾輪縮放</p>
                <input type="range" min={0.3} max={3} step={0.05} value={imgScale}
                  onChange={e => setImgScale(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 h-1.5" />
                <div className="flex justify-between text-[10px] text-white/25 mt-1">
                  <span>縮小</span><span>{Math.round(imgScale * 100)}%</span><span>放大</span>
                </div>
              </div>
            </>
          )}

          {!uploadedImage && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-white/20 text-xs text-center">上傳圖片後<br/>可選擇主題色</p>
            </div>
          )}

          <div className="mt-auto">
            <button onClick={handleDownload} disabled={isExporting || !uploadedImage}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-all flex items-center justify-center gap-2">
              {isExporting ? '匯出中...' : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  下載 PNG
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
