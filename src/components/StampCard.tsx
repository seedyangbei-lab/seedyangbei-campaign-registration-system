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

const STAMPS_PER_CARD = 8

function StampSlot({ log, index }: { log?: StampLog; index: number }) {
  const isStamped = !!log && log.delta > 0

  const shortName = log?.reason
    ? log.reason.replace(/^出席課程：/, '').replace(/^手動調整.*/, '加點').slice(0, 10)
    : ''

  const dateStr = log?.created_at
    ? new Date(log.created_at).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
    : ''

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[68px] h-[68px]">
        <svg viewBox="0 0 68 68" width="68" height="68" xmlns="http://www.w3.org/2000/svg">
          {/* 鋸齒外圈 */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2
            const outerR = 32
            const innerR = 28
            const x1 = 34 + Math.cos(angle) * outerR
            const y1 = 34 + Math.sin(angle) * outerR
            const x2 = 34 + Math.cos(angle) * innerR
            const y2 = 34 + Math.sin(angle) * innerR
            return (
              <line
                key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isStamped ? '#f97316' : '#d6d3d1'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            )
          })}
          {/* 中圈 */}
          <circle
            cx="34" cy="34" r="26"
            fill={isStamped ? '#fff7ed' : '#fafaf9'}
            stroke={isStamped ? '#f97316' : '#d6d3d1'}
            strokeWidth="1.5"
          />
          {/* 內圈虛線 */}
          <circle
            cx="34" cy="34" r="21"
            fill="none"
            stroke={isStamped ? '#fed7aa' : '#e7e5e4'}
            strokeWidth="1"
            strokeDasharray="2.5 2.5"
          />
          {isStamped ? (
            /* 蓋章：花形 */
            <>
              <path
                d="M34 16 C36 20 40 20 42 17 C43 22 47 24 50 22 C49 27 52 30 56 30 C53 33 53 37 56 40 C52 40 49 43 50 48 C47 46 43 48 42 53 C40 50 36 50 34 52 C32 50 28 50 26 53 C24 48 20 46 18 48 C19 43 16 40 12 40 C15 37 15 33 12 30 C16 30 19 27 18 22 C21 24 25 22 26 17 C28 20 32 20 34 16Z"
                fill="#f97316"
                opacity="0.15"
              />
              <path
                d="M34 21 C35.5 24 38.5 24 40 22 C40.8 25.5 43.5 27 46 25.5 C45.5 29 47.5 31 50 31 C48 33.5 48 36.5 50 39 C47.5 39 45.5 41 46 44.5 C43.5 43 40.8 44.5 40 48 C38.5 46 35.5 46 34 47 C32.5 46 29.5 46 28 48 C27.2 44.5 24.5 43 22 44.5 C22.5 41 20.5 39 18 39 C20 36.5 20 33.5 18 31 C20.5 31 22.5 29 22 25.5 C24.5 27 27.2 25.5 28 22 C29.5 24 32.5 24 34 21Z"
                fill="none"
                stroke="#f97316"
                strokeWidth="1"
              />
              {/* 核取符號 */}
              <path
                d="M26 34 L31 39 L42 28"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            /* 未蓋章：序號 */
            <text
              x="34" y="39"
              textAnchor="middle"
              fontSize="13"
              fontFamily="system-ui, sans-serif"
              fill="#a8a29e"
              fontWeight="400"
            >
              {String(index + 1).padStart(2, '0')}
            </text>
          )}
        </svg>
      </div>
      {/* 課程名稱 + 日期 */}
      <div className="h-8 flex flex-col items-center justify-start">
        {isStamped && (
          <>
            <p className="text-[10px] text-orange-700 font-medium leading-tight text-center line-clamp-1 w-[68px]">{shortName}</p>
            <p className="text-[9px] text-stone-400 leading-tight">{dateStr}</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function StampCard({ logs, totalPoints }: StampCardProps) {
  const stampedLogs = logs.filter(l => l.delta > 0)
  const totalCards = Math.max(1, Math.ceil(Math.max(stampedLogs.length + 1, STAMPS_PER_CARD) / STAMPS_PER_CARD))
  const [currentCard, setCurrentCard] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const idx = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth)
    setCurrentCard(idx)
  }

  return (
    <div>
      {/* 卡片標題列 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-stone-700 text-sm">我的集點卡</h2>
          <p className="text-stone-400 text-xs mt-0.5">每次出席課程獲得 1 枚印章</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-stone-400 tracking-wider">共 {stampedLogs.length} 枚印章</p>
        </div>
      </div>

      {/* 滑動卡片區 */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.from({ length: totalCards }).map((_, cardIdx) => {
          const slotLogs = Array.from({ length: STAMPS_PER_CARD }).map((_, slotIdx) => {
            const logIdx = cardIdx * STAMPS_PER_CARD + slotIdx
            return stampedLogs[logIdx] || null
          })

          return (
            <div
              key={cardIdx}
              className="flex-none w-full snap-center"
            >
              <div
                className="rounded-2xl border border-orange-100 mx-0.5"
                style={{ background: 'linear-gradient(135deg, #fffbf5 0%, #fff7ed 100%)' }}
              >
                {/* 卡片頂部裝飾 */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-1.5">
                    {/* 印章 logo */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L13.8 7.4H19.5L14.8 10.6L16.6 16L12 12.8L7.4 16L9.2 10.6L4.5 7.4H10.2L12 2Z" fill="#f97316" opacity="0.6"/>
                    </svg>
                    <span className="text-[10px] font-bold tracking-[0.15em] text-orange-400 uppercase">Yangbei Social</span>
                  </div>
                  <span className="text-[9px] text-stone-300 tracking-wider">
                    {cardIdx + 1} / {totalCards}
                  </span>
                </div>

                {/* 分隔虛線 */}
                <div className="mx-4 border-t border-dashed border-orange-200 mb-4" />

                {/* 印章格子 */}
                <div className="grid grid-cols-4 gap-x-2 gap-y-1 px-4 pb-4 justify-items-center">
                  {slotLogs.map((log, slotIdx) => (
                    <StampSlot
                      key={slotIdx}
                      log={log ?? undefined}
                      index={cardIdx * STAMPS_PER_CARD + slotIdx}
                    />
                  ))}
                </div>

                {/* 卡底 */}
                <div className="mx-4 border-t border-dashed border-orange-200 mt-1 mb-3" />
                <p className="text-center text-[9px] text-stone-300 tracking-[0.2em] uppercase pb-3">央北社宅 · 課程集點卡</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 頁碼指示點 */}
      {totalCards > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalCards }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentCard
                  ? 'w-4 h-1.5 bg-orange-400'
                  : 'w-1.5 h-1.5 bg-stone-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
