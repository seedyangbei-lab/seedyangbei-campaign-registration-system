'use client'

// 後台共用 UI 元件（依 Figma design system 實作，總覽頁優先套用，
// 之後課程管理／講師管理等頁面可直接沿用）：
// StatCard（含緩慢流動邊框動態）、FilterDropdown、SortToggle、
// IdentityBadge、StatusBadge、PaginationControl

import { ReactNode } from 'react'

/* ---------- Stat Card：外層邊框緩慢流動的漸層動態（慢速，不刺眼） ---------- */
export function StatCard({ label, value, desc }: { label: string; value: number | string; desc: string }) {
  return (
    <div className="stat-card-flow-border rounded-lg h-[120px]">
      <div className="relative z-10 bg-white rounded-lg shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)] p-5 flex flex-col gap-1 h-full">
        <p className="text-stone-600 text-[13px]">{label}</p>
        <p className="text-stone-800 text-[32px] font-semibold leading-none">{value}</p>
        <p className="text-stone-500 text-xs leading-4">{desc}</p>
      </div>
    </div>
  )
}

/* ---------- 篩選用下拉選單（比照 Figma input/dropdown） ---------- */
export function FilterDropdown({
  value, onChange, children, className = '',
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`relative w-[200px] ${className}`}>
      <select
        value={value}
        onChange={onChange}
        className="appearance-none w-full h-8 px-2 pr-7 rounded-md border border-stone-200 bg-white text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-orange-300"
      >
        {children}
      </select>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}

/* ---------- 排序 Toggle：最新／最舊（取代原本的下拉選單） ---------- */
export function SortToggle({ value, onChange }: { value: 'desc' | 'asc'; onChange: (v: 'desc' | 'asc') => void }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className="text-xs text-stone-600">排序：</span>
      <div className="flex items-start bg-stone-200 rounded-lg p-0.5">
        {(['desc', 'asc'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              value === v ? 'bg-white text-stone-800 font-bold shadow-sm' : 'text-stone-500 font-normal'
            }`}
          >
            {v === 'desc' ? '最新' : '最舊'}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 身份標籤 ---------- */
export function IdentityBadge({ resident }: { resident: boolean }) {
  return resident ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-orange-200 text-orange-600 text-xs font-medium whitespace-nowrap">
      社宅居民
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-stone-200 text-stone-500 text-xs font-medium whitespace-nowrap">
      非社宅居民
    </span>
  )
}

/* ---------- 出席狀況標籤：已取消／待出席／已出席 三色 ---------- */
export function StatusBadge({ status }: { status: 'cancelled' | 'confirmed' | 'attended' }) {
  const map = {
    cancelled: { cls: 'bg-pink-100 text-pink-500', label: '已取消' },
    confirmed: { cls: 'bg-amber-50 text-amber-600', label: '待出席' },
    attended: { cls: 'bg-teal-50 text-teal-600', label: '已出席' },
  }[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${map.cls} text-xs font-medium whitespace-nowrap`}>
      {map.label}
    </span>
  )
}

/* ---------- 分頁元件 ----------
   <=5 頁：全部頁碼直接列出
   >5 頁：目前頁起算 4 個連續頁碼 + 刪節號 + 最後一顆固定為總頁數 */
export function PaginationControl({
  currentPage, totalPages, onChange,
}: { currentPage: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null

  const pages: number[] = []
  let showEllipsis = false
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    const start = Math.max(1, Math.min(currentPage, totalPages - 4))
    for (let i = start; i < start + 4; i++) pages.push(i)
    showEllipsis = true
  }

  const arrowBtnClass = (disabled: boolean) =>
    `flex items-center gap-1 px-4 py-2 rounded-lg border text-sm transition-colors ${
      disabled
        ? 'border-stone-200 text-stone-300 cursor-not-allowed'
        : 'border-orange-500 text-stone-600 hover:bg-orange-50'
    }`

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className={arrowBtnClass(currentPage === 1)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        上一頁
      </button>

      <div className="flex items-center gap-1">
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`size-9 rounded-lg text-sm transition-colors ${
              p === currentPage ? 'bg-orange-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
            }`}
          >
            {p}
          </button>
        ))}
        {showEllipsis && (
          <>
            <span className="size-9 rounded-lg flex items-center justify-center text-sm text-stone-600 select-none">…</span>
            <button
              onClick={() => onChange(totalPages)}
              className={`size-9 rounded-lg text-sm transition-colors ${
                totalPages === currentPage ? 'bg-orange-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-100'
              }`}
            >
              {totalPages}
            </button>
          </>
        )}
      </div>

      <button
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className={arrowBtnClass(currentPage === totalPages)}
      >
        下一頁
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  )
}
