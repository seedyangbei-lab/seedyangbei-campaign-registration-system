'use client'

import { useEffect, useState } from 'react'

// 這是「Hero Banner」：KV 插圖橫幅，跟在 Navbar 後面正常捲動的一小塊區域，
// 跟 HeroSection（固定置頂的底圖）是分開的兩塊元件。矮版設計，不佔滿整個螢幕高度。
export default function HeroBanner({ settings: s }: { settings: Record<string, string> }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const cutoutImage = isMobile === null ? null : (isMobile ? (s.hero_cutout_mobile || s.hero_cutout_desktop) : s.hero_cutout_desktop) || '/illustrations/hero-banner-default.png'

  return (
    <section className="relative w-full overflow-hidden bg-amber-50/40" style={{ aspectRatio: '16 / 9' }}>
      {cutoutImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none hero-banner-float">
          <img src={cutoutImage} alt=""
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* 手機版 Hero 只留 KV 插圖本身，不再疊主標／副標文字——
          banner 圖片已經佔滿版面，疊字反而顯得擁擠（活動介紹說明、活動標籤本來就只有桌機版會顯示，這裡不用另外處理）*/}

      <style jsx>{`
        .hero-banner-float {
          animation: heroBannerFloat 4s ease-in-out infinite;
        }
        @keyframes heroBannerFloat {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </section>
  )
}
