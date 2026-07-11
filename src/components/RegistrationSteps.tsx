'use client'

import { Fragment, useEffect, useState } from 'react'

const IconLineLogin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
  </svg>
)
const IconSelectCourse = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
)
const IconComplete = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
)

// step 與 step 之間的箭頭：目前流程走到這一段時（active 剛跨過去）會變成主色橘色並跳動一下，
// 其餘時間維持淺灰色，讓整條 STEP 1→2→3 的流程感覺像有東西在往前流動。
const IconArrow = ({ active }: { active: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke={active ? '#f97316' : '#a8a29e'}
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    className={`flex-shrink-0 transition-colors duration-300 ${active ? 'animate-stepPulse' : ''}`}
    aria-hidden="true"
  >
    <path d="M9 6l6 6-6 6" />
  </svg>
)

const STEPS = [
  { label: 'LINE 登入', icon: <IconLineLogin /> },
  { label: '挑選課程', icon: <IconSelectCourse /> },
  { label: '完成報名', icon: <IconComplete /> },
]

export default function RegistrationSteps() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % STEPS.length)
    }, 1200)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="bg-white sticky top-[52px] z-30">
      {/* 手機版：拿掉巢狀 wrapper，3 張卡片＋2 個箭頭都在同一層 flex 子元素，flex-1 才能真正平分寬度，
          左右 padding 才會對稱、不會右邊被壓縮。電腦版維持置中＋固定寬度卡片，視覺不變。 */}
      <div className="flex items-center gap-4 px-4 py-4 md:justify-center max-w-4xl mx-auto">
        {STEPS.map((step, i) => {
          const isActive = i === active
          // 箭頭代表「剛從上一步走到這一步」，所以第 i 個箭頭只在 active 剛好等於 i 時亮起
          const arrowActive = i === active && i > 0
          return (
            <Fragment key={i}>
              {i > 0 && <IconArrow active={arrowActive} />}
              <div
                className={`flex-1 min-w-0 md:flex-none md:w-[235px] flex flex-col gap-1 items-start md:items-center p-3 rounded-xl transition-colors duration-500 ${
                  isActive ? 'bg-orange-50 border border-orange-500' : 'bg-white md:bg-stone-100'
                }`}
              >
                <p className={`text-xs font-bold transition-colors duration-500 ${isActive ? 'text-orange-500' : 'text-stone-500'}`}>
                  STEP {i + 1}
                </p>
                <div className={`flex items-center justify-center gap-1 transition-colors duration-500 ${isActive ? 'text-orange-500' : 'text-stone-800'}`}>
                  {step.icon}
                  <span className="text-xs font-semibold whitespace-nowrap">{step.label}</span>
                </div>
              </div>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
