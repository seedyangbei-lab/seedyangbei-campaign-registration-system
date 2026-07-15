'use client'

// 出席勾選清單項目（對照 Figma「check list」元件，node 471:19384）
// 中台／後台的簽到彈窗、中台出席紀錄手機版全螢幕頁共用同一份，避免各處樣式各自漂移
export default function AttendeeCheckItem({
  checked, name, roomNumber, badge, onToggle,
}: {
  checked: boolean
  name?: string
  roomNumber?: string
  badge?: string
  onToggle: () => void
}) {
  return (
    <label className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 flex gap-3 items-center cursor-pointer transition-colors hover:bg-orange-50 hover:border-orange-200">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
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
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-stone-700 truncate">{name}</p>
          {badge && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 whitespace-nowrap shrink-0">{badge}</span>}
        </div>
        <p className="text-xs text-stone-500 truncate">{roomNumber}</p>
      </div>
    </label>
  )
}
