'use client'

import type { TutorialRect } from '@/lib/useTutorialRect'

// 教學提示泡泡：白底圓角膠囊 + 橘色數字圓標 + 說明文字，跟著目標元件的位置浮動顯示。
// placement='above' 顯示在洞的上方（預設），'below' 顯示在下方。
export default function TutorialTooltip({
  hole,
  number,
  text,
  placement = 'above',
  widthClass = 'max-w-[210px]',
}: {
  hole: TutorialRect | null
  number: number
  text: string
  placement?: 'above' | 'below'
  widthClass?: string
}) {
  if (!hole) return null

  const top = placement === 'above' ? hole.top - 12 : hole.top + hole.height + 12
  const translateY = placement === 'above' ? '-100%' : '0'

  return (
    <div
      className="fixed z-50 transition-all duration-300 ease-out"
      style={{
        top,
        left: hole.left + hole.width / 2,
        transform: `translate(-50%, ${translateY})`,
      }}
    >
      <div className="bg-white rounded-full shadow-[0px_4px_12px_rgba(0,0,0,0.15)] flex items-center gap-2 px-4 py-2 animate-tutorial-pop">
        <span className="flex-shrink-0 w-[26px] h-[26px] rounded-full bg-orange-100 text-orange-600 font-bold text-sm flex items-center justify-center">
          {number}
        </span>
        <span className={`text-sm font-medium text-[#1a1a1a] ${widthClass}`}>{text}</span>
      </div>
      <style jsx>{`
        .animate-tutorial-pop { animation: tutorialPop 0.35s ease-out; }
        @keyframes tutorialPop {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
