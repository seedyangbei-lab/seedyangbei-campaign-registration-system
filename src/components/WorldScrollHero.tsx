'use client'

import { useEffect, useRef, useState } from 'react'

// 「滾動進入央北社宅」單幕版——一鏡到底：社區大門外觀 → 走進大門 → 穿過建築間走道
// → 抵達入口門 → 開門見光。滾動只驅動這支影片的播放進度（currentTime），不是真的在切頁。
// 影片還沒放進去之前，畫面顯示暖色系佔位色塊，不會整頁壞掉。
// 捲動到底之後，接續 src/app/world/page.tsx 裡下方的課程列表區塊。

const VIDEO_SRC = '/videos/world/gate-scene-v2.mp4' // 檔名加版號：確保 CDN／瀏覽器快取不會繼續吃到舊的低解析度版本
const VH_MULTIPLIER = 2.2 // 這一幕給多少倍視窗高度的捲動空間，越大代表滾動起來越慢、越細緻

export default function WorldScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewportHRef = useRef(0) // 只在 mount／resize 時更新，滾動時不重算，避免手機工具列跳動造成抖動
  const [progress, setProgress] = useState(0) // 0~1
  const [videoOk, setVideoOk] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [entered, setEntered] = useState(false) // 進場動畫用：剛載入時是否已經「定位」

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 進場動畫：頁面一載入，畫面先從「稍微縮小＋淡出」的狀態，用一個跟滾動無關的時間軸慢慢定位、淡入，
  // 讓使用者感覺鏡頭正在「靠近、對焦」，而不是一開始就整片全螢幕貼臉、像是滾動已經被拉到一半的錯覺
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60)
    return () => clearTimeout(t)
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
          el.load()
          el.addEventListener('loadedmetadata', () => setVideoOk(true), { once: true })
        }
      })
      .catch(() => { /* 影片還沒生成好，維持佔位色塊 */ })
    return () => { cancelled = true }
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const updateViewportH = () => {
      // 用 visualViewport 優先：手機瀏覽器網址列收合時比 window.innerHeight 更穩定
      viewportHRef.current = window.visualViewport?.height ?? window.innerHeight
    }
    const onScroll = () => {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const total = rect.height - viewportHRef.current
      const scrolled = Math.min(Math.max(-rect.top, 0), total)
      setProgress(total > 0 ? scrolled / total : 0)
    }
    updateViewportH()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateViewportH)
    window.addEventListener('orientationchange', updateViewportH)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateViewportH)
      window.removeEventListener('orientationchange', updateViewportH)
    }
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
    <div ref={containerRef} style={{ height: `${VH_MULTIPLIER * 100}dvh` }} className="relative bg-stone-900">
      {/* top 跟高度都要扣掉最上面 SiteNavbar 的高度（手機 52px／桌機 56px）——
          SiteNavbar 自己也是 sticky top-0，兩個 sticky 元素是手足關係、不是巢狀，
          如果這裡也用 top-0 + h-screen，滾動時這個滿版影片區塊會直接疊到導覽列「下面」，
          導覽列高度那一截影片畫面就被永久蓋住，而且 h-screen 沒扣掉導覽列高度，
          捲動總距離的計算會多算出一截，手機上工具列收合時尤其明顯，就是「跑版」的主因 */}
      <div className="sticky top-[52px] md:top-14 h-[calc(100dvh-52px)] md:h-[calc(100dvh-56px)] w-full overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: '#FDEBD3',
            transform: entered ? 'scale(1)' : 'scale(1.06)',
            opacity: entered ? 1 : 0,
            transition: 'transform 1.15s cubic-bezier(0.16,1,0.3,1), opacity 0.9s ease-out',
          }}
        >
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

        {/* 文字卡片：試過半透明暖色卡片＋backdrop-blur，但透明底跟下面素樸手繪插畫的紙感不搭，
            會有一點「玻璃感」違和。改回實色白卡（不透明），像一張真的貼在畫面上的紙卡，
            跟插畫本身乾淨、平塗、無漸層的手繪風格更一致 */}
        <div
          className="absolute left-1/2 w-[90%] max-w-xl text-center px-5 py-5 md:px-8 md:py-7 rounded-2xl"
          style={{
            top: `${textTopPercent}%`,
            transform: 'translate(-50%, -50%)',
            opacity: textOpacity,
            background: '#FFFFFF',
            boxShadow: '0 8px 28px rgba(120, 80, 40, 0.14)',
          }}
        >
          <p className="text-orange-600 text-sm font-medium tracking-widest mb-2">歡迎回家</p>
          <h2 className="text-stone-800 text-2xl md:text-5xl font-bold mb-2 md:mb-3">走進央北社宅</h2>
          <p className="text-stone-600 text-sm md:text-lg">從社區大門開始，帶你看看這裡的生活</p>
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
