'use client'

import { useEffect, useState } from 'react'

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
    <section className="bg-white border-b border-orange-500 sticky top-[52px] z-30">
      <div className="flex gap-4 items-stretch px-4 py-4 max-w-4xl mx-auto overflow-x-auto">
        {STEPS.map((step, i) => {
          const isActive = i === active
          return (
            <div
              key={i}
              className={`flex-1 min-w-[108px] flex flex-col gap-1 items-start p-3 rounded-xl transition-colors duration-500 ${
                isActive ? 'bg-orange-50 border border-orange-500' : 'bg-white'
              }`}
            >
              <p className={`text-xs font-bold transition-colors duration-500 ${isActive ? 'text-orange-500' : 'text-stone-500'}`}>
                STEP {i + 1}
              </p>
              <div className={`flex items-center gap-1 transition-colors duration-500 ${isActive ? 'text-orange-500' : 'text-stone-800'}`}>
                {step.icon}
                <span className="text-xs font-semibold whitespace-nowrap">{step.label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
