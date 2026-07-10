'use client'

import { useEffect, useState } from 'react'

interface Course {
  title: string
  date: string
  time_start: string
  location: string
}

function IconMorning() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="#fed7aa"/>
      <path d="M12 3v2.5M12 18.5V21M4.22 4.22l1.77 1.77M18 18l1.78 1.78M3 12h2.5M18.5 12H21M4.22 19.78L6 18M18 6l1.78-1.78"/>
    </svg>
  )
}
function IconNoon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9h12v4a6 6 0 0 1-12 0V9z" fill="#fed7aa"/>
      <path d="M18 10h1.5a2 2 0 0 1 0 4H18M4 21h16"/>
    </svg>
  )
}
function IconEvening() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 1 0 0 12 6 6 0 0 0 6-6c0 3.87-3.13 7-7 7a7 7 0 1 1 1-13.93z" fill="#fed7aa"/>
      <path d="M2 21h20"/>
    </svg>
  )
}
function IconMidnight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#e7e5e4"/>
      <path d="M16 3l1 1.5L18.5 5 17 6l-1 1.5L15 6l-1.5-1L15 3.5 16 3z"/>
    </svg>
  )
}

type Period = 'morning' | 'noon' | 'evening' | 'midnight'

function getPeriod(hour: number): Period {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'noon'
  if (hour >= 17 && hour < 24) return 'evening'
  return 'midnight'
}

function formatDateLabel(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  return `${target.getMonth() + 1}/${target.getDate()}`
}

const PERIOD_CONFIG: Record<Period, { icon: () => React.ReactElement; greeting: (dateLabel: string, time: string) => string }> = {
  morning: { icon: IconMorning, greeting: (d, t) => `早安！${d} ${t} 有一堂` },
  noon: { icon: IconNoon, greeting: (d, t) => `午安！${d} ${t} 有一堂` },
  evening: { icon: IconEvening, greeting: (d, t) => `晚安！吃飽了嗎？${d} ${t} 有一堂` },
  midnight: { icon: IconMidnight, greeting: (d, t) => `怎麼還不睡，${d} ${t} 有一堂` },
}

export default function GreetingBar({ course }: { course: Course | null }) {
  const [period, setPeriod] = useState<Period>('morning')

  useEffect(() => {
    const update = () => setPeriod(getPeriod(new Date().getHours()))
    update()
    const timer = setInterval(update, 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  if (!course) return null

  const { icon: Icon, greeting } = PERIOD_CONFIG[period]
  const dateLabel = formatDateLabel(course.date)
  const timeLabel = course.time_start?.slice(0, 5)
  const prefix = greeting(dateLabel, timeLabel)
  const suffix = `課程在${course.location}，你報名了嗎？`

  const scrollToCourses = () => {
    document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div
      onClick={scrollToCourses}
      className="border-t border-b border-orange-200 flex gap-2 items-center overflow-hidden px-4 py-2.5 relative w-full bg-gradient-to-r from-orange-50/40 to-orange-50/40 cursor-pointer"
    >
      <Icon />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="whitespace-nowrap inline-block animate-marquee text-sm text-stone-600">
          {prefix} <span className="font-bold">*{course.title}*</span> {suffix}
          <span className="inline-block w-16" aria-hidden="true" />
          {prefix} <span className="font-bold">*{course.title}*</span> {suffix}
        </div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-stone-400" aria-hidden="true">
        <path d="M9 6l6 6-6 6"/>
      </svg>
    </div>
  )
}
