'use client'

import { useRouter, usePathname } from 'next/navigation'
import { markTutorialSeen } from '@/lib/tutorial'

// 教學導覽的「跳過」按鈕：深色半透明膠囊，固定在畫面右上角。
// 不論目前在教學的哪一步驟（首頁選課/報名表單/報名成功頁），按下後一律回到首頁。
export default function TutorialSkipButton({ onSkip }: { onSkip: () => void }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSkip = () => {
    markTutorialSeen()
    onSkip()
    if (pathname !== '/') router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleSkip}
      className="fixed top-4 right-4 z-50 h-[31px] px-3 rounded-xl text-sm text-white transition-opacity hover:opacity-80"
      style={{ backgroundColor: 'rgba(88,88,88,0.6)', textShadow: '0px 1px 4px rgba(0,0,0,0.25)' }}
    >
      跳過
    </button>
  )
}
