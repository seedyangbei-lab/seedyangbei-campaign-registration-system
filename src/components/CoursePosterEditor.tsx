'use client'

import { useState, useRef, useCallback } from 'react'

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

interface CoursePosterEditorProps {
  course: CourseData
  onClose: () => void
}

const THEME_COLORS = [
  { name: '橘', bg: '#f97316', text: '#ffffff' },
  { name: '石板', bg: '#1c1917', text: '#ffffff' },
  { name: '森', bg: '#166534', text: '#ffffff' },
  { name: '靛', bg: '#1e3a5f', text: '#ffffff' },
  { name: '玫', bg: '#be185d', text: '#ffffff' },
  { name: '沙', bg: '#f5f0e8', text: '#1c1917' },
]

export default function CoursePosterEditor({ course, onClose }: CoursePosterEditorProps) {
  const [themeIndex, setThemeIndex] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(course.posterUrl || null)
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const posterRef = useRef<HTMLDivElement>(null)

  const theme = THEME_COLORS[themeIndex]
  const isLight = theme.text === '#1c1917'

  // Image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string)
      setImgPos({ x: 0, y: 0 })
      setImgScale(1)
    }
    reader.readAsDataURL(file)
  }

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!uploadedImage) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y })
  }, [uploadedImage, imgPos])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, dragStart])

  const onMouseUp = useCallback(() => setIsDragging(false), [])

  // Scroll to zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setImgScale(prev => Math.min(3, Math.max(0.3, prev - e.deltaY * 0.001)))
  }, [])

  // Export PNG via html2canvas (dynamic import)
  const handleDownload = async () => {
    if (!posterRef.current) return
    setIsExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(posterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: theme.bg,
      })
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${course.title || 'poster'}.png`
      a.click()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col md:flex-row bg-[#111] rounded-2xl overflow-hidden shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="關閉"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Left: Poster Preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-[#0a0a0a]">
          <div
            ref={posterRef}
            style={{ backgroundColor: theme.bg, color: theme.text }}
            className="relative w-[320px] h-[454px] rounded-xl overflow-hidden flex flex-col select-none"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            {/* Image area */}
            <div className="relative h-[200px] overflow-hidden bg-black/20 cursor-grab active:cursor-grabbing">
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    transform: `translate(${imgPos.x}px, ${imgPos.y}px) scale(${imgScale})`,
                    transformOrigin: 'center',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    userSelect: 'none',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-between p-5">
              <div>
                {/* Category tag */}
                <div
                  className="inline-block text-[10px] tracking-[0.2em] px-2 py-0.5 rounded-full mb-3 uppercase"
                  style={{
                    backgroundColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)',
                    color: theme.text,
                  }}
                >
                  央北種子課程
                </div>

                {/* Title */}
                <h2
                  className="text-xl font-bold leading-snug mb-1"
                  style={{ color: theme.text }}
                >
                  {course.title || '課程名稱'}
                </h2>

                {/* Instructor */}
                {course.instructor && (
                  <p className="text-sm opacity-60 mb-3" style={{ color: theme.text }}>
                    {course.instructor}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                {/* Date + Time */}
                {(course.date || course.timeStart) && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                    <span className="opacity-80">
                      {course.date}{course.timeStart ? ` ${course.timeStart}` : ''}{course.timeEnd ? `–${course.timeEnd}` : ''}
                    </span>
                  </div>
                )}

                {/* Location */}
                {course.location && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>
                    </svg>
                    <span className="opacity-80">{course.location}</span>
                  </div>
                )}

                {/* Age */}
                {course.suitableAge && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.text }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                    </svg>
                    <span className="opacity-80">{course.suitableAge}</span>
                  </div>
                )}

                {/* Notes */}
                {course.notes && (
                  <p className="text-[10px] opacity-40 pt-1 leading-relaxed" style={{ color: theme.text }}>
                    {course.notes}
                  </p>
                )}

                {/* Footer */}
                <div
                  className="text-[9px] tracking-widest opacity-30 pt-2 border-t"
                  style={{ borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', color: theme.text }}
                >
                  yangbei-campaign.vercel.app
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="w-full md:w-64 flex flex-col gap-6 p-6 border-t md:border-t-0 md:border-l border-white/[0.08] overflow-y-auto">

          <div>
            <p className="text-xs tracking-widest text-white/40 uppercase mb-3">主題色</p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_COLORS.map((c, i) => (
                <button
                  key={c.name}
                  onClick={() => setThemeIndex(i)}
                  title={c.name}
                  className={`h-10 rounded-lg transition-all duration-200 ${themeIndex === i ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: c.bg }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs tracking-widest text-white/40 uppercase mb-3">海報圖片</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-lg border border-white/[0.12] text-white/70 text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              上傳圖片
            </button>
            {uploadedImage && (
              <p className="text-[10px] text-white/30 mt-2 text-center">拖曳移動・滾輪縮放</p>
            )}
          </div>

          <div>
            <p className="text-xs tracking-widest text-white/40 uppercase mb-3">縮放</p>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={imgScale}
              onChange={(e) => setImgScale(parseFloat(e.target.value))}
              className="w-full accent-orange-500"
            />
            <p className="text-[10px] text-white/30 mt-1 text-right">{Math.round(imgScale * 100)}%</p>
          </div>

          <div className="mt-auto pt-4 border-t border-white/[0.08]">
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-full transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <span>匯出中...</span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
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
