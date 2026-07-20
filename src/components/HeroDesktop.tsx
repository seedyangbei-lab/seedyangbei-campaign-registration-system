'use client'

// 桌機版 Hero：左文右圖不對稱佈局（對照 Figma node 586:12176）。
// 跟手機版的 HeroSection（固定底圖）+ HeroBanner（置中疊字 KV）完全是兩套獨立元件，
// 只在 md 以上斷點顯示，彼此互不影響，也不共用邏輯。
export default function HeroDesktop({ settings: s }: { settings: Record<string, string> }) {
  const badgeText = s.hero_badge_text || '央北社宅專屬活動報名系統'
  const ctaText = s.hero_cta_text || '立即探索課程'
  const bgOpacity = parseFloat(s.hero_bg_opacity || '0.8')
  const videoActive = s.hero_video_enabled === 'true' && !!s.hero_video
  const personImage = s.hero_cutout_desktop || '/illustrations/hero-banner-default.png'

  return (
    <section className="hidden md:block w-full bg-[#fff7ed]">
      <div className="max-w-[1512px] mx-auto grid grid-cols-[640px_1fr]">
        {/* Left-Content (586:12177) */}
        <div className="flex flex-col justify-center gap-6 px-20 py-20 min-h-[820px]">
          {/* Badge (589:11750) variant: color=brand, style=subtle */}
          <span className="inline-flex w-fit items-center rounded-full bg-orange-50 border border-orange-100 text-orange-600 text-xs font-medium tracking-wide px-3.5 py-1.5" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
            {badgeText}
          </span>

          {/* Title-Group (586:12180) */}
          <div className="flex flex-col gap-2">
            <h1
              className="text-[40px] leading-tight text-stone-800"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900 }}
            >
              {s.site_title || '央北種子計畫'}
            </h1>
            <p
              className="text-xl text-stone-700"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 700 }}
            >
              {s.site_subtitle || '社區溫馨課程與多元活動報名'}
            </p>
          </div>

          {/* 說明文字 (586:12183) */}
          {s.site_description && (
            <p
              className="text-base leading-relaxed text-stone-500 whitespace-pre-line"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 400 }}
            >
              {s.site_description}
            </p>
          )}

          {/* Button (589:11752) variant: type=primary, size=lg；箭頭前端寫死 */}
          <a
            href="#courses"
            className="inline-flex w-fit items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl px-7 py-4 text-base font-medium transition-colors shadow-[0px_4px_12px_rgba(249,115,22,0.25)]"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            {ctaText} <span aria-hidden="true">↓</span>
          </a>
        </div>

        {/* Right-Visual (586:12189)：clipsContent 開啟 */}
        <div className="relative overflow-hidden min-h-[820px]">
          {videoActive ? (
            <video key={s.hero_video} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src={s.hero_video} type="video/mp4" />
            </video>
          ) : (
            <div className="absolute inset-0">
              {/* 裝飾物圖層（最底） */}
              {s.hero_decoration_desktop && (
                <img
                  src={s.hero_decoration_desktop}
                  alt=""
                  className="absolute object-contain"
                  style={{ left: '2.5%', top: '27.3%', width: '97.5%', height: '51.3%' }}
                />
              )}
              {/* 建築物底圖圖層 */}
              {s.hero_image_desktop && (
                <img
                  src={s.hero_image_desktop}
                  alt=""
                  fetchPriority="high"
                  className="absolute object-contain"
                  style={{ left: '8.3%', top: '30.2%', width: '86%', height: '45.4%', opacity: bgOpacity }}
                />
              )}
              {/* 人物圖層（帶漂浮感陰影） */}
              <img
                src={personImage}
                alt=""
                fetchPriority="high"
                className="absolute object-contain hero-desktop-float"
                style={{
                  left: '17.1%', top: '39.1%', width: '68.3%', height: '36%',
                  filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))',
                }}
              />
              {/* 暈影遮罩：radial-gradient 偽元素，前端寫死，柔化插圖邊緣融入頁面背景 */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '50%', top: '62%', width: '561px', height: '592px', transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(254,215,170,1) 0%, rgba(254,215,170,0) 55%, rgba(254,215,170,0.15) 78%, rgba(254,215,170,0.45) 92%, rgba(254,215,170,0.7) 100%)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .hero-desktop-float {
          animation: heroDesktopFloat 4s ease-in-out infinite;
        }
        @keyframes heroDesktopFloat {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </section>
  )
}
