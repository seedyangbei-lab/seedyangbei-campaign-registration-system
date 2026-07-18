'use client'

import { useEffect, useState } from 'react'

/* ---------- Icons（inline SVG，禁止 emoji） ---------- */

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function PosterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

export function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" /><path d="M9 12h6M9 16h6" />
    </svg>
  )
}

export function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

export function ReportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6M9 11h2" />
    </svg>
  )
}

export function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" />
    </svg>
  )
}

// 問題通報浮動按鈕的驚嘆號圖示（對應 Figma node 352:26326）
export function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 9 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="0.75" y="0" width="7.5" height="19" rx="3.75" fill="white" />
      <circle cx="4.5" cy="28" r="4" fill="white" />
    </svg>
  )
}

/* ---------- 問題通報浮動按鈕（僅「我的課程」頁面顯示，海報編輯器不顯示） ---------- */

export function IssueReportFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="問題通報"
      className="fixed bottom-4 right-4 md:bottom-14 md:right-14 z-40 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 transition-colors w-12 h-12 md:w-14 md:h-14 shadow-[0px_3.429px_5.143px_rgba(0,0,0,0.2)] md:shadow-[0px_4px_6px_rgba(0,0,0,0.2)]"
    >
      <ExclamationIcon className="w-[7.5px] h-[27px] md:w-[8.75px] md:h-[31.5px]" />
    </button>
  )
}

// 統一下拉選單樣式：appearance-none + 固定位置的自訂 chevron，避免不同瀏覽器原生箭頭位置不一致
export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

/* ---------- Navbar：課程管理系統 ---------- */

export function InstructorNavbar({ name, avatarUrl }: { name?: string; avatarUrl?: string | null }) {
  return (
    <div className="sticky top-0 z-30 bg-white h-[65px] flex items-center justify-between px-4 shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
      <p className="text-sm font-bold tracking-[3px] text-stone-600">課程管理系統</p>
      <div className="flex items-center gap-2 bg-white rounded-xl drop-shadow-[0px_1px_1.5px_rgba(0,0,0,0.1)] px-2.5 py-2">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
            {name?.[0] || '?'}
          </div>
        )}
        <span className="text-xs font-medium text-stone-700 whitespace-nowrap">{name}</span>
      </div>
    </div>
  )
}

/* ---------- 個人資料卡（含編輯按鈕） ---------- */

export function InstructorProfileCard({
  name, avatarUrl, courseCount, onEdit,
}: { name?: string; avatarUrl?: string | null; courseCount: number; onEdit: () => void }) {
  return (
    <div
      className="relative border border-[#f2d8c4] px-[17px] pt-[17px] pb-5 md:p-6 md:rounded-2xl flex flex-col items-center gap-4 w-full"
      style={{
        backgroundImage:
          'radial-gradient(120% 60% at 0% 0%, rgba(255,128,45,0.28) 0%, rgba(255,163,82,0.14) 40%, rgba(255,199,139,0.04) 80%, rgba(255,224,178,0) 100%), linear-gradient(180deg, #ffead7 0%, #fff4e9 20%, #fffbf6 50%, #ffffff 100%)',
      }}
    >
      <button
        onClick={onEdit}
        className="absolute top-2 right-[17px] md:top-[15px] bg-white border border-stone-200 rounded-md p-1.5 hover:bg-stone-50 transition-colors"
        aria-label="編輯個人資料"
      >
        <EditIcon className="text-stone-600" />
      </button>
      <div className="w-[50px] h-[50px] md:w-[60px] md:h-[60px] rounded-full overflow-hidden bg-orange-100 flex items-center justify-center shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-orange-600 font-bold text-lg">{name?.[0]}</span>
        )}
      </div>
      <div className="text-center">
        <p className="text-xl font-bold text-stone-800 leading-7">{name}</p>
        <p className="text-sm text-stone-400 mt-0.5">共開設 {courseCount} 堂課程</p>
      </div>
    </div>
  )
}

/* ---------- 標題 ---------- */

export function InstructorTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="border-b border-stone-200 pb-4 md:pb-[17px] w-full flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-stone-600">{children}</h2>
      {action}
    </div>
  )
}

/* ---------- Tab Bar：開課中／已結束 ---------- */

export function InstructorTabBar({
  tab, onChange, activeCount, endedCount,
}: { tab: 'active' | 'ended'; onChange: (t: 'active' | 'ended') => void; activeCount: number; endedCount: number }) {
  const pill = (selected: boolean) =>
    `flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      selected ? 'bg-white text-stone-800 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]' : 'text-stone-400'
    }`
  const badge = (selected: boolean) =>
    `w-5 h-5 rounded-full text-xs flex items-center justify-center ${
      selected ? 'bg-stone-100 text-stone-600' : 'bg-stone-200 text-stone-400'
    }`
  return (
    <div className="flex gap-1 p-1 bg-stone-100 rounded-xl h-11">
      <button onClick={() => onChange('active')} className={pill(tab === 'active')}>
        開課中<span className={badge(tab === 'active')}>{activeCount}</span>
      </button>
      <button onClick={() => onChange('ended')} className={pill(tab === 'ended')}>
        已結束<span className={badge(tab === 'ended')}>{endedCount}</span>
      </button>
    </div>
  )
}

/* ---------- 進度條（出現時由左至右漸長） ---------- */

export function AnimatedProgressBar({ percent }: { percent: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.max(0, Math.min(100, percent))), 80)
    return () => clearTimeout(t)
  }, [percent])
  return (
    <div className="w-full h-[6px] bg-stone-200 rounded-full overflow-hidden">
      <div className="h-full bg-orange-500 rounded-full transition-[width] duration-700 ease-out" style={{ width: `${width}%` }} />
    </div>
  )
}

/* ---------- 課程卡片 ---------- */

type InstructorCourseCardProps = {
  title: string
  date: string
  timeStart?: string
  timeEnd?: string
  location: string
  ended: boolean
  registered?: number
  maxSeats?: number
  onEdit: () => void
  onRoster: () => void
  onPoster?: () => void
  onAttendance?: () => void
  onCopy?: () => void
  onReport?: () => void
  reportStatus?: 'due' | 'submitted' | 'overdue'
}

export function InstructorCourseCard({
  title, date, timeStart, timeEnd, location, ended,
  registered = 0, maxSeats = 0, onEdit, onRoster, onPoster, onAttendance, onCopy, onReport, reportStatus,
}: InstructorCourseCardProps) {
  const percent = maxSeats > 0 ? Math.round((registered / maxSeats) * 100) : 0
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-4 w-full">
      <p className="font-bold text-base text-stone-800 leading-6">{title}</p>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 text-sm text-stone-600">
          <ClockIcon className="text-orange-500 shrink-0" />
          <span>{date}{timeStart ? ` · ${timeStart}-${timeEnd}` : ''}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-stone-600">
          <PinIcon className="text-orange-500 shrink-0" />
          <span>{location}</span>
        </div>
      </div>

      {!ended && (
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 font-medium">
              <span className="text-stone-600">已報名</span>
              <span className="text-orange-600">{registered}</span>
              <span className="text-stone-600">/</span>
              <span className="text-stone-600">{maxSeats}</span>
            </span>
            <span className="text-stone-400">{percent}%</span>
          </div>
          <AnimatedProgressBar percent={percent} />
        </div>
      )}

      <div className="h-px bg-stone-200 w-full" />

      {!ended ? (
        <div className="flex gap-1 w-full">
          <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 rounded-md transition-colors">
            <EditIcon className="text-white" />編輯課程
          </button>
          <button onClick={onRoster} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-xs font-medium py-2 rounded-md transition-colors">
            <ListIcon />報名紀錄
          </button>
          <button onClick={onPoster} className="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-stone-50 border border-stone-300 text-stone-600 text-xs font-medium py-2 rounded-md transition-colors">
            <PosterIcon />製作海報
          </button>
        </div>
      ) : (
        <div className="flex gap-2 w-full">
          <button onClick={onAttendance} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 rounded-md transition-colors">
            <CheckSquareIcon className="text-white" />出席紀錄
          </button>
          <button onClick={onCopy} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-xs font-medium py-2 rounded-md transition-colors">
            <CopyIcon />複製課程
          </button>
          {onReport && (
            <button onClick={onReport} className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-md transition-colors ${
              reportStatus === 'overdue'
                ? 'bg-red-50 hover:bg-red-100 border border-red-300 text-red-600'
                : 'bg-white hover:bg-stone-50 border border-stone-300 text-stone-600'
            }`}>
              <ReportIcon />
              {reportStatus === 'submitted' ? '查看成果報告' : reportStatus === 'overdue' ? '成果報告（已逾期）' : '填寫成果報告'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- 已結束課程的月份篩選列 ---------- */

export function InstructorMonthFilter({
  months, value, onChange, sortOrder, onToggleSort,
}: {
  months: string[]; value: string; onChange: (v: string) => void
  sortOrder: 'asc' | 'desc'; onToggleSort: () => void
}) {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1 min-w-0">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-stone-200 rounded-lg pl-3 pr-9 h-9 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="">全部月份</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
      </div>
      <button
        onClick={onToggleSort}
        className="shrink-0 w-9 h-9 flex items-center justify-center bg-white border border-stone-200 rounded-lg text-stone-500 hover:bg-stone-50 transition-colors"
        aria-label={sortOrder === 'desc' ? '目前新到舊，點擊切換為舊到新' : '目前舊到新，點擊切換為新到舊'}
        title={sortOrder === 'desc' ? '新到舊' : '舊到新'}
      >
        <SortIcon />
      </button>
    </div>
  )
}

/* ---------- 個人資料編輯彈窗 ---------- */

type ProfileFormState = { bio: string; avatar_url: string; phone: string; line_id: string }

export function InstructorProfileEditModal({
  name, form, saving, onChange, onUpload, onSubmit, onClose, onLogout,
}: {
  name?: string
  form: ProfileFormState
  saving: boolean
  onChange: (next: ProfileFormState) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  onLogout: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={onSubmit} className="relative bg-white border border-stone-200 rounded-2xl w-full max-w-[346px] max-h-[90vh] overflow-y-auto flex flex-col items-center gap-4 pt-8 pb-4 px-4">
        <button type="button" onClick={onClose} className="absolute top-2.5 right-3 bg-white border border-stone-200 rounded-full p-1.5 hover:bg-stone-50 transition-colors" aria-label="關閉">
          <CloseIcon className="text-stone-600" />
        </button>

        <div className="border-b border-stone-100 pb-4 w-full flex flex-col items-center">
          <p className="font-medium text-lg leading-7 text-stone-600">編輯個人資料</p>
        </div>

        <div className="relative w-[100px] h-[100px] shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="大頭照" className="w-full h-full object-cover" />
            ) : (
              <span className="text-orange-600 font-bold text-3xl">{name?.[0]}</span>
            )}
          </div>
          <label className="absolute right-0 bottom-[6px] bg-orange-500 hover:bg-orange-600 rounded-full p-[7px] cursor-pointer transition-colors">
            <CameraIcon className="text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        </div>

        <div className="flex flex-col gap-2 items-start w-full">
          <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
            <span className="text-red-500 text-xs leading-none">*</span>姓名
          </label>
          <input readOnly value={name || ''} className="w-full bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 cursor-default focus:outline-none" />
        </div>

        <div className="flex flex-col gap-4 items-start w-full">
          <div className="flex flex-col gap-2 items-start w-full">
            <label className="text-sm font-medium text-stone-600">簡介</label>
            <textarea
              value={form.bio} onChange={e => onChange({ ...form, bio: e.target.value })}
              placeholder="簡短介紹自己"
              className="w-full h-20 bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div className="flex flex-col gap-2 items-start w-full">
            <label className="text-sm font-medium text-stone-600">聯絡電話</label>
            <input
              value={form.phone} onChange={e => onChange({ ...form, phone: e.target.value })}
              placeholder="0912-345-678"
              className="w-full bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
          <div className="flex flex-col gap-2 items-start w-full">
            <label className="text-sm font-medium text-stone-600">LINE ID 或課程群組連結</label>
            <input
              value={form.line_id} onChange={e => onChange({ ...form, line_id: e.target.value })}
              placeholder="https://line.me/..."
              className="w-full bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-2.5 rounded-lg text-base transition-colors">
          {saving ? '儲存中...' : '儲存個人資料'}
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-red-600 hover:border-red-200 font-medium py-2.5 rounded-lg text-base transition-colors"
        >
          登出
        </button>
      </form>
    </div>
  )
}
