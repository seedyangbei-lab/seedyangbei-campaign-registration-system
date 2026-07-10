'use client'

import { useEffect, useState, useRef } from 'react'
import AnimatedBackground from '@/components/AnimatedBackground'

// 這是「底圖」：固定置頂、滾動時一直存在的裝飾背景層，跟下面 HeroBanner（KV 插圖橫幅）是分開的兩塊。
export default function HeroSection({ settings: s }: { settings: Record<string, string> }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
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

  return (
    <section className="fixed inset-0 w-full h-full overflow-hidden bg-amber-50 -z-10">
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
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ opacity: parseFloat(s.hero_bg_opacity || '0.18') }}
            />
          )}
        </>
      )}
    </section>
  )
}
