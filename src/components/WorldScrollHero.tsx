'use client'

import { useEffect, useRef, useState } from 'react'

// 「滾動進入央北社宅」單幕版——一鏡到底：社區大門外觀 → 走進大門 → 穿過建築間走道
// → 抵達入口門 → 開門見光。滾動只驅動這支影片的播放進度（currentTime），不是真的在切頁。
// 影片還沒放進去之前，畫面顯示暖色系佔位色塊，不會整頁壞掉。
// 捲動到底之後，接續 src/app/world/page.tsx 裡下方的課程列表區塊。

const DESKTOP_VIDEO_SRC = '/videos/world/gate-scene-v3.mp4'
const MOBILE_VIDEO_SRC = '/videos/world/gate-scene-mobile.mp4' // 原生 9:16 直式素材，不用再靠模糊背景墊底湊版面
// 影片第一幀的靜態截圖（webp，手機版約 80KB）。影片要先下載一段、解碼完才畫得出第一個畫面，
// 手機網路下這段空窗常常好幾秒，只看得到一片暖色底。改成伺服器吐出的 HTML 裡就直接放這張圖，
// 一打開就有完整畫面，影片真的能畫出畫格之後再無縫疊上去（第一幀跟截圖一模一樣，看不出切換）。
const DESKTOP_POSTER_SRC = '/videos/world/gate-scene-v3-poster.webp'
const MOBILE_POSTER_SRC = '/videos/world/gate-scene-mobile-poster.webp'
// 進場後等影片多久：這段時間內影片能畫出畫格，就維持捲動走進社宅的動態版；
// 超過還沒好（網路太慢、iPhone 低電量模式不預載影片等），就收成一張靜態主視覺，
// 不再保留一大段捲動空間讓人對著不會動的圖一直滑
const STATIC_FALLBACK_MS = 4000
const VH_MULTIPLIER = 2.2 // 這一幕給多少倍視窗高度的捲動空間，越大代表滾動起來越慢、越細緻

export default function WorldScrollHero({ mobileOnly = false }: { mobileOnly?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const viewportHRef = useRef(0) // 只在 mount／resize 時更新，滾動時不重算，避免手機工具列跳動造成抖動
  const [progress, setProgress] = useState(0) // 0~1
  const [videoOk, setVideoOk] = useState(false) // metadata 到了、知道 duration，可以開始依捲動設定 currentTime
  // loading：先顯示截圖等影片；video：影片已能畫出畫格，捲動驅動播放；static：等太久，改成靜態主視覺。
  // 一旦進入 video 或 static 就定案，不再切換，避免頁面高度在使用者捲動途中突然變動
  const [phase, setPhase] = useState<'loading' | 'video' | 'static'>('loading')
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const [videoError, setVideoError] = useState(false) // 真的載入失敗（跟「還在載入中」分開），只有這個才顯示除錯文字
  const [reducedMotion, setReducedMotion] = useState(false)
  // 現在有兩支原生比例都對的素材（桌機 16:9／手機 9:16），不用再靠「模糊背景墊底＋object-contain」
  // 硬湊版面，直接依斷點切換來源、用 object-cover 滿版顯示即可
  // 初值照 mobileOnly 直接定案（不是硬寫 false）：mobileOnly 這條路徑（首頁手機版）從一開始就
  // 確定是手機版，不用等下面的 effect 跑完才翻成 true——否則下面載入影片的 effect 會先抓一次
  // 桌機版影片（isMobile 還是初始的 false），抓到一半才被 effect 重跑打斷、換成手機版重新抓，
  // 等於每次打開都多浪費一次下載，也是「要等好幾秒才出現」的一部分原因。
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
  // mobileOnly 這條路徑從一開始就確定要用哪支影片，不用等斷點判斷，所以直接把 src 寫進
  // 第一次 render 的 JSX（見下方 <video src={initialSrc}>）。這樣瀏覽器在 parse 到伺服器吐出的
  // HTML 當下就會開始下載，不用等 JS 下載、hydrate、effect 跑完才發出請求——這一段等待
  // （尤其手機網路）正是「要等好幾秒才出現」的主因之一。/world 全頁版本斷點不確定，
  // 維持原本等 effect 判斷完斷點才載入，避免先抓錯尺寸浪費頻寬。
  const initialSrc = mobileOnly ? MOBILE_VIDEO_SRC : undefined
  const requestedSrcRef = useRef<string | null>(mobileOnly ? MOBILE_VIDEO_SRC : null)

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

  // 等太久就改靜態：順便把影片的下載停掉，頻寬讓給下面的課程卡片
  useEffect(() => {
    if (reducedMotion) return
    const t = setTimeout(() => {
      if (phaseRef.current !== 'loading') return
      setPhase('static')
      const el = videoRef.current
      if (el) { el.removeAttribute('src'); el.load() }
    }, STATIC_FALLBACK_MS)
    return () => clearTimeout(t)
  }, [reducedMotion])

  // 直接把網址設成 <video src>，讓瀏覽器自己用 HTTP Range Request 邊下載邊播放／跳轉，
  // 不用等整支影片抓完才看得到畫面。Vercel 對 /public 底下的靜態檔案有支援 range request，
  // 之前「靜態主機常常不支援 range request，導致卡在第 0 幀」的疑慮在這裡不成立，
  // 改回瀏覽器原生載入方式，時間到影片點（time to first frame）會明顯變快。
  useEffect(() => {
    if (reducedMotion) return
    const el = videoRef.current
    if (!el) return
    const onPainted = () => {
      if (phaseRef.current === 'loading') setPhase('video')
    }
    const onLoaded = () => {
      setVideoOk(true)
      // iOS Safari 對「從沒播放過」的影片，常常只抓 metadata、不解碼畫格，之後設定 currentTime
      // 也不會更新畫面（上一版就是卡在這：截圖一直蓋著，往下滑影片完全不動）。
      // 靜音＋playsInline 的影片允許自動播放，這裡先 play() 一下馬上 pause()，逼它真的開始解碼；
      // 低電量模式下 play() 會被拒絕，那就等上面的逾時改成靜態版。
      const p = el.play()
      if (p) p.then(() => { el.pause(); onPainted() }).catch(() => {})
    }
    const onError = () => {
      // 逾時改靜態時是我們自己把 src 拿掉的，那不算載入失敗
      if (phaseRef.current === 'static') return
      setVideoError(true)
      setPhase(prev => (prev === 'loading' ? 'static' : prev))
    }
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('loadeddata', onPainted)
    el.addEventListener('seeked', onPainted)
    el.addEventListener('playing', onPainted)
    el.addEventListener('error', onError)
    // 只有目標影片真的換了（例如斷點切換、或還沒透過 initialSrc 先載過）才重新指定 src + load()。
    // 重複指定同一個 src 會打斷瀏覽器正在進行中的下載，從頭重新起跑一次連線，白白浪費已經
    // 下載到一半的進度——mobileOnly 情境下 src 已經在 initialSrc 先寫進 HTML 了，這裡要避開。
    if (requestedSrcRef.current !== videoSrc) {
      requestedSrcRef.current = videoSrc
      setVideoOk(false)
      setVideoError(false)
      el.src = videoSrc
      el.load()
    } else if (el.readyState >= 1) {
      onLoaded()
      if (el.readyState >= 2) onPainted()
    }
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('loadeddata', onPainted)
      el.removeEventListener('seeked', onPainted)
      el.removeEventListener('playing', onPainted)
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
    if (!v || !videoOk || !v.duration || phase === 'static') return
    if (!v.paused) v.pause()
    v.currentTime = Math.min(progress * v.duration, v.duration - 0.05)
  }, [progress, videoOk, reducedMotion, phase])

  const settled = phase !== 'loading' // 進場動畫是否已經「對焦」完成
  const isStatic = phase === 'static'

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
  const hintOpacity = !isStatic && progress < 0.9 ? 1 : 0

  return (
    // 靜態版不需要捲動驅動，高度收成剛好一個畫面，往下滑直接接課程列表
    <div
      ref={containerRef}
      style={{ height: isStatic ? `calc(100dvh - ${stickyTop}px)` : `${VH_MULTIPLIER * 100}dvh` }}
      className="relative bg-stone-900"
    >
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
            // 進場動畫：截圖一開始就看得到，但先停在「稍微放大、略淡、有點失焦」的狀態，
            // 等影片準備好（或逾時改靜態）那一刻，才用一個跟滾動無關的時間軸慢慢拉近、對焦、淡入，
            // 讓人感覺鏡頭正在靠近社宅、準備走進去
            transform: settled ? 'scale(1)' : 'scale(1.08)',
            opacity: settled ? 1 : 0.55,
            filter: settled ? 'blur(0px)' : 'blur(3px)',
            transition: 'transform 1.3s cubic-bezier(0.16,1,0.3,1), opacity 0.9s ease-out, filter 0.9s ease-out',
          }}
        >
          {/* 第一幀截圖：mobileOnly 確定是手機版；/world 全頁版用 <picture> 依螢幕寬度挑，
              不用等 JS 判斷斷點，伺服器 HTML 一到瀏覽器就開始抓對的那張 */}
          {/* 影片放在截圖下面、本身永遠不透明：iOS Safari 對 opacity 0 的影片可能不解碼畫格，
              所以改成由上面的截圖淡出來「露出」影片 */}
          <video
            ref={videoRef}
            src={initialSrc}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <picture
            className="absolute inset-0"
            style={{ opacity: phase === 'video' ? 0 : 1, transition: 'opacity 0.3s', pointerEvents: 'none' }}
          >
            {!mobileOnly && <source media="(max-width: 767px)" srcSet={MOBILE_POSTER_SRC} />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mobileOnly ? MOBILE_POSTER_SRC : DESKTOP_POSTER_SRC}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
          {/* 影片載入中：不顯示任何文字，後面暖色佔位色塊就夠了，淡入過程才不會先閃一段除錯字樣。
              只有真的載入失敗（例如檔案不存在）才提示，方便之後除錯用 */}
          {videoError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-stone-500 text-sm">〔影片載入失敗：{videoSrc}〕</p>
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
