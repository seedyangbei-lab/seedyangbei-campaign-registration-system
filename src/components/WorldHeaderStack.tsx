'use client'

import { useEffect, useRef, useState } from 'react'
import SiteNavbar from './SiteNavbar'
import RegistrationSteps from './RegistrationSteps'
import GreetingBar from './GreetingBar'

type Course = { title: string; date: string; time_start: string; location: string }

// /world 試看頁專用：導覽列＋報名步驟條＋問候列三段疊在一起，全部維持 sticky 釘在畫面最上方，
// 並即時量測三段疊起來的實際高度，寫進 CSS 變數 --world-header-h，
// 讓 WorldScrollHero 可以據此算出影片要留多高，使「往下滑」提示在頁面一載入（不用捲動）
// 就完整落在第一個 100vh 裡面，捲動時也不會因為某一段滑走而留下空隙。
//
// GreetingBar 在首頁本來不是 sticky（捲動會正常滑走），這裡額外包一層 sticky 是這個頁面獨有的需求，
// 不影響 GreetingBar 本身、也不影響首頁的用法。
export default function WorldHeaderStack({ siteTitle, course }: { siteTitle?: string; course: Course | null }) {
  const navRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const greetingRef = useRef<HTMLDivElement>(null)
  const [prefixH, setPrefixH] = useState(0) // 導覽列 + 步驟條，GreetingBar 的 sticky top 要對齊這裡

  useEffect(() => {
    const update = () => {
      const navH = navRef.current?.offsetHeight ?? 0
      const stepsH = stepsRef.current?.offsetHeight ?? 0
      setPrefixH(navH + stepsH)
    }
    update()
    const ro = new ResizeObserver(update)
    if (navRef.current) ro.observe(navRef.current)
    if (stepsRef.current) ro.observe(stepsRef.current)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  useEffect(() => {
    const update = () => {
      const greetingH = greetingRef.current?.offsetHeight ?? 0
      document.documentElement.style.setProperty('--world-header-h', `${prefixH + greetingH}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    if (greetingRef.current) ro.observe(greetingRef.current)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [prefixH])

  return (
    <>
      <div ref={navRef}>
        <SiteNavbar siteTitle={siteTitle} variant="inner" />
      </div>
      <div ref={stepsRef}>
        <RegistrationSteps />
      </div>
      <div ref={greetingRef} className="sticky z-20" style={{ top: prefixH }}>
        <GreetingBar course={course} />
      </div>
    </>
  )
}
