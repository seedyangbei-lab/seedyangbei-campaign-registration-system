'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function HeroSection({ settings: s }: { settings: Record<string, string> }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const [lineUser, setLineUser] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    try {
      const stored = localStorage.getItem('line_user')
      if (stored) setLineUser(JSON.parse(stored))
    } catch {}
    const params = new URLSearchParams(window.location.search)
    const lu = params.get('line_user')
    if (lu) {
      try {
        const user = JSON.parse(decodeURIComponent(lu))
        setLineUser(user)
        localStorage.setItem('line_user', JSON.stringify(user))
        window.history.replaceState({}, '', window.location.pathname)
      } catch {}
    }
    return () => window.removeEventListener('resize', check)
  }, [])

  // Ping-pong loop
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let forward = true
    let rafId: number
    const STEP = 1 / 30

    const onEnded = () => {
      forward = false
      video.pause()
      stepBackward()
    }
    const stepBackward = () => {
      if (!video) return
      if (video.currentTime <= 0) {
        forward = true
        video.currentTime = 0
        video.play().catch(() => {})
        return
      }
      video.currentTime = Math.max(0, video.currentTime - STEP)
      rafId = requestAnimationFrame(stepBackward)
    }
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('ended', onEnded)
      cancelAnimationFrame(rafId)
    }
  }, [s.hero_video])

  const hasVideo = !!s.hero_video
  const bgImage = isMobile === null ? null : isMobile ? (s.hero_image_mobile || s.hero_image_desktop) : s.hero_image_desktop
  const cutoutImage = isMobile === null ? null : isMobile ? (s.hero_cutout_mobile || s.hero_cutout_desktop) : s.hero_cutout_desktop

  const handleLogout = () => { localStorage.removeItem('line_user'); setLineUser(null) }

  return (
    <section className="relative w-full overflow-hidden bg-amber-50" style={{ height: '100svh' }}>

      {/* 背景 */}
      {hasVideo ? (
        <video ref={videoRef} key={s.hero_video} autoPlay muted playsInline
          className="absolute inset-0 w-full h-full object-cover object-center">
          <source src={s.hero_video} type="video/mp4" />
        </video>
      ) : (
        <>
          <AnimatedBackground />
          {bgImage && (
            <img
              src={bgImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
               style={{ opacity: parseFloat(s.hero_bg_opacity || '0.18') }}
            />
          )}
        </>
      )}

      {/* 去背人物圖：漂浮，直接壓底，無遮罩 */}
      {cutoutImage && isMobile !== null && (
          <img src={cutoutImage} alt=""
            className="absolute object-contain pointer-events-none hero-cutout-float"
            style={{
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              height: isMobile
                ? (s.site_title ? '60vh' : '78vh')
                : (s.site_title ? '72vh' : '84vh'),
            width: 'auto', maxWidth: '95%',
          }}
        />
      )}

      {/* 右上角個人中心 */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {lineUser && (
          <>
            <Link href="/profile"
              className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-white/60 rounded-full pl-2 pr-4 py-1.5 shadow hover:shadow-md transition-shadow">
              {lineUser.pictureUrl
                ? <img src={lineUser.pictureUrl} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                : <div className="w-7 h-7 rounded-full bg-green-400 flex items-center justify-center"><span className="text-white text-xs font-bold">{lineUser.displayName?.[0]}</span></div>
              }
              <span className="text-stone-700 text-xs font-medium max-w-[80px] truncate">{lineUser.displayName}</span>
            </Link>
            <button onClick={handleLogout} className="bg-white/70 backdrop-blur-sm text-stone-500 text-xs px-3 py-1.5 rounded-full border border-white/60 hover:bg-white/90 transition-colors">登出</button>
          </>
        )}
      </div>

      {/* 主標題：置頂，Bpmf Huninn */}
      {s.site_title && (
      <div className="absolute top-0 left-0 right-0 flex flex-col items-center pt-8 md:pt-10 px-6 text-center z-20 pointer-events-none">
        <h1
          className="text-3xl md:text-5xl font-bold leading-none tracking-tight whitespace-nowrap overflow-hidden"
          style={{
            fontFamily: "'Dela Gothic One', sans-serif",
            color: s.hero_title_color || '#1c1917',
            WebkitTextStroke: s.hero_title_stroke ? `3px ${s.hero_title_stroke}` : undefined,
            textShadow: s.hero_title_stroke ? 'none' : '0 2px 12px rgba(255,255,255,0.9)',
          }}
        >
          {s.site_title}
        </h1>
      </div>
    )}

      {/* 副標題：人物圖與 ClickHint 之間，GenSenRounded */}
      {s.site_subtitle && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center px-6 z-20 pointer-events-none">
          <p
            className="text-sm md:text-base text-stone-700 text-center px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm"
            style={{ textShadow: '0 1px 6px rgba(255,255,255,0.8)' }}
          >
            {s.site_subtitle}
          </p>
        </div>
      )}

      {/* 向下滾動提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
        <p className="text-sm font-medium text-stone-600" style={{ textShadow: '0 1px 4px rgba(255,255,255,0.9)', fontFamily: 'var(--font-body)' }}>往下滑</p>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400"
              style={{ animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .hero-cutout-float {
          animation: heroFloat 4s ease-in-out infinite;
        }
        @keyframes heroFloat {
          0%   { transform: translate(-50%, -50%) translateY(0px); }
          50%  { transform: translate(-50%, -50%) translateY(-14px); }
          100% { transform: translate(-50%, -50%) translateY(0px); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
