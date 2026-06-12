'use client'

import { useRef, useState } from 'react'

interface StampLog {
  id: string
  delta: number
  reason: string
  created_at: string
}

interface StampCardProps {
  logs: StampLog[]
  totalPoints: number
}

const STAMPS_PER_CARD = 6

// 鋸齒外框 path（frame / frame2 共用）
const FRAME_PATH = "M49.7311 2.04336C53.6275 1.59855 53.886 4.67449 55.9564 6.77245C59.8086 10.6547 61.2999 6.14578 63.7822 4.01933C65.7925 2.29771 68.5077 2.10067 70.8665 3.4261C73.1608 4.71546 72.9473 7.11459 75.26 8.1294C77.1154 8.94331 78.8002 7.65506 80.3354 6.90675C81.2117 6.48646 82.1222 6.12476 83.0598 5.82476C85.1076 5.17048 88.0983 4.55145 90.1613 5.42659C92.7191 6.51138 92.7731 9.36057 92.3079 11.4984C92.0641 12.6221 91.2188 14.2146 91.6919 15.3022C91.8816 15.7383 92.2493 16.1465 92.7698 16.2867C93.2864 16.4255 93.8965 16.3443 94.4269 16.3118C95.9693 16.217 97.467 16.2415 98.9033 16.8179C100.041 17.2747 101.086 18.0664 101.52 19.1304C101.891 20.0409 101.667 21.2709 101.211 22.1313C99.9892 24.4382 96.3363 24.2914 94.0006 25.0416C93.4577 25.2161 93.0235 25.5027 92.7909 25.9817C92.5642 26.4486 92.5504 27.0013 92.781 27.4695C93.2646 28.4523 94.6417 28.504 95.632 28.8638C97.2535 29.4534 101.256 31.2819 101.88 32.6802C102.175 33.3422 101.874 34.1093 101.555 34.7225C100.358 37.0263 97.7628 37.3624 95.3579 38.1464C94.4131 38.4544 93.0795 38.9455 92.6532 39.8277C92.4641 40.2187 92.4931 40.6756 92.6492 41.0714C93.7212 43.7834 99.5866 44.7947 100.536 46.899C101.845 49.7993 94.0592 51.9437 92.7988 54.5129C92.5734 54.9728 92.5807 55.4129 92.8067 55.874C93.3107 56.9024 94.7919 56.8971 95.8152 57.2847C97.243 57.8251 98.3927 58.7981 98.9679 60.0857C99.2973 60.8211 99.3738 61.6131 99.3145 62.3975C99.0061 66.4668 94.0948 67.1415 93.3074 68.9082C93.1085 69.3542 93.1974 69.7627 93.4287 70.18C93.9703 71.1565 95.0337 71.1209 96.0352 71.4092C97.2166 71.7495 98.2076 72.681 98.7564 73.6435C99.3771 74.732 99.5056 76.061 99.0575 77.219C98.4494 78.7884 97.0361 80.0777 95.3645 80.7968C94.786 81.0454 94.1554 81.1908 93.5809 81.4423C93.1078 81.6495 92.6499 82.0096 92.4917 82.469C92.3086 82.9972 92.4726 83.6906 92.8719 84.1126C93.2752 84.5386 93.9011 84.8077 94.4216 85.1054C95.6998 85.8373 96.9774 86.8219 97.7206 88.0114C98.2168 88.8057 98.6556 90.0524 98.3347 90.9542C97.7345 92.6421 93.7522 92.0655 92.2592 91.7871C91.4461 91.6353 90.6067 91.3417 89.7785 91.2886C89.3482 91.2612 88.9147 91.3254 88.5391 91.5215C88.0977 91.7526 87.7972 92.1805 87.6806 92.6165C87.1653 94.5507 89.8786 94.6412 90.7721 95.9421C91.1331 96.4686 91.2623 97.1678 91.0903 97.7713C90.9849 98.1396 90.7279 98.4186 90.3537 98.6013C87.9211 99.789 83.3346 98.5838 80.9956 97.4824C79.8537 96.9443 78.7303 96.1102 77.4844 95.7992C76.8314 95.6363 76.1277 95.6293 75.4873 95.84C73.6701 96.4371 73.3051 98.1005 72.3069 99.3682C71.8173 99.9881 71.1756 100.502 70.4304 100.87C69.4888 101.338 68.4504 101.531 67.3758 101.481C62.5205 101.254 62.1495 96.4645 59.1467 95.8044C58.6729 95.7005 58.2143 95.7892 57.7718 95.948C54.9631 96.9571 54.6694 100.363 52.3718 101.578C51.2733 102.159 50.1409 102.05 48.9508 101.788C45.6872 100.852 43.5986 98.3684 41.614 96.0501C41.3713 95.767 40.774 95.2844 40.3958 95.1857C38.4022 94.6639 37.9346 96.4388 37.1288 97.5781C35.7916 99.5661 33.8912 101.876 30.983 101.684C27.7639 101.471 25.9477 98.5371 24.5494 96.3087C24.1715 95.6725 23.5639 95.0573 22.6948 95.0486C21.604 95.0334 21.0095 95.7472 20.4522 96.4599C18.8563 98.3363 17.0193 99.6968 14.1744 99.7739C10.5929 99.8708 7.73079 96.4616 10.9526 94.0546C11.2486 93.8334 12.0279 93.7272 12.3788 93.3641C12.7382 92.9923 12.9547 92.5803 12.925 92.0573C12.6058 89.9211 10.0747 90.4237 8.36596 90.4272C7.4316 90.4242 6.43629 90.3927 5.50799 90.3519C4.73683 90.3174 3.11782 90.3279 2.55673 89.8633C1.87699 89.3001 1.79103 86.474 2.45813 85.9032C3.18272 85.2834 5.28983 85.082 6.24475 84.7482C8.34553 84.0851 10.3153 83.2954 11.8525 81.8194C12.2944 81.3775 12.7077 80.9602 12.65 80.3345C12.6617 79.8372 12.0624 78.9559 11.4949 78.8053C9.49891 78.2339 6.83781 77.9929 5.298 76.5991C2.66708 74.2184 4.25512 72.9723 6.50079 71.5318L9.60888 69.5106C10.5429 68.9117 12.9491 67.668 12.6797 66.5182C12.0989 63.7901 7.21192 62.6485 5.45099 61.1257C1.19535 57.4452 12.8505 55.0919 12.573 51.7587C12.4546 50.337 10.736 50.28 9.63022 49.9047C8.93899 49.6714 8.29902 49.3331 7.73916 48.9049C6.6014 48.0281 5.9184 46.7771 5.84902 45.4427C5.69814 43.0275 7.32921 41.3384 9.48052 40.0574C10.4517 39.4791 12.1605 38.7584 11.9743 37.5264C11.7511 36.0494 10.384 36.0676 9.17039 35.6806C8.66733 35.5173 8.19952 35.279 7.78706 34.9761C4.24583 32.3979 6.054 27.8696 9.73624 26.3293C10.4422 25.9498 11.8748 25.8269 12.3558 25.1909C13.6841 23.4346 11.7483 22.5863 10.5532 21.8436C8.25592 20.4161 5.49731 18.0002 7.84643 15.5675C8.45464 14.9375 9.13982 14.2765 10.0772 13.9645C11.0139 13.7736 11.9104 13.8878 12.4871 13.0453C13.6653 11.3244 12.448 10.6281 10.8797 9.92637C9.56835 9.33967 9.15906 7.09031 10.0879 6.03978C12.7411 3.05075 17.4173 4.2364 19.8187 6.8586C20.6537 7.77033 21.4543 9.29234 23.1037 8.95469C24.1115 8.74837 24.9066 7.19776 25.3796 6.4362C28.619 1.22191 33.6132 0.871077 36.9517 6.21891C37.3777 6.89957 38.2194 8.44277 39.0026 8.8065C40.6357 9.56491 41.8705 7.67391 42.7022 6.73947C44.6773 4.51486 46.539 2.79283 49.7311 2.04336Z"

// stamp1 圖案來自 public/stamps/stamp1.svg，固定粉色原色


const MASK_ID_PREFIX = "ymask"

function StampSlot({ log, index }: { log?: StampLog; index: number }) {
  const isStamped = !!log && log.delta > 0
  const maskId = `${MASK_ID_PREFIX}-${index}`

  const shortName = log?.reason
    ? log.reason.replace(/^出席課程：/, '').replace(/^手動調整.*/, '加點').slice(0, 8)
    : ''

  const dateStr = log?.created_at
    ? new Date(log.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    : ''

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 84, height: 84 }}>
        <svg viewBox="0 0 104 104" width="84" height="84" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="104" height="104">
              <rect fill="white" width="104" height="104"/>
              <path d={FRAME_PATH}/>
            </mask>
          </defs>

          {isStamped ? (
            <>
              {/* 彩色外框底色 */}
              <path d={FRAME_PATH} fill="#FDEFD9"/>
              {/* 橘色邊框 */}
              <path d={FRAME_PATH} fill="none" stroke="#FF6800" strokeWidth="4" mask={`url(#${maskId})`}/>
              {/* stamp1 圖案，透過 foreignObject 嵌入帶 filter 的 img */}
              <foreignObject x="4" y="4" width="96" height="96">
                <img
                  src="/stamps/stamp1.svg"
                  width="96"
                  height="96"
                  style={{}}
                />
              </foreignObject>
            </>

          ) : (
            <>
              {/* 灰色外框底色 */}
              <path d={FRAME_PATH} fill="#F5F5F4"/>
              {/* 灰色邊框 */}
              <path d={FRAME_PATH} fill="none" stroke="#CBCACA" strokeWidth="4" mask={`url(#${maskId})`}/>
              {/* 序號 */}
              <text
                x="52" y="58"
                textAnchor="middle"
                fontSize="20"
                fontFamily="system-ui, sans-serif"
                fill="#a8a29e"
                fontWeight="400"
              >
                {String(index + 1).padStart(2, '0')}
              </text>
            </>
          )}
        </svg>
      </div>
      <div className="h-7 flex flex-col items-center justify-start">
        {isStamped && (
          <>
            <p className="text-[10px] text-orange-700 font-medium leading-tight text-center line-clamp-1 w-[84px]">{shortName}</p>
            <p className="text-[9px] text-stone-400 leading-tight">{dateStr}</p>
          </>
        )}
      </div>
    </div>
  )
}

  export default function StampCard({ logs, totalPoints }: StampCardProps) {
  const stampedLogs = logs.filter(l => l.delta > 0)
  // 只有前 totalPoints 筆是有效章（最新的先顯示，舊的被兌換後變空格）
  const validCount = Math.min(totalPoints, stampedLogs.length)
  const totalSlots = Math.max(stampedLogs.length, STAMPS_PER_CARD)
  const totalCards = Math.max(1, Math.ceil(totalSlots / STAMPS_PER_CARD))
  const [currentCard, setCurrentCard] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth)
    setCurrentCard(idx)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-stone-700 text-sm">我的集點卡</h2>
          <p className="text-stone-400 text-xs mt-0.5">每次出席課程獲得 1 枚印章</p>
        </div>
      <p className="text-[10px] text-stone-400 tracking-wider">共 {validCount} 枚印章</p>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.from({ length: totalCards }).map((_, cardIdx) => {
         const slotLogs = Array.from({ length: STAMPS_PER_CARD }).map((_, slotIdx) => {
            const logIdx = cardIdx * STAMPS_PER_CARD + slotIdx
            // 只有 logIdx < validCount 的格子才顯示實心章
            return logIdx < validCount ? (stampedLogs[logIdx] || null) : null
          })

          return (
            <div key={cardIdx} className="flex-none w-full snap-center">
              <div
                className="rounded-2xl border border-orange-100 mx-0.5"
                style={{ background: 'linear-gradient(135deg, #fffbf5 0%, #fff7ed 100%)' }}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-1.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L13.8 7.4H19.5L14.8 10.6L16.6 16L12 12.8L7.4 16L9.2 10.6L4.5 7.4H10.2L12 2Z" fill="#f97316" opacity="0.6"/>
                    </svg>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase">Yangbei Social</span>
                  </div>
                  <span className="text-[9px] text-stone-300 tracking-wider">{cardIdx + 1} / {totalCards}</span>
                </div>

                <div className="mx-4 border-t border-dashed border-orange-200 mb-3" />

                <div className="grid grid-cols-3 gap-x-2 gap-y-1 px-4 pb-3 justify-items-center">
                  {slotLogs.map((log, slotIdx) => (
                    <StampSlot
                      key={slotIdx}
                      log={log ?? undefined}
                      index={cardIdx * STAMPS_PER_CARD + slotIdx}
                    />
                  ))}
                </div>

                <div className="mx-4 border-t border-dashed border-orange-200 mt-1 mb-3" />
                <p className="text-center text-[9px] text-stone-300 tracking-[0.2em] uppercase pb-3">央北社宅 · 課程集點卡</p>
              </div>
            </div>
          )
        })}
      </div>

      {totalCards > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalCards }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentCard ? 'w-4 h-1.5 bg-orange-400' : 'w-1.5 h-1.5 bg-stone-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
