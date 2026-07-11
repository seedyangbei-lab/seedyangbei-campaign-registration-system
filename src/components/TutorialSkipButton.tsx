'use client'

import { markTutorialSeen } from '@/lib/tutorial'

// 教學導覽的「跳過」按鈕：深色半透明膠囊，固定在畫面右上角。
export default function TutorialSkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { markTutorialSeen(); onSkip() }}
      className="fixed top-4 right-4 z-50 h-[31px] px-3 rounded-xl text-sm text-white transition-opacity hover:opacity-80"
      style={{ backgroundColor: 'rgba(88,88,88,0.6)', textShadow: '0px 1px 4px rgba(0,0,0,0.25)' }}
    >
      跳過
    </button>
  )
}
