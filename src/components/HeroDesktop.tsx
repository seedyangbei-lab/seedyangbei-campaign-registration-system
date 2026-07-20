'use client'

import { useRef, useState, type MouseEvent } from 'react'

// 桌機版 Hero：左文右圖不對稱佈局（對照 Figma node 209:8525 / 586:12176）。
// 跟手機版的 HeroSection（固定底圖）+ HeroBanner（置中疊字 KV）完全是兩套獨立元件，
// 只在 md 以上斷點顯示，彼此互不影響，也不共用邏輯。
export default function HeroDesktop({ settings: s }: { settings: Record<string, string> }) {
  const badgeText = s.hero_badge_text || '央北社宅專屬學習平台'
  const ctaText = s.hero_cta_text || '立即探索課程'
  const videoActive = s.hero_video_enabled === 'true' && !!s.hero_video
  const personImage = s.hero_cutout_desktop || '/illustrations/hero-banner-default.png'

  // 滑鼠移入視差效果：像 Figma 常見的「多圖層 3D 深度感」，游標移動時每層依照景深錯開位移，
  // 建築物底圖（最遠）位移最小、裝飾物（中景）次之、人物（最前景）位移最大。
  const visualRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = visualRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width - 0.5 // -0.5 ~ 0.5
    const relY = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: relX * 2, y: relY * 2 }) // -1 ~ 1
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

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

        {/* Right-Visual (586:12189)：clipsContent 開啟，滑鼠移入時多圖層視差 */}
        <div
          ref={visualRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative overflow-hidden w-full"
          style={{ aspectRatio: '872 / 820', minHeight: '480px' }}
        >
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
                  left: '50%', top: '52%', width: '87%', height: '93%', transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(circle, rgba(254,215,170,0.55) 0%, rgba(254,215,170,0.25) 45%, rgba(254,215,170,0) 78%)',
                }}
              />
              {/* 建築物底圖圖層：景深最遠，滑鼠位移幅度最小 */}
              {s.hero_image_desktop && (
                <div
                  className="absolute"
                  style={{
                    left: '52%', top: '52%', width: '86%', height: '54.4%',
                    transform: `translate(calc(-50% + ${tilt.x * 6}px), calc(-50% + ${tilt.y * 6}px))`,
                    transition: 'transform 0.25s ease-out',
                  }}
                >
                  <img
                    src={s.hero_image_desktop}
                    alt=""
                    fetchPriority="high"
                    className="w-full h-full object-cover"
                    style={{
                      maskImage: 'radial-gradient(ellipse farthest-corner at center, black 82%, transparent 100%), linear-gradient(to bottom, black 85%, transparent 100%)',
                      maskComposite: 'intersect',
                      WebkitMaskImage: 'radial-gradient(ellipse farthest-corner at center, black 82%, transparent 100%), linear-gradient(to bottom, black 85%, transparent 100%)',
                      WebkitMaskComposite: 'source-in',
                    }}
                  />
                </div>
              )}
              {/* 裝飾物圖層（散落的星星/太陽等小插畫），景深居中 */}
              {s.hero_decoration_desktop && (
                <div
                  className="absolute"
                  style={{
                    left: '52%', top: '52%', width: '97.5%', height: '61.5%',
                    transform: `translate(calc(-50% + ${tilt.x * 10}px), calc(-50% + ${tilt.y * 10}px))`,
                    transition: 'transform 0.25s ease-out',
                  }}
                >
                  <img src={s.hero_decoration_desktop} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              {/* 人物圖層：最前景，滑鼠位移幅度最大，另外疊加獨立的漂浮動畫（互不干擾） */}
              <div
                className="absolute"
                style={{
                  left: '52%', top: '52%', width: '68.3%', height: '43.2%',
                  transform: `translate(calc(-50% + ${tilt.x * 18}px), calc(-50% + ${tilt.y * 18}px))`,
                  transition: 'transform 0.25s ease-out',
                }}
              >
                <img
                  src={personImage}
                  alt=""
                  fetchPriority="high"
                  className="w-full h-full object-cover hero-desktop-float"
                  style={{
                    filter: 'drop-shadow(0px 8px 24px rgba(0,0,0,0.12))',
                    maskImage: 'radial-gradient(ellipse farthest-corner at center, black 85%, transparent 100%), linear-gradient(to bottom, black 88%, transparent 100%)',
                    maskComposite: 'intersect',
                    WebkitMaskImage: 'radial-gradient(ellipse farthest-corner at center, black 85%, transparent 100%), linear-gradient(to bottom, black 88%, transparent 100%)',
                    WebkitMaskComposite: 'source-in',
                  }}
                />
              </div>
            </>
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
