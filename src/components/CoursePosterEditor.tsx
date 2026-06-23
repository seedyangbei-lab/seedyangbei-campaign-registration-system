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

const PRESET_THEMES = [
  { bg: '#FF6B1A', text: '#ffffff' },
  { bg: '#FFD600', text: '#1a1a1a' },
  { bg: '#00AEEF', text: '#ffffff' },
  { bg: '#2DB84B', text: '#ffffff' },
  { bg: '#FF4D6D', text: '#ffffff' },
  { bg: '#FFFFFF', text: '#1a1a1a' },
]

const A4_RATIO = 1.4142

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function getTextColor(hex: string): string {
  try {
    return getLuminance(hex) > 0.35 ? '#1a1a1a' : '#ffffff'
  } catch (_e) {
    return '#ffffff'
  }
}

export default function CoursePosterEditor({ course, initialImage, onClose }: Props) {
  const [bgColor, setBgColor] = useState(PRESET_THEMES[0].bg)
  const [textColor, setTextColor] = useState(PRESET_THEMES[0].text)
  const [uploadedImage, setUploadedImage] = useState<string | null>(initialImage ?? null)
  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 })
  const [imgScale, setImgScale] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [posterW, setPosterW] = useState(300)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  const posterH = Math.round(posterW * A4_RATIO)
  const imageAreaH = Math.round(posterW * 0.72)
  const tagBg = textColor === '#1a1a1a' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)'

  useEffect(() => {
    const el = previewContainerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      if (w > 0) setPosterW(Math.min(Math.floor(w - 32), 380))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const applyTheme = (bg: string, text: string) => {
    setBgColor(bg)
    setTextColor(text)
  }

  const applyCustomColor = (hex: string) => {
    setBgColor(hex)
    setTextColor(getTextColor(hex))
  }

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
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
    if (f?.type.startsWith('image/')) handleFile(f)
  }

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!uploadedImage) return
      e.preventDefault()
      dragState.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: imgOffset.x,
        originY: imgOffset.y,
      }
    },
    [uploadedImage, imgOffset]
  )

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.current.active) return
    setImgOffset({
      x: dragState.current.originX + e.clientX - dragState.current.startX,
      y: dragState.current.originY + e.clientY - dragState.current.startY,
    })
  }, [])

  const onMouseUp = useCallback(() => {
    dragState.current.active = false
  }, [])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!uploadedImage) return
      const t = e.touches[0]
      dragState.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        originX: imgOffset.x,
        originY: imgOffset.y,
      }
    },
    [uploadedImage, imgOffset]
  )

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current.active) return
    e.preventDefault()
    const t = e.touches[0]
    setImgOffset({
      x: dragState.current.originX + t.clientX - dragState.current.startX,
      y: dragState.current.originY + t.clientY - dragState.current.startY,
    })
  }, [])

  const onTouchEnd = useCallback(() => {
    dragState.current.active = false
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setImgScale((s) => Math.min(3, Math.max(0.3, s - e.deltaY * 0.001)))
  }, [])

  const handleDownload = async () => {
    if (!posterRef.current) return
    setIsExporting(true)
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2canvas) {
          resolve()
          return
        }
        const s = document.createElement('script')
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('load failed'))
        document.head.appendChild(s)
      })
      const canvas = await (window as any).html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: bgColor,
      })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${course.title || 'poster'}.png`
      a.click()
    } catch (_e) {
      // silent
    }
    setIsExporting(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="relative w-full md:max-w-4xl md:mx-4 flex flex-col md:flex-row bg-[#111] md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
        style={{ maxHeight: '95dvh' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="關閉"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Left: preview */}
        <div
          ref={previewContainerRef}
          className="flex-1 flex items-center justify-center p-4 bg-[#0a0a0a] overflow-auto min-h-[300px]"
        >
          {!uploadedImage ? (
            <label
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/20 hover:border-orange-400 rounded-2xl p-10 cursor-pointer transition-colors w-full max-w-xs text-center"
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/30" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <p className="text-white/50 text-sm">上傳海報圖片</p>
              <p className="text-white/25 text-xs">JPG / PNG，拖曳或點擊</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
          ) : (
            <div
              ref={posterRef}
              style={{ backgroundColor: bgColor, color: textColor, width: posterW, height: posterH }}
              className="relative flex-shrink-0 rounded-xl overflow-hidden flex flex-col select-none shadow-2xl"
            >
              {/* Image frame */}
              <div
                style={{ height: imageAreaH }}
                className="relative overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing bg-black/10"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
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

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between px-5 py-4">
                <div>
                  <span
                    className="inline-block text-xs tracking-[0.18em] px-2.5 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: tagBg, color: textColor }}
                  >
                    央北種子課程
                  </span>
                  <h2 className="text-2xl font-bold leading-snug mb-1" style={{ color: textColor }}>
                    {course.title || '課程名稱'}
                  </h2>
                  {course.instructor && (
                    <p className="text-base opacity-60" style={{ color: textColor }}>
                      {course.instructor}
                    </p>
                  )}
                </div>

                <div className="space-y-2 mt-3">
                  {(course.date || course.timeStart) && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: textColor }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <span className="opacity-80">
                        {course.date}
                        {course.timeStart ? ` ${course.timeStart}` : ''}
                        {course.timeEnd ? `–${course.timeEnd}` : ''}
                      </span>
                    </div>
                  )}
                  {course.location && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: textColor }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      <span className="opacity-80">{course.location}</span>
                    </div>
                  )}
                  {course.suitableAge && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: textColor }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                      </svg>
                      <span className="opacity-80">{course.suitableAge}</span>
                    </div>
                  )}
                  {course.notes && (
                    <p className="text-xs opacity-40 leading-relaxed pt-0.5" style={{ color: textColor }}>
                      {course.notes}
                    </p>
                  )}
                  <div
                    className="text-[10px] tracking-widest opacity-25 pt-2 border-t"
                    style={{
                      borderColor: textColor === '#1a1a1a' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                      color: textColor,
                    }}
                  >
                    yangbei-campaign.vercel.app
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: controls */}
        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-5 p-5 border-t md:border-t-0 md:border-l border-white/[0.08] overflow-y-auto">
          {/* Theme presets */}
          <div>
            <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2.5">底色</p>
            <div className="grid grid-cols-6 md:grid-cols-3 gap-2 mb-3">
              {PRESET_THEMES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => applyTheme(t.bg, t.text)}
                  title={t.bg}
                  className={`h-9 rounded-lg border-2 transition-all duration-150 ${
                    bgColor === t.bg ? 'border-white scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.bg }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <div className="relative w-9 h-9 rounded-lg overflow-hidden border-2 border-white/20 flex-shrink-0">
                  <div className="absolute inset-0" style={{ backgroundColor: bgColor }} />
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => applyCustomColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <span className="text-xs text-white/40">自訂顏色</span>
              </label>
              <span className="text-xs text-white/20 font-mono">{bgColor}</span>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5">深底色自動配白字，淺底色配深字</p>
          </div>

          {/* Image controls */}
          {uploadedImage && (
            <div>
              <p className="text-[10px] tracking-widest text-white/40 uppercase mb-2.5">圖片</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 rounded-lg border border-white/[0.12] text-white/60 text-xs hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 mb-3"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                換圖片
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              <p className="text-[10px] text-white/25 mb-2">在預覽上拖曳移動·滾輪或滑桿縮放</p>
              <input
                type="range"
                min={0.3}
                max={3}
                step={0.05}
                value={imgScale}
                onChange={(e) => setImgScale(parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-white/25 mt-1">
                <span>縮小</span>
                <span>{Math.round(imgScale * 100)}%</span>
                <span>放大</span>
              </div>
            </div>
          )}

          {/* Download */}
          <div className="mt-auto pt-2">
            <button
              onClick={handleDownload}
              disabled={isExporting || !uploadedImage}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-full transition-all flex items-center justify-center gap-2"
            >
              {isExporting ? (
                '匯出中...'
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
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
