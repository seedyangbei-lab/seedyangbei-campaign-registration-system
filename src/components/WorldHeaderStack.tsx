'use client'

import { useEffect, useState } from 'react'
import SiteNavbar from './SiteNavbar'
import RegistrationSteps from './RegistrationSteps'
import GreetingBar from './GreetingBar'

type Course = { title: string; date: string; time_start: string; location: string }

// /world 試看頁專用：導覽列＋報名步驟條＋問候列三段疊在一起，全部維持 sticky 釘在畫面最上方，
// 並即時量測三段疊起來的實際高度，寫進 CSS 變數 --world-header-h，
// 讓 WorldScrollHero 可以據此算出影片要留多高，使「往下滑」提示在頁面一載入（不用捲動）
// 就完整落在第一個 100vh 裡面，捲動時也不會因為某一段滑走而留下空隙。
//
// 注意：SiteNavbar、RegistrationSteps 本身就是 position:sticky。量測它們的高度絕對不能
// 用「外面包一層 div、對這層 div 取 ref」的做法——那層 wrapper div 的高度會跟內容剛好一樣高，
// 等於讓 sticky 元素的 containing block 完全沒有多餘空間可以「黏」，滾動時幾乎立刻被推走，
// sticky 形同失效（第一版就是這樣悄悄壞掉的）。改成直接量 DOM 節點本身（不额外包 wrapper），
// 導覽列高度用專案既有的固定常數（52／56px，跟 RegistrationSteps 自己的 top-[52px] 對齊），
// 只有 RegistrationSteps 的實際高度需要動態量測。
//
// GreetingBar 在首頁本來不是 sticky（捲動會正常滑走），這裡額外包一層 sticky 是這個頁面獨有的需求，
// 不影響 GreetingBar 本身、也不影響首頁的用法。
export default function WorldHeaderStack({ siteTitle, course }: { siteTitle?: string; course: Course | null }) {
  const [isMobile, setIsMobile] = useState(false)
  const [stepsH, setStepsH] = useState(0)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsMobile(!mq.matches)
    const onChange = () => setIsMobile(!mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const update = () => {
      setStepsH(document.getElementById('world-steps')?.offsetHeight ?? 0)
    }
    update()
    const el = document.getElementById('world-steps')
    const ro = new ResizeObserver(update)
    if (el) ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [])

  const navH = isMobile ? 52 : 56
  const prefixH = navH + stepsH

  useEffect(() => {
    const update = () => {
      const greetingH = document.getElementById('world-greeting')?.offsetHeight ?? 0
      document.documentElement.style.setProperty('--world-header-h', `${prefixH + greetingH}px`)
    }
    update()
    const el = document.getElementById('world-greeting')
    const ro = new ResizeObserver(update)
    if (el) ro.observe(el)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [prefixH])

  return (
    <>
      <SiteNavbar siteTitle={siteTitle} variant="inner" />
      <RegistrationSteps id="world-steps" />
      <div id="world-greeting" className="sticky z-20" style={{ top: prefixH }}>
        <GreetingBar course={course} />
      </div>
    </>
  )
}
