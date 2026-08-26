'use client'

import { useEffect, useRef, useState } from 'react'

// 「滾動進入央北社宅」單幕版——一鏡到底：社區大門外觀 → 走進大門 → 穿過建築間走道
// → 抵達入口門 → 開門見光。滾動只驅動這支影片的播放進度（currentTime），不是真的在切頁。
// 影片還沒放進去之前，畫面顯示暖色系佔位色塊，不會整頁壞掉。
// 捲動到底之後，接續 src/app/world/page.tsx 裡下方的課程列表區塊。

const DESKTOP_VIDEO_SRC = '/videos/world/gate-scene-v3.mp4'
const MOBILE_VIDEO_SRC = '/videos/world/gate-scene-mobile.mp4' // 原生 9:16 直式素材，不用再靠模糊背景墊底湊版面
const VH_MULTIPLIER = 2.2 // 這一幕給多少倍視窗高度的捲動空間，越大代表滾動起來越慢、越細緻

export default function WorldScrollHero({ mobileOnly = false }: { mobileOnly?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewportHRef = useRef(0) // 只在 mount／resize 時更新，滾動時不重算，避免手機工具列跳動造成抖動
  const [progress, setProgress] = useState(0) // 0~1
  const [videoOk, setVideoOk] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [entered, setEntered] = useState(false) // 進場動畫用：剛載入時是否已經「定位」
  // 現在有兩支原生比例都對的素材（桌機 16:9／手機 9:16），不用再靠「模糊背景墊底＋object-contain」
  // 硬湊版面，直接依斷點切換來源、用 object-cover 滿版顯示即可
  // 初始值直接吃 mobileOnly：首頁那邊 mobileOnly=true 時，第一次 render 就能定案是手機版影片，
  // 不會像之前那樣先掛上桌機版 src 再馬上被 matchMedia effect 換掉，白白多發一個桌機影片的請求
  // 跟真正要播的手機影片搶頻寬，拖慢「第一幀畫面出現」的時間。
  const [isMobile, setIsMobile] = useState(mobileOnly)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    // mobileOnly：首頁那邊已經用 md:hidden 包住、只在手機寬度掛載，這裡直接鎖 isMobile=true，
    // 不用再判斷斷點，也不會在桌機寬度時白白多載一支用不到的桌機版影片
    if (mobileOnly) { setIsMobile(true); return }
    // 768px 對齊 Tailwind 的 md 斷點，跟其他地方（SiteNavbar 等）判斷桌機/手機的邊界一致
    const mq = window.matchMedia('(min-width: 768px)')
    setIsMobile(!mq.matches)
    const onChange = () => setIsMobile(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mobileOnly])

  const videoSrc = isMobile ? MOBILE_VIDEO_SRC : DESKTOP_VIDEO_SRC

  // 順序是「導覽列 > 報名步驟條 > 這支影片」，這三段要收在第一個 100vh 裡，影片區塊的
  // sticky top／高度要扣掉導覽列（固定常數 52／56px）+ 報名步驟條的實際渲染高度。
  // 步驟條本身也是 sticky，量測時不能包一層 wrapper div 去取 ref——那會讓 wrapper 高度
  // 剛好等於內容高度，等於步驟條完全沒有「可以黏」的捲動空間，滾一下就被推走（踩過這個坑）。
  // 改成用 id 直接查 DOM 節點本身，src/app/world/page.tsx 那邊要記得傳 id="world-steps"。
  const [stepsH, setStepsH] = useState(0)
  useEffect(() => {
    const update = () => {
      setStepsH(document.getElementById('world-steps')?.offsetHeight ?? 0)
    }
    update()
    const el = document.getElementById('world-steps')
    const ro = new ResizeObserver(update)
    if (el) ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])
  const navH = isMobile ? 52 : 56
  const stickyTop = navH + stepsH

  // 進場動畫：頁面一載入，畫面先從「稍微縮小＋淡出」的狀態，用一個跟滾動無關的時間軸慢慢定位、淡入，
  // 讓使用者感覺鏡頭正在「靠近、對焦」，而不是一開始就整片全螢幕貼臉、像是滾動已經被拉到一半的錯覺
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 60)
    return () => clearTimeout(t)
  }, [])

  // src 現在直接寫在 JSX 的 <video src={videoSrc}> 上（宣告式），不是等這個 effect 跑完才用
  // JS 指定。這樣瀏覽器解析 HTML 時內建的 preload scanner 一掃到 <video> 標籤就能提早發出
  // 請求，不用等 React hydrate、effect 執行才開始下載——這一步就是「一開始跑不出來」的
  // 主要延遲來源之一。瀏覽器會自己用 HTTP Range Request 邊下載邊播放／跳轉，不用等整支
  // 影片抓完才看得到畫面（Vercel 對 /public 底下的靜態檔案有支援 range request）。
  // 這裡只負責掛 loadedmetadata／error 監聽，以及在「來源真的換了」（例如 /world 頁面
  // 跨斷點切換桌機/手機版素材）時手動呼叫 load() 換片——避免每次 effect 重跑都重新觸發
  // 一次原本已經在下載中的請求。
  useEffect(() => {
    if (reducedMotion) return
    const el = videoRef.current
    if (!el) return
    setVideoOk(false)
    const onLoaded = () => setVideoOk(true)
    const onError = () => setVideoOk(false) // 影片還沒生成好，維持佔位色塊
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('error', onError)
    if (!el.currentSrc.endsWith(videoSrc)) {
      el.load()
    } else if (el.readyState >= 1) {
      setVideoOk(true) // 換源前已經有 metadata（例如 bfcache／瀏覽器快取），不用再等一次事件
    }
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('error', onError)
    }
  }, [reducedMotion, videoSrc])

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
      {/* top 跟高度都要扣掉導覽列 + 報名步驟條的高度（見上面 stepsH 量測），
          這兩個都是 sticky、彼此是手足關係、不是巢狀，如果這裡也用 top-0 + h-screen，
          滾動時這個滿版影片區塊會直接疊到它們底下，那一截影片畫面永久被蓋住，
          捲動總距離的計算也會多算出一截 */}
      <div
        className="sticky w-full overflow-hidden"
        style={{
          top: stickyTop,
          height: `calc(100dvh - ${stickyTop}px)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: '#FDEBD3',
            transform: entered ? 'scale(1)' : 'scale(1.06)',
            opacity: entered ? 1 : 0,
            transition: 'transform 1.15s cubic-bezier(0.16,1,0.3,1), opacity 0.9s ease-out',
          }}
        >
          {/* 手機現在有原生 9:16 直式素材、桌機維持 16:9，兩邊比例都跟螢幕貼近，
              不用再靠模糊背景墊底湊版面，直接 object-cover 滿版顯示即可 */}
          <video
            ref={videoRef}
            src={videoSrc}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: videoOk ? 1 : 0, transition: 'opacity 0.4s' }}
          />
          {!videoOk && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-stone-500 text-sm">〔影片尚未生成：{videoSrc}〕</p>
            </div>
          )}
        </div>

        {/* 文字卡片：試過半透明暖色卡片＋backdrop-blur，但透明底跟下面素樸手繪插畫的紙感不搭，
            會有一點「玻璃感」違和。改回實色白卡（不透明），像一張真的貼在畫面上的紙卡，
            跟插畫本身乾淨、平塗、無漸層的手繪風格更一致。
            手機版影片開頭自己燒了「央北種子計畫」標題卡進去，這張 HTML 疊字先移掉，避免兩層文字疊在一起 */}
        {!isMobile && (
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
        )}

        <div
          className="absolute left-1/2 bottom-6 -translate-x-1/2 flex items-center gap-1.5 bg-white rounded-full px-4 py-2 shadow-[0_4px_14px_rgba(120,80,40,0.16)] transition-opacity duration-300"
          style={{ opacity: hintOpacity }}
        >
          <span className="text-stone-600 text-base font-medium whitespace-nowrap">往下滑，繼續往前走</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/scroll-down-arrow.gif" alt="" aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
        </div>
      </div>
    </div>
  )
}
