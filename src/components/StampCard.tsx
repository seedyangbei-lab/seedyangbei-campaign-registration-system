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
          // 6 種略不規則的手繪花朵 path，依 index 輪替
  const flowerPaths = [
    "M34 14 C37 19 42 18 44 14 C47 17 52 16 53 20 C58 20 60 25 57 28 C61 31 61 37 57 39 C60 43 58 48 53 48 C52 52 47 53 44 50 C42 54 37 53 34 50 C31 53 26 54 24 50 C19 53 14 52 13 48 C8 48 6 43 9 39 C5 37 5 31 9 28 C6 25 8 20 13 20 C14 16 19 15 24 14 C26 10 31 11 34 14Z",
    "M34 13 C38 17 43 15 46 12 C50 15 54 14 55 19 C60 19 63 24 59 28 C63 32 62 38 58 40 C61 44 59 50 54 50 C53 55 47 56 43 52 C40 56 35 55 34 51 C31 55 26 56 23 52 C19 56 13 55 12 50 C7 50 5 44 8 40 C4 38 3 32 7 28 C3 24 6 19 11 19 C12 14 16 13 20 12 C23 9 28 11 34 13Z",
    "M34 15 C36 20 41 19 43 15 C47 18 51 17 52 21 C57 21 59 26 56 29 C60 32 59 38 55 40 C58 44 56 49 51 49 C50 53 45 54 42 51 C40 55 35 54 34 51 C31 54 26 55 24 51 C21 54 16 53 15 49 C10 49 8 44 11 40 C7 38 6 32 10 29 C7 26 9 21 14 21 C15 17 19 16 23 15 C26 11 30 12 34 15Z",
    "M34 12 C37 18 43 17 45 13 C49 16 53 14 55 19 C60 18 63 23 60 27 C64 31 63 37 59 39 C62 44 60 49 55 49 C54 54 48 55 44 51 C41 56 36 55 34 51 C30 55 25 56 22 51 C18 55 12 54 11 49 C6 49 4 44 7 39 C3 37 2 31 6 27 C3 23 6 18 11 19 C13 14 17 13 21 13 C24 9 29 10 34 12Z",
    "M34 14 C36 19 41 18 44 13 C48 16 52 15 53 20 C58 19 61 24 58 28 C62 31 61 37 57 39 C61 43 59 48 54 49 C53 53 47 54 43 51 C41 55 36 54 34 51 C30 54 25 55 23 51 C19 54 13 53 12 49 C7 49 5 43 9 39 C5 37 4 31 8 28 C5 24 7 19 12 20 C13 15 17 14 21 13 C25 10 30 11 34 14Z",
    "M34 13 C37 18 42 17 45 12 C49 15 54 13 55 18 C61 18 63 23 59 27 C63 31 62 38 58 40 C61 45 59 50 53 50 C52 55 46 56 42 52 C40 57 35 56 34 52 C31 56 26 57 24 52 C20 56 14 55 13 50 C7 50 5 45 8 40 C4 38 3 31 7 27 C3 23 5 18 11 18 C12 13 16 12 20 12 C24 9 29 10 34 13Z",
  ]
  const flowerPath = flowerPaths[index % 6]

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-[76px] h-[76px]">
        <svg viewBox="0 0 68 68" width="76" height="76" xmlns="http://www.w3.org/2000/svg">
          {isStamped ? (
            <>
              {/* 蓋章：手繪花朵填色 */}
              <path d={flowerPath} fill="#f97316" opacity="0.18" />
              {/* 花朵輪廓（略粗，手繪感） */}
              <path d={flowerPath} fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinejoin="round" />
              {/* 核取符號 */}
              <path
                d="M25 34 L31 40 L43 27"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              {/* 未蓋章：花朵輪廓（淡灰） */}
              <path d={flowerPath} fill="#f5f5f4" stroke="#d6d3d1" strokeWidth="1.5" strokeLinejoin="round" />
              {/* 序號 */}
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
            </>
          )}
        </svg>
      </div>
      {/* 課程名稱 + 日期 */}
      <div className="h-8 flex flex-col items-center justify-start">
        {isStamped && (
          <>
            <p className="text-[10px] text-orange-700 font-medium leading-tight text-center line-clamp-1 w-[76px]">{shortName}</p>
            <p className="text-[9px] text-stone-400 leading-tight">{dateStr}</p>
          </>
        )}
      </div>
    </div>
  )

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
                <div className="grid grid-cols-3 gap-x-3 gap-y-2 px-5 pb-4 justify-items-center">
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
