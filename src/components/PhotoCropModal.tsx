'use client'

import { useEffect, useRef, useState } from 'react'

const VIEW = 280 // 裁切預覽框尺寸（正方形，單位 px）
const OUTPUT = 1080 // 輸出圖片解析度（正方形）
const MAX_ZOOM = 3

type Props = {
  src: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export default function PhotoCropModal({ src, onCancel, onConfirm }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [ready, setReady] = useState(false)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [baseScale, setBaseScale] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [exporting, setExporting] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight
      const cover = Math.max(VIEW / w, VIEW / h)
      setNatural({ w, h })
      setBaseScale(cover)
      setZoom(1)
      setOffset({ x: (VIEW - w * cover) / 2, y: (VIEW - h * cover) / 2 })
      imgRef.current = img
      setReady(true)
    }
    img.src = src
  }, [src])

  const clampOffset = (x: number, y: number, z: number) => {
    const dw = natural.w * baseScale * z
    const dh = natural.h * baseScale * z
    const minX = VIEW - dw, maxX = 0
    const minY = VIEW - dh, maxY = 0
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    }
  }

  const handleZoomChange = (z: number) => {
    setZoom(z)
    setOffset(prev => clampOffset(prev.x, prev.y, z))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(clampOffset(dragRef.current.offX + dx, dragRef.current.offY + dy, zoom))
  }
  const onPointerUp = () => { dragRef.current = null }

  const handleConfirm = () => {
    if (!imgRef.current) return
    setExporting(true)
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) { setExporting(false); return }
    const effScale = baseScale * zoom
    const srcX = -offset.x / effScale
    const srcY = -offset.y / effScale
    const srcSize = VIEW / effScale
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

        <div
          className="relative bg-stone-100 rounded-xl overflow-hidden touch-none select-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {ready && (
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute pointer-events-none"
              style={{
                width: natural.w * baseScale * zoom,
                height: natural.h * baseScale * zoom,
                left: offset.x,
                top: offset.y,
              }}
            />
          )}
          <div className="absolute inset-0 border-2 border-white/70 rounded-xl pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 w-full">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-stone-400 shrink-0"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom}
            onChange={e => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1 accent-orange-500"
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-stone-400 shrink-0"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        <p className="text-xs text-stone-400 -mt-2">拖曳調整位置，拉桿縮放，裁出想呈現的 1:1 範圍</p>

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
