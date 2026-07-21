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
      <div className="max-w-[1512px] mx-auto grid grid-cols-[minmax(320px,640px)_minmax(340px,1fr)] items-center">
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

          {/* Button (589:11752) variant: type=primary, size=lg；箭頭前端寫死。
              旁邊加「加入社群」次要按鈕（原本在課程列表上方，手機版還留在那邊，
              桌機版搬來這裡跟主要 CTA 並排，次要視覺份量用 LINE 綠但外框樣式呈現） */}
          <div className="flex items-center gap-3">
            <a
              href="#courses"
              className="inline-flex w-fit items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-[10px] px-4 py-2 text-base font-medium transition-colors"
              style={{ fontFamily: "'Noto Sans TC', sans-serif" }}
            >
              {ctaText} <span aria-hidden="true">↓</span>
            </a>
            {s.line_community_url && (
              <a
                href={s.line_community_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-[10px] px-4 py-2 text-base font-medium border transition-colors hover:bg-[#06C755]/10"
                style={{ fontFamily: "'Noto Sans TC', sans-serif", borderColor: '#06C755', color: '#06C755' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#06C755">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                加入央北社區大學社群
              </a>
            )}
          </div>
        </div>

        {/* Right-Visual (586:12189)：clipsContent 開啟，滑鼠移入時多圖層視差。
            用 aspect-ratio 鎖住設計比例（872:820），內部圖層全部改用百分比尺寸置中錨定——
            RWD 縮窄時整組插畫跟著容器寬度等比縮小，不裁切、不變形；真正需要「換行喘息」
            的是左欄文字（左欄改成彈性寬度，見上面 grid-cols），不是靠裁掉圖片來擠空間。 */}
        <div
          ref={visualRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative overflow-hidden w-full"
          style={{ aspectRatio: '872 / 820', minHeight: '360px' }}
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
                      maskImage: 'radial-gradient(ellipse farthest-corner at center, black 82%, transparent 100%), linear-gradient(to bottom, black 97%, transparent 100%)',
                      maskComposite: 'intersect',
                      WebkitMaskImage: 'radial-gradient(ellipse farthest-corner at center, black 82%, transparent 100%), linear-gradient(to bottom, black 97%, transparent 100%)',
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
              {/* 人物圖層：最前景，滑鼠位移幅度最大，另外疊加獨立的漂浮動畫（互不干擾）。
                  陰影（drop-shadow）放在外層 wrapper div、不跟 mask 放在同一個元素上，避免陰影溢出
                  範圍被 mask 一併裁掉造成硬邊。 */}
              <div
                className="absolute"
                style={{
                  left: '52%', top: '52%', width: '68.3%', height: '43.2%',
                  transform: `translate(calc(-50% + ${tilt.x * 18}px), calc(-50% + ${tilt.y * 18}px))`,
                  transition: 'transform 0.25s ease-out',
                  filter: 'drop-shadow(0px 8px 24px rgba(0,0,0,0.12))',
                }}
              >
                <img
                  src={personImage}
                  alt=""
                  fetchPriority="high"
                  className="w-full h-full object-contain hero-desktop-float"
                  style={{
                    maskImage: 'radial-gradient(ellipse farthest-corner at center, black 85%, transparent 100%), linear-gradient(to bottom, black 97.5%, transparent 100%)',
                    maskComposite: 'intersect',
                    WebkitMaskImage: 'radial-gradient(ellipse farthest-corner at center, black 85%, transparent 100%), linear-gradient(to bottom, black 97.5%, transparent 100%)',
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
