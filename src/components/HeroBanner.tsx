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

  const cutoutImage = isMobile === null ? null : isMobile ? (s.hero_cutout_mobile || s.hero_cutout_desktop) : s.hero_cutout_desktop

  if (!cutoutImage && !s.site_title && !s.site_subtitle) return null

  return (
    <section className="relative w-full overflow-hidden bg-amber-50/40" style={{ height: 'clamp(180px, 30vh, 280px)' }}>
      {cutoutImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none hero-banner-float">
          <img src={cutoutImage} alt=""
            fetchPriority="high"
            decoding="async"
            className="object-contain"
            style={{
              height: '100%',
              width: 'auto',
              maxWidth: '92vw',
            }}
          />
        </div>
      )}

      {s.site_title && (
        <div className="absolute top-2 left-0 right-0 flex flex-col items-center px-6 text-center z-20 pointer-events-none">
          <h1
            className="text-xl md:text-3xl font-bold leading-none tracking-tight whitespace-nowrap overflow-hidden"
            style={{
              fontFamily: "'Dela Gothic One', sans-serif",
              color: s.hero_title_color || '#1c1917',
              WebkitTextStroke: s.hero_title_stroke ? `2px ${s.hero_title_stroke}` : undefined,
              textShadow: s.hero_title_stroke ? 'none' : '0 2px 10px rgba(255,255,255,0.9)',
            }}
          >
            {s.site_title}
          </h1>
        </div>
      )}

      {s.site_subtitle && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center px-6 z-20 pointer-events-none">
          <p
            className="text-xs md:text-sm text-stone-700 text-center px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm"
            style={{ textShadow: '0 1px 6px rgba(255,255,255,0.8)' }}
          >
            {s.site_subtitle}
          </p>
        </div>
      )}

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
