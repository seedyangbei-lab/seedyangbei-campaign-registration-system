'use client'

import React, { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getTutorialStep, setTutorialStep as saveTutorialStep, markTutorialSeen } from '@/lib/tutorial'
import { useTutorialRect } from '@/lib/useTutorialRect'
import TutorialMask from '@/components/TutorialMask'
import TutorialTooltip from '@/components/TutorialTooltip'
import SiteNavbar from '@/components/SiteNavbar'

// 報名記錄 icon（橘色按鈕內，白色），從 Figma 提供的合併 SVG 裁切出來
function IconRegistrationList() {
  return (
    <div className="w-[18px] h-[18px] overflow-hidden relative flex-shrink-0">
      <svg width="34" height="76" viewBox="0 0 34 76" fill="none" className="absolute" style={{ left: '-2px', top: '-2px' }} aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M13.1973 2.25C13.7245 2.25 14.2483 2.56725 14.4292 3.13088L14.4805 3.29693L14.5338 3.48593L14.5878 3.69922L14.6398 3.93278L14.689 4.18658L14.712 4.32022L14.7532 4.6017C14.9084 5.80995 14.8591 7.45695 13.9958 9.12758L13.8885 9.32805C12.9826 10.9582 13.0481 12.5991 13.2526 13.6649L13.3026 13.9005L13.3282 14.0099L13.3802 14.2124L13.4322 14.3892C13.6171 14.9899 13.2175 15.6865 12.5365 15.7459L12.442 15.75H4.62479C4.09829 15.75 3.57382 15.4328 3.39292 14.8691L3.34229 14.7031L3.28829 14.5141L3.23429 14.3008L3.18232 14.0672L3.13304 13.8134C3.11684 13.7257 3.10199 13.635 3.08849 13.5414L3.05137 13.2512L3.02302 12.9447C2.93729 11.7945 3.06689 10.3426 3.82627 8.87243L3.93359 8.67195C4.83944 7.0425 4.77329 5.4009 4.56944 4.33575L4.52017 4.10018L4.49384 3.99083L4.44187 3.78832L4.38989 3.61148C4.20494 3.01073 4.60454 2.31412 5.28562 2.25472L5.38079 2.25H13.1973ZM8.91104 9H6.88604C6.70702 9 6.53533 9.07112 6.40874 9.1977C6.28216 9.32429 6.21104 9.49598 6.21104 9.675C6.21104 9.85402 6.28216 10.0257 6.40874 10.1523C6.53533 10.2789 6.70702 10.35 6.88604 10.35H8.91104C9.09006 10.35 9.26175 10.2789 9.38834 10.1523C9.51492 10.0257 9.58604 9.85402 9.58604 9.675C9.58604 9.49598 9.51492 9.32429 9.38834 9.1977C9.26175 9.07112 9.09006 9 8.91104 9ZM11.611 6.3H7.56104C7.389 6.30019 7.22352 6.36607 7.09842 6.48417C6.97331 6.60228 6.89803 6.76369 6.88795 6.93544C6.87787 7.10719 6.93375 7.27631 7.04417 7.40824C7.15459 7.54017 7.31123 7.62496 7.48207 7.64528L7.56104 7.65H11.611C11.7831 7.64981 11.9486 7.58393 12.0737 7.46583C12.1988 7.34772 12.274 7.18631 12.2841 7.01456C12.2942 6.84281 12.2383 6.67369 12.1279 6.54176C12.0175 6.40983 11.8609 6.32505 11.69 6.30473L11.611 6.3Z" fill="white"/>
      </svg>
    </div>
  )
}

// 返回 icon（白色按鈕內，灰色），從 Figma 提供的合併 SVG 裁切出來
function IconBack() {
  return (
    <div className="w-[18px] h-[18px] overflow-hidden relative flex-shrink-0">
      <svg width="34" height="76" viewBox="0 0 34 76" fill="none" className="absolute" style={{ left: '-17px', top: '-60px' }} aria-hidden="true">
        <path d="M20.8291 61.1241C21.0447 60.9393 21.3698 60.9642 21.5547 61.1797C21.7394 61.3953 21.7144 61.7195 21.499 61.9043L19.7539 63.4004H26.6484C29.2842 63.4007 31.5144 65.5451 31.6172 68.1797C31.726 70.9646 29.433 73.3425 26.6484 73.3428H20.8203C20.5365 73.3426 20.3066 73.1121 20.3066 72.8282C20.3069 72.5445 20.5366 72.3147 20.8203 72.3145H26.6484C28.8507 72.3142 30.6758 70.4198 30.5898 68.2198C30.5085 66.1373 28.7318 64.429 26.6484 64.4288H20.3486L21.5283 65.6075C21.7291 65.8082 21.7289 66.1341 21.5283 66.335C21.3275 66.5358 21.0016 66.5358 20.8008 66.335L18.8945 64.4288H18.7646C18.4806 64.4288 18.25 64.1981 18.25 63.9141C18.25 63.8533 18.2618 63.7954 18.2812 63.7413C18.2601 63.6809 18.2485 63.617 18.251 63.5518C18.2565 63.4088 18.321 63.2739 18.4297 63.1807L20.8291 61.1241Z" fill="#44403C"/>
      </svg>
    </div>
  )
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const profileUrl = '/profile'

  // 首次登入教學導覽 step4：報名成功
  const [tutorialStep, setTutorialStepState] = useState<string | null>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)
  const spotlightHole = useTutorialRect(spotlightRef, tutorialStep === '4', 12, 20)

  useEffect(() => {
    if (getTutorialStep() === '4') setTutorialStepState('4')
  }, [])

  const finishTutorial = () => {
    markTutorialSeen()
    router.push(profileUrl)
  }
  const replayTutorial = () => {
    saveTutorialStep('1')
    router.push('/?tutorial=1')
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      <SiteNavbar variant="inner" />
      <div className="flex-1 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div ref={spotlightRef} className="inline-block">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" pathLength="1" strokeDasharray="1" className="animate-draw-check" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-stone-800 mb-4">報名成功！</h1>
          <p className="text-stone-500 mb-8 leading-relaxed text-lg">
            感謝您的報名！<br />我們將透過 LINE 與您聯繫課程相關資訊。
          </p>
        </div>
        {tutorialStep !== '4' && (
          <div className="flex flex-col gap-3">
            <a href={profileUrl}
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-base">
              <IconRegistrationList />
              查看我的報名記錄
            </a>
            <Link href="/"
              className="inline-flex items-center justify-center gap-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-600 font-medium px-8 py-3.5 rounded-xl transition-colors text-base">
              <IconBack />
              返回課程列表
            </Link>
          </div>
        )}
      </div>
      </div>

      {tutorialStep === '4' && (
        <>
          <TutorialMask holes={[spotlightHole]} />
          <TutorialTooltip hole={spotlightHole} number={4} text="完成報名！" placement="above" widthClass="whitespace-nowrap" />
          <div className="fixed z-50 left-1/2 -translate-x-1/2 bottom-10 w-full max-w-sm px-4 flex flex-col gap-2">
            <button onClick={finishTutorial}
              className="w-full h-[50px] flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-[10px] text-base transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              開始報名活動！
            </button>
            <button onClick={replayTutorial}
              className="w-full h-[50px] flex items-center justify-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 font-medium rounded-[10px] text-base transition-colors hover:bg-orange-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              再看一次教學
            </button>
          </div>
        </>
      )}

      <style jsx>{`
        .animate-draw-check {
          stroke-dashoffset: 1;
          animation: drawCheck 0.6s 0.15s ease-out forwards;
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
