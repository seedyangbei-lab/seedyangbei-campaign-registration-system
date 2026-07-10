'use client'

import { useEffect, useState } from 'react'

const STEPS = ['用 LINE 帳號登入', '勾選想參加的課程', '確認資料送出完成']

export default function RegistrationSteps() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % STEPS.length)
    }, 2600)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="bg-orange-50 border-b border-orange-100 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-6 py-3.5">
        <div className="flex flex-wrap gap-3 md:gap-8 items-center text-sm text-stone-600">
          <p className="text-sm font-bold text-stone-700 hidden md:block">如何報名？</p>
          {STEPS.map((step, i) => {
            const isActive = i === active
            return (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 transition-colors duration-500 ${
                    isActive ? 'bg-orange-600 animate-stepPulse' : 'bg-orange-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`text-xs md:text-sm transition-colors duration-500 ${isActive ? 'text-orange-700 font-semibold' : ''}`}>
                  {step}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
