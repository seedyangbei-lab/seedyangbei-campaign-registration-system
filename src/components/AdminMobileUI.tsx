'use client'

// 後台總覽頁「手機版」專用元件：篩選 BottomSheet、報名紀錄卡片（可展開）、
// 手機版分頁。依 Figma node 261-24323 系列實作。

import { useState } from 'react'
import { StatusBadge } from './AdminUI'

type RegStatus = 'cancelled' | 'confirmed' | 'attended'

/* ---------- 篩選 Icon Button（開啟 BottomSheet） ---------- */
export function MobileFilterIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="篩選"
      className="flex items-center justify-center size-8 shrink-0 rounded-md border border-stone-200 bg-white text-stone-500"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" fill="white" />
        <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="white" />
        <line x1="4" y1="18" x2="20" y2="18" /><circle cx="11" cy="18" r="2" fill="white" />
      </svg>
    </button>
  )
}

/* ---------- 排序 Icon Button（直接切換 新->舊／舊->新） ---------- */
export function MobileSortIconButton({ sortOrder, onToggle }: { sortOrder: 'desc' | 'asc'; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="排序"
      className="flex items-center justify-center size-8 shrink-0 rounded-md bg-orange-500 text-white"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3v18M7 21l-3-3M7 21l3-3" />
        <path d="M17 21V3M17 3l-3 3M17 3l3 3" />
      </svg>
    </button>
  )
}

/* ---------- 篩選 BottomSheet：排序／身份別／狀態 ---------- */
export function FilterBottomSheet({
  open, onClose,
  filterResident, onResidentChange,
  filterStatus, onStatusChange,
  onReset,
}: {
  open: boolean
  onClose: () => void
  filterResident: string
  onResidentChange: (v: string) => void
  filterStatus: string
  onStatusChange: (v: string) => void
  onReset: () => void
}) {
  if (!open) return null

  const pill = (active: boolean) =>
    `flex-1 min-w-0 flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-orange-500 text-white' : 'bg-white border border-stone-300 text-stone-600'
    }`

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:hidden">
      <div className="absolute inset-0 bg-black/40 animate-[sheetFadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl pt-2 pb-6 animate-[sheetSlideUp_0.25s_ease-out]">
        <div className="flex items-center justify-center py-2">
          <div className="w-9 h-1 rounded-full bg-stone-200" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
          <p className="text-lg font-bold text-stone-800">篩選</p>
          <button type="button" onClick={onReset} className="text-sm font-medium text-orange-600">重置</button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-800">身份別</p>
            <div className="flex gap-2 w-full">
              <button type="button" onClick={() => onResidentChange(filterResident === 'social' ? '' : 'social')} className={pill(filterResident === 'social')}>社宅居民</button>
              <button type="button" onClick={() => onResidentChange(filterResident === 'other' ? '' : 'other')} className={pill(filterResident === 'other')}>非社宅居民</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-stone-800">狀態</p>
            <div className="flex gap-2 w-full">
              <button type="button" onClick={() => onStatusChange(filterStatus === 'cancelled' ? '' : 'cancelled')} className={pill(filterStatus === 'cancelled')}>已取消</button>
              <button type="button" onClick={() => onStatusChange(filterStatus === 'confirmed' ? '' : 'confirmed')} className={pill(filterStatus === 'confirmed')}>待出席</button>
              <button type="button" onClick={() => onStatusChange(filterStatus === 'attended' ? '' : 'attended')} className={pill(filterStatus === 'attended')}>已出席</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- 報名紀錄卡片：點「詳細資訊」展開手機／房號／年齡／身份，滑順動畫 ---------- */
export function MobileRegistrationCard({
  reg, getInitials, formatDT, onCancel, onDelete,
}: {
  reg: any
  getInitials: (name?: string) => string
  formatDT: (ts: string) => string
  onCancel: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const status = reg.status as RegStatus

  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05)] flex flex-col gap-3 pt-4 pb-1 w-full">
      <div className="flex flex-col gap-3 px-4">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="size-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-normal text-xs tracking-wide">{getInitials(reg.users?.name)}</span>
            </div>
            <p className="text-sm font-medium text-stone-800">{reg.users?.name}</p>
          </div>

          {status !== 'attended' && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(v => !v)}
                aria-label="操作"
                className="flex items-center justify-center size-5 rounded-md border border-stone-200 bg-white"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-stone-500">
                  <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-lg shadow-lg py-1 min-w-[104px]">
                    {status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onCancel() }}
                        className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        取消報名
                      </button>
                    )}
                    {status === 'cancelled' && (
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); onDelete() }}
                        className="w-full text-left px-3 py-2 text-xs text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors whitespace-nowrap"
                      >
                        永久刪除
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#fafaf9] rounded-lg p-3 flex flex-col gap-1 w-full">
          <div className="flex gap-1 items-center justify-end border-b border-[rgba(206,206,206,0.3)] pb-2 text-xs">
            <p className="flex-1 min-w-0 font-medium text-[#57534e] truncate">{reg.courses?.title}</p>
            <p className="text-[#a8a29e] shrink-0">{reg.courses?.date}</p>
          </div>
          <div className="flex items-end justify-between w-full">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] tracking-wide text-stone-400">報名時間</p>
              <p className="text-xs text-stone-800">{formatDT(reg.registered_at)}</p>
            </div>
            <StatusBadge status={status} />
          </div>
        </div>

        {/* 展開區塊：grid-template-rows 0fr -> 1fr 做滑順高度動畫 */}
        <div className={`grid w-full transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="bg-stone-100 rounded-lg px-3 py-2.5 flex flex-col gap-2 w-full mb-1">
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="text-[11px] text-stone-400">手機</p>
                  <p className="text-xs font-medium text-stone-500 whitespace-nowrap">{reg.users?.phone}</p>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="text-[11px] text-stone-400">房號</p>
                  <p className="text-xs font-medium text-stone-500 whitespace-nowrap">{reg.users?.room_number}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="text-[11px] text-stone-400">年齡</p>
                  <p className="text-xs font-medium text-stone-500 whitespace-nowrap">{reg.users?.age_group}</p>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <p className="text-[11px] text-stone-400">身份</p>
                  <p className="text-xs font-medium text-stone-500 whitespace-nowrap">{reg.is_social_housing_resident ? '社宅居民' : '非社宅居民'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-center gap-1 border-t border-stone-100 pt-2 pb-1.5 w-full text-[11px] text-stone-500"
      >
        {expanded ? '收起' : '詳細資訊'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )
}

/* ---------- 手機版分頁：僅上一頁／目前頁碼／下一頁 ---------- */
export function MobilePagination({
  currentPage, totalPages, onChange,
}: { currentPage: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-stone-500"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div className="size-9 rounded-lg bg-orange-500 text-white flex items-center justify-center text-sm">{currentPage}</div>
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-stone-200 bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed text-stone-500"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  )
}
