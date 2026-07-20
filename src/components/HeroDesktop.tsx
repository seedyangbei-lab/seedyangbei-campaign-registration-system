'use client'

// 桌機版 Hero：左文右圖不對稱佈局（對照 Figma node 209:8525 / 586:12176）。
// 跟手機版的 HeroSection（固定底圖）+ HeroBanner（置中疊字 KV）完全是兩套獨立元件，
// 只在 md 以上斷點顯示，彼此互不影響，也不共用邏輯。
export default function HeroDesktop({ settings: s }: { settings: Record<string, string> }) {
  const badgeText = s.hero_badge_text || '央北社宅專屬學習平台'
  const ctaText = s.hero_cta_text || '立即探索課程'
  const bgOpacity = parseFloat(s.hero_bg_opacity || '0.80')
  const videoActive = s.hero_video_enabled === 'true' && !!s.hero_video
  const personImage = s.hero_cutout_desktop || '/illustrations/hero-banner-default.png'

  return (
    <section className="hidden md:block w-full bg-white">
      <div className="max-w-[1512px] mx-auto grid grid-cols-[640px_1fr] items-center">
        {/* Left-Content (586:12177) */}
        <div className="flex flex-col justify-center gap-6 px-20 py-20 min-h-[820px]">
          {/* Badge (589:11750) variant: color=brand, style=subtle */}
          <span className="inline-flex w-fit items-center rounded-md bg-orange-50 text-orange-600 text-xs font-medium px-2 py-2" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
            {badgeText}
          </span>

          {/* Title-Group (586:12180) */}
          <div className="flex flex-col gap-3">
            <h1
              className="text-[40px] leading-[52px] text-stone-800"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900 }}
            >
              {s.site_title || '央北種子計畫'}
            </h1>
            <p
              className="text-xl leading-[30px] text-orange-600"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 700 }}
            >
              {s.site_subtitle || '社區溫馨課程與多元活動報名'}
            </p>
          </div>

          {/* 說明文字 (586:12183) */}
          {s.site_description && (
            <p
              className="text-base leading-[26px] text-stone-600 whitespace-pre-line"
              style={{ fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 400 }}
            >
              {s.site_description}
            </p>
          )}

          {/* Button (589:11752) variant: type=primary, size=lg；箭頭前端寫死 */}
          <a
            href="#courses"
            className="inline-flex w-fit items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[10px] px-4 py-2 text-base font-medium transition-colors"
            style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
          >
            {ctaText} <span aria-hidden="true">↓</span>
          </a>
        </div>

        {/* Right-Visual (586:12189)：clipsContent 開啟 */}
        <div className="relative overflow-hidden min-h-[820px] h-full">
          {videoActive ? (
            <video key={s.hero_video} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover">
              <source src={s.hero_video} type="video/mp4" />
            </video>
          ) : (
            <>
              {/* 暈影遮罩：由中心不透明單調淡出到完全透明，不在邊界再度變深，避免出現生硬的方框感 */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: '50%', top: '52%', width: '760px', height: '760px', transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(254,215,170,0.55) 0%, rgba(254,215,170,0.25) 45%, rgba(254,215,170,0) 78%)',
                }}
              />
              {/* 建築物底圖圖層 */}
              {s.hero_image_desktop && (
                <img
                  src={s.hero_image_desktop}
                  alt=""
                  fetchPriority="high"
                  className="absolute object-cover"
                  style={{
                    left: '52%', top: '52%', width: '750px', height: '446px',
                    transform: 'translate(-50%, -50%)', opacity: bgOpacity,
                    maskImage: 'radial-gradient(ellipse farthest-side at center, black 62%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(ellipse farthest-side at center, black 62%, transparent 100%)',
                  }}
                />
              )}
              {/* 裝飾物圖層（散落的星星/太陽等小插畫，中心透明不會擋住建築物） */}
              {s.hero_decoration_desktop && (
                <img
                  src={s.hero_decoration_desktop}
                  alt=""
                  className="absolute object-contain"
                  style={{
                    left: '52%', top: '52%', width: '850px', height: '504px',
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
              {/* 人物圖層（最上層，帶漂浮感陰影） */}
              <img
                src={personImage}
                alt=""
                fetchPriority="high"
                className="absolute object-cover hero-desktop-float"
                style={{
                  left: '52%', top: '52%', width: '596px', height: '354px',
                  transform: 'translate(-50%, -50%)',
                  filter: 'drop-shadow(0px 8px 24px rgba(0,0,0,0.12))',
                  maskImage: 'radial-gradient(ellipse farthest-side at center, black 68%, transparent 100%)',
                  WebkitMaskImage: 'radial-gradient(ellipse farthest-side at center, black 68%, transparent 100%)',
                }}
              />
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .hero-desktop-float {
          animation: heroDesktopFloat 4s ease-in-out infinite;
        }
        @keyframes heroDesktopFloat {
          0%   { transform: translate(-50%, -50%) translateY(0px); }
          50%  { transform: translate(-50%, -50%) translateY(-10px); }
          100% { transform: translate(-50%, -50%) translateY(0px); }
        }
      `}</style>
    </section>
  )
}
