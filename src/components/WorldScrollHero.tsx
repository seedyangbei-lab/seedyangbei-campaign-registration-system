'use client'

import { useEffect, useRef, useState } from 'react'

// 「滾動進入央北社宅」試看頁——攝影機用一鏡到底的方式往前飛（大門→大廳→電梯→種子小客廳門口→教室），
// 滾動只驅動影片播放進度（currentTime），不是真的在切換頁面。這是「試看版」，不會動到現正上線的首頁，
// 只有直接打開 /world 這個網址才看得到。
//
// 使用方式：五段影片依序放進 public/videos/world/scene-1.mp4 ~ scene-5.mp4（16:9，建議 5-8 秒/段）。
// 影片還沒放進去之前，畫面會顯示暖色系佔位色塊 + 文案，方便先確認排版跟文字時機，不會整頁壞掉。

type Section = {
  id: string
  video: string
  eyebrow: string
  title: string
  body: string
  cta?: { text: string; href: string }
  bg: string // 影片還沒生成好之前的佔位底色
}

const SECTIONS: Section[] = [
  { id: 'gate', video: '/videos/world/scene-1.mp4', bg: '#FDEBD3',
    eyebrow: '歡迎回家', title: '走進央北社宅', body: '從社區大門開始，帶你看看這裡的生活' },
  { id: 'lobby', video: '/videos/world/scene-2.mp4', bg: '#FDE7C8',
    eyebrow: '日常風景', title: '溫暖的大廳', body: '櫃檯永遠有人在，鄰居們進進出出打招呼' },
  { id: 'elevator', video: '/videos/world/scene-3.mp4', bg: '#F9DFC0',
    eyebrow: '往上一層', title: '電梯門一開', body: '每一層都是不同鄰居的故事' },
  { id: 'door', video: '/videos/world/scene-4.mp4', bg: '#F6D8BC',
    eyebrow: '找到了', title: '央北種子小客廳', body: '推開這扇門，活動就要開始了' },
  { id: 'classroom', video: '/videos/world/scene-5.mp4', bg: '#F3D2B8',
    eyebrow: '開始參加', title: '一起上課、一起生活', body: '看看這個月有什麼好玩的活動',
    cta: { text: '開始報名課程', href: '/#courses' } },
]

const VH_PER_SECTION = 1.4 // 每段給多少倍視窗高度的捲動空間，越大代表這段停留越久

export default function WorldScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [progress, setProgress] = useState(0) // 0 ~ SECTIONS.length 的連續進度
  const [videoOk, setVideoOk] = useState<boolean[]>(() => SECTIONS.map(() => false))
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 用 blob 載入每段影片，確保 seek 一定準（靜態主機常常不支援 range request，導致卡在第 0 幀）
  useEffect(() => {
    if (reducedMotion) return
    let cancelled = false
    SECTIONS.forEach((s, i) => {
      fetch(s.video)
        .then(r => { if (!r.ok) throw new Error('no video yet'); return r.blob() })
        .then(blob => {
          if (cancelled) return
          const url = URL.createObjectURL(blob)
          const el = videoRefs.current[i]
          if (el) {
            el.src = url
            el.addEventListener('loadedmetadata', () => {
              setVideoOk(prev => { const next = [...prev]; next[i] = true; return next })
            }, { once: true })
          }
        })
        .catch(() => { /* 影片還沒生成好，維持佔位色塊 */ })
    })
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
      const p = total > 0 ? (scrolled / total) * SECTIONS.length : 0
      setProgress(p)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const idx = Math.min(Math.floor(progress), SECTIONS.length - 1)
    const local = progress - idx
    videoRefs.current.forEach((v, i) => {
      if (!v || !videoOk[i]) return
      if (i === idx && v.duration) {
        v.currentTime = Math.min(local * v.duration, v.duration - 0.05)
      }
    })
  }, [progress, videoOk, reducedMotion])

  if (reducedMotion) {
    // 尊重「減少動態效果」：直接用一般卷軸呈現靜態內容，不放影片
    return (
      <div className="bg-white">
        {SECTIONS.map(s => (
          <section key={s.id} className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6" style={{ background: s.bg }}>
            <p className="text-orange-600 text-sm font-medium mb-2">{s.eyebrow}</p>
            <h2 className="text-3xl font-bold text-stone-800 mb-3">{s.title}</h2>
            <p className="text-stone-600 mb-4">{s.body}</p>
            {s.cta && (
              <a href={s.cta.href} className="inline-flex bg-orange-500 hover:bg-orange-600 text-white rounded-[10px] px-5 py-2.5 font-medium transition-colors">
                {s.cta.text}
              </a>
            )}
          </section>
        ))}
      </div>
    )
  }

  const activeIdx = Math.min(Math.floor(progress), SECTIONS.length - 1)
  const localT = progress - activeIdx

  return (
    <div ref={containerRef} style={{ height: `${SECTIONS.length * VH_PER_SECTION * 100}vh` }} className="relative bg-stone-900">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {SECTIONS.map((s, i) => {
          const isActive = i === activeIdx
          return (
            <div key={s.id} className="absolute inset-0 transition-opacity duration-300" style={{ opacity: isActive ? 1 : 0, background: s.bg }}>
              <video
                ref={el => { videoRefs.current[i] = el }}
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: videoOk[i] ? 1 : 0, transition: 'opacity 0.4s' }}
              />
              {!videoOk[i] && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-stone-500 text-sm">〔影片尚未生成：{s.video}〕</p>
                </div>
              )}
              {/* 疊字文案：跟著這一段畫面顯示，中間淡入淡出 */}
              <div
                className="absolute left-0 right-0 bottom-[12%] px-10 md:px-20 transition-opacity duration-300"
                style={{ opacity: isActive ? Math.min(1, 1 - Math.abs(localT - 0.5) * 1.3) : 0 }}
              >
                <p className="text-orange-300 text-sm font-medium tracking-widest mb-2">{s.eyebrow}</p>
                <h2 className="text-white text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg">{s.title}</h2>
                <p className="text-white/90 text-lg mb-5 drop-shadow">{s.body}</p>
                {s.cta && (
                  <a href={s.cta.href} className="inline-flex bg-orange-500 hover:bg-orange-600 text-white rounded-[10px] px-5 py-2.5 font-medium transition-colors">
                    {s.cta.text} <span className="ml-1.5" aria-hidden="true">↓</span>
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {/* 路線指示點，右側小圓點顯示目前在哪一段 */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
          {SECTIONS.map((s, i) => (
            <div key={s.id} className="w-2 h-2 rounded-full transition-all" style={{ background: i === activeIdx ? '#f97316' : 'rgba(255,255,255,0.4)', transform: i === activeIdx ? 'scale(1.5)' : 'scale(1)' }} />
          ))}
        </div>

        <p className="absolute left-6 bottom-6 text-white/50 text-xs">往下滑，繼續往前走</p>
      </div>
    </div>
  )
}
