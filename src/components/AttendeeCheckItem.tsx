'use client'

export type AttendanceStatus = 'confirmed' | 'attended' | 'absent'

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  confirmed: '未確認',
  attended: '已出席',
  absent: '未出席',
}
const STATUS_CLASS: Record<AttendanceStatus, string> = {
  confirmed: 'bg-[#f0f5ff] text-[#2663eb]',
  attended: 'bg-[#edfaf0] text-[#14803d]',
  absent: 'bg-[#fff7ed] text-[#eb570d]',
}

export function AttendeeStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

// 出席清單項目（對照 Figma「check list」元件，node 471:19384）
// 中台／後台的簽到彈窗、中台出席紀錄手機版全螢幕頁共用同一份，避免各處樣式各自漂移
// - mode="edit"（預設）：可勾選的出席勾選框，用在編輯出席狀態時（node 470:18028）
// - mode="view"：不可互動，右側改顯示處理狀態徽章（未確認／已出席／未出席，node 481:19958）
export default function AttendeeCheckItem({
  mode = 'edit', checked = false, name, roomNumber, badge, status, onToggle,
}: {
  mode?: 'edit' | 'view'
  checked?: boolean
  name?: string
  roomNumber?: string
  badge?: string
  status?: AttendanceStatus
  onToggle?: () => void
}) {
  const inner = (
    <>
      {mode === 'edit' && (
        <span
          aria-hidden="true"
          className={`relative shrink-0 size-4 rounded flex items-center justify-center transition-colors ${checked ? 'bg-orange-500' : 'border border-stone-300'}`}
        >
          {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-stone-700 truncate">{name}</p>
          {badge && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 whitespace-nowrap shrink-0">{badge}</span>}
        </div>
        <p className="text-xs text-stone-500 truncate">{roomNumber}</p>
      </div>
      {mode === 'view' && status && <AttendeeStatusBadge status={status} />}
    </>
  )

  if (mode === 'view') {
    return (
      <div className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 flex gap-3 items-center">
        {inner}
      </div>
    )
  }

  return (
    <label className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-2 flex gap-3 items-center cursor-pointer transition-colors hover:bg-orange-50 hover:border-orange-200">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      {inner}
    </label>
  )
}
