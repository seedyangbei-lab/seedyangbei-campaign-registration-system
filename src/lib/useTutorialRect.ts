'use client'

import { useEffect, useState, RefObject } from 'react'

export interface TutorialRect {
  top: number
  left: number
  width: number
  height: number
  radius?: number
}

// 追蹤某個 DOM 元素在畫面上的即時位置，用於教學遮罩挖洞跟 tooltip 定位。
// 滾動、resize、或畫面本身有動畫時都會重新計算。
export function useTutorialRect(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  padding = 6,
  radius = 16
): TutorialRect | null {
  const [rect, setRect] = useState<TutorialRect | null>(null)

  useEffect(() => {
    if (!active) {
      setRect(null)
      return
    }
    let raf: number
    const update = () => {
      const el = ref.current
      // 目標元素暫時不存在（例如取消勾選後 CTA 按鈕整個從畫面消失）就把洞收掉，
      // 不然會停在最後一次量到的舊座標，變成一個對不到任何東西的殘影框
      if (!el) {
        setRect(null)
        raf = requestAnimationFrame(update)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({
        top: r.top - padding,
        left: r.left - padding,
        width: r.width + padding * 2,
        height: r.height + padding * 2,
        radius,
      })
      raf = requestAnimationFrame(update)
    }
    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  }, [active, ref, padding, radius])

  return rect
}
