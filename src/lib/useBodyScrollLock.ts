'use client'

import { useEffect } from 'react'

// 彈窗／Modal 顯示時鎖住背景頁面的捲動，避免手機版跟電腦版在彈窗開著的時候
// 還可以滑動/捲動底下的頁面內容。active 關閉或元件卸載時會自動還原。
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [active])
}
