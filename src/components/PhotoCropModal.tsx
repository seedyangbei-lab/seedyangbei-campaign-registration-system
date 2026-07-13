'use client'

import { useEffect, useRef, useState } from 'react'

const STAGE = 300 // 裁切舞台尺寸（顯示完整圖片的容器，單位 px）
const OUTPUT = 1080 // 輸出圖片解析度（正方形）
const MIN_CROP = 60 // 裁切框最小尺寸
const HANDLE = 18 // 縮放把手尺寸

type ImgBox = { left: number; top: number; width: number; height: number }
type CropBox = { x: number; y: number; size: number }
type DragMode = 'move' | 'resize'

type Props = {
  src: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export default function PhotoCropModal({ src, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [ready, setReady] = useState(false)
  const [displayScale, setDisplayScale] = useState(1)
  const [imgBox, setImgBox] = useState<ImgBox>({ left: 0, top: 0, width: STAGE, height: STAGE })
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, size: STAGE })
  const [exporting, setExporting] = useState(false)

  // 用 window 監聽拖曳，避免游標移動太快離開元件範圍時中斷拖曳（比 onPointerLeave/pointer capture 更穩定）
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; crop: CropBox } | null>(null)
  const imgBoxRef = useRef(imgBox)
  useEffect(() => { imgBoxRef.current = imgBox }, [imgBox])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight
      const scale = Math.min(STAGE / w, STAGE / h)
      const dispW = w * scale, dispH = h * scale
      const left = (STAGE - dispW) / 2, top = (STAGE - dispH) / 2
      const size = Math.min(dispW, dispH)
      setImgBox({ left, top, width: dispW, height: dispH })
      setDisplayScale(scale)
      setCrop({ x: left + (dispW - size) / 2, y: top + (dispH - size) / 2, size })
      imgRef.current = img
      setReady(true)
    }
    img.src = src
  }, [src])

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      e.preventDefault()
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const box = imgBoxRef.current
      if (drag.mode === 'move') {
        setCrop(clamp({ x: drag.crop.x + dx, y: drag.crop.y + dy, size: drag.crop.size }, box))
      } else {
        const delta = Math.max(dx, dy)
        setCrop(clamp({ x: drag.crop.x, y: drag.crop.y, size: drag.crop.size + delta }, box))
      }
    }
    const handleUp = () => { dragRef.current = null }
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [])

  const clamp = (next: CropBox, box: ImgBox): CropBox => {
    const maxSize = Math.min(box.width, box.height)
    const size = Math.min(Math.max(MIN_CROP, next.size), maxSize)
    const x = Math.min(box.left + box.width - size, Math.max(box.left, next.x))
    const y = Math.min(box.top + box.height - size, Math.max(box.top, next.y))
    return { x, y, size }
  }

  const startDrag = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, crop }
  }

  const handleConfirm = () => {
    if (!imgRef.current) return
    setExporting(true)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) { setExporting(false); return }
    const srcX = (crop.x - imgBox.left) / displayScale
    const srcY = (crop.y - imgBox.top) / displayScale
    const srcSize = crop.size / displayScale
    ctx.drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT)
    canvas.toBlob(blob => {
      setExporting(false)
      if (blob) onConfirm(blob)
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="font-bold text-stone-800 text-base">裁切照片</h3>
          <button onClick={onCancel} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" aria-label="關閉">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="relative bg-stone-900 rounded-xl overflow-hidden touch-none select-none" style={{ width: STAGE, height: STAGE }}>
          {ready && (
            <>
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute pointer-events-none"
                style={{ left: imgBox.left, top: imgBox.top, width: imgBox.width, height: imgBox.height }}
              />
              {/* 裁切框：用超大 box-shadow 讓框外變暗，框內清楚顯示會保留的範圍 */}
              <div
                onPointerDown={startDrag('move')}
                className="absolute border-2 border-white cursor-move"
                style={{
                  left: crop.x, top: crop.y, width: crop.size, height: crop.size,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                }}
              >
                {/* 三分格輔助線，方便對齊構圖 */}
                <div className="absolute inset-0 pointer-events-none opacity-60">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/60" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/60" />
                </div>
                {/* 縮放把手（右下角，完全內縮在框內，不超出舞台範圍） */}
                <div
                  onPointerDown={startDrag('resize')}
                  className="absolute bg-white border-2 border-orange-500 rounded-full cursor-nwse-resize"
                  style={{ right: 2, bottom: 2, width: HANDLE, height: HANDLE }}
                />
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-stone-400 -mt-2">拖曳框內移動位置，拖曳右下角圓點調整裁切範圍大小</p>

        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-2.5 rounded-xl text-sm transition-colors">
            取消
          </button>
          <button onClick={handleConfirm} disabled={!ready || exporting}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-2.5 rounded-xl text-sm transition-colors">
            {exporting ? '處理中...' : '確認裁切'}
          </button>
        </div>
      </div>
    </div>
  )
}
