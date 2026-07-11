'use client'

import { useEffect, useState } from 'react'
import type { TutorialRect } from '@/lib/useTutorialRect'

// 首次登入教學用的遮罩：整頁變暗，挖出一個或多個「聚光燈」洞讓被教學的元件維持清楚可見。
// 用 SVG mask 一次處理多個洞（避免多層 box-shadow 疊加時邊界互相干擾），並保持 pointer-events:none
// 讓底下畫面（包含洞內外）都能正常點擊 —— 這是輔助導覽，不是強制鎖定操作的 Modal。
export default function TutorialMask({ holes, pulse }: { holes: (TutorialRect | null)[]; pulse?: boolean[] }) {
  const [vw, setVw] = useState(0)
  const [vh, setVh] = useState(0)

  useEffect(() => {
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const validHoles = holes
    .map((h, i) => ({ h, pulse: !!pulse?.[i] }))
    .filter((x): x is { h: TutorialRect; pulse: boolean } => !!x.h)
  if (validHoles.length === 0 || !vw || !vh) return null

  return (
    <svg
      className="fixed inset-0 z-40 pointer-events-none"
      width={vw}
      height={vh}
      aria-hidden="true"
    >
      <defs>
        <mask id="tutorial-cutout-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={vw} height={vh}>
          <rect x={0} y={0} width={vw} height={vh} fill="white" />
          {validHoles.map((v, i) => (
            <rect key={i} x={v.h.left} y={v.h.top} width={v.h.width} height={v.h.height} rx={v.h.radius ?? 16} fill="black" />
          ))}
        </mask>
      </defs>
      <rect x={0} y={0} width={vw} height={vh} fill="rgba(12,12,12,0.6)" mask="url(#tutorial-cutout-mask)" />
      {validHoles.map((v, i) => (
        <rect
          key={i}
          x={v.h.left}
          y={v.h.top}
          width={v.h.width}
          height={v.h.height}
          rx={v.h.radius ?? 16}
          fill="none"
          stroke="#f97316"
          strokeWidth={v.pulse ? undefined : 2.5}
        >
          {v.pulse && (
            <>
              <animate attributeName="stroke-width" values="2.5;5;2.5" dur="1.3s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="1;0.45;1" dur="1.3s" repeatCount="indefinite" />
            </>
          )}
        </rect>
      ))}
    </svg>
  )
}
