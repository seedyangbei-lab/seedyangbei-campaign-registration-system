'use client'

import { useEffect, useRef, useState } from 'react'

// 「滾動進入央北社宅」單幕版——一鏡到底：社區大門外觀 → 走進大門 → 穿過建築間走道
// → 抵達入口門 → 開門見光。滾動只驅動這支影片的播放進度（currentTime），不是真的在切頁。
// 影片還沒放進去之前，畫面顯示暖色系佔位色塊，不會整頁壞掉。
// 捲動到底之後，接續 src/app/world/page.tsx 裡下方的課程列表區塊。

const VIDEO_SRC = '/videos/world/gate-scene.mp4'
const VH_MULTIPLIER = 2.2 // 這一幕給多少倍視窗高度的捲動空間，越大代表滾動起來越慢、越細緻

export default function WorldScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [progress, setProgress] = useState(0) // 0~1
  const [videoOk, setVideoOk] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 用 blob 載入影片，確保 seek 一定準（靜態主機常常不支援 range request，導致卡在第 0 幀）
  useEffect(() => {
    if (reducedMotion) return
    let cancelled = false
    fetch(VIDEO_SRC)
      .then(r => { if (!r.ok) throw new Error('no video yet'); return r.blob() })
      .then(blob => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        const el = videoRef.current
        if (el) {
          el.src = url
          el.addEventListener('loadedmetadata', () => setVideoOk(true), { once: true })
        }
      })
      .catch(() => { /* 影片還沒生成好，維持佔位色塊 */ })
    return () => { cancelled = true }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - window.innerHeight
      const scrolled = Math.min(Math.max(-rect.top, 0), total)
      setProgress(total > 0 ? scrolled / total : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const v = videoRef.current
    if (!v || !videoOk || !v.duration) return
    v.currentTime = Math.min(progress * v.duration, v.duration - 0.05)
  }, [progress, videoOk, reducedMotion])

  if (reducedMotion) {
    // 尊重「減少動態效果」：直接用靜態內容呈現，不放影片
    return (
      <section className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6" style={{ background: '#FDEBD3' }}>
        <p className="text-orange-600 text-sm font-medium mb-2">歡迎回家</p>
        <h2 className="text-3xl font-bold text-stone-800 mb-3">走進央北社宅</h2>
        <p className="text-stone-600">從社區大門開始，帶你看看這裡的生活</p>
      </section>
    )
  }

  // 文字疊字：開頭在建築物上方（天空區），滾動時往下移到畫面正中央，同時淡出，讓出畫面給開門瞬間
  const moveT = Math.min(progress / 0.35, 1)
  const textTopPercent = 16 + moveT * (50 - 16)
  const textOpacity = Math.max(0, 1 - progress / 0.35)
  const hintOpacity = progress < 0.9 ? 1 : 0

  return (
    <div ref={containerRef} style={{ height: `${VH_MULTIPLIER * 100}vh` }} className="relative bg-stone-900">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: '#FDEBD3' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: videoOk ? 1 : 0, transition: 'opacity 0.4s' }}
          />
          {!videoOk && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-stone-500 text-sm">〔影片尚未生成：{VIDEO_SRC}〕</p>
            </div>
          )}
        </div>

        {/* 文字疊在天空區時，底下的雲/建築物顏色偏淺，白字直接放上去對比不夠——
            疊一層由上往下淡出的深色暈影，確保文字在任何位置都跟得上 WCAG 對比 */}
        <div
          className="absolute inset-x-0 top-0 h-[65%] pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.12) 60%, rgba(0,0,0,0) 100%)' }}
        />

        <div
          className="absolute left-1/2 w-full max-w-xl text-center px-6"
          style={{ top: `${textTopPercent}%`, transform: 'translate(-50%, -50%)', opacity: textOpacity }}
        >
          <p className="text-orange-300 text-sm font-medium tracking-widest mb-2">歡迎回家</p>
          <h2 className="text-white text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg">走進央北社宅</h2>
          <p className="text-white/90 text-lg drop-shadow">從社區大門開始，帶你看看這裡的生活</p>
        </div>

        <p
          className="absolute left-6 bottom-6 text-white/50 text-xs transition-opacity duration-300"
          style={{ opacity: hintOpacity }}
        >
          往下滑，繼續往前走
        </p>
      </div>
    </div>
  )
}
