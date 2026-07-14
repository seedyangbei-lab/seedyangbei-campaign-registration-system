'use client'

/* ---------- Icons ---------- */

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
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

export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
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

/* ---------- 統計卡片（漸層 stroke，用 padding-1 + 漸層底色包一層做出來） ---------- */

export function StatCard({ label, value, desc }: { label: string; value: string | number; desc: string }) {
  return (
    <div className="stat-card-flow-border rounded-lg shrink-0 w-[222px] h-[120px]">
      <div className="relative z-10 bg-white border border-[#ffcead]/50 rounded-lg shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)] w-full h-full p-4 flex flex-col justify-center gap-1">
        <p className="text-[#575350] text-xs font-medium leading-tight">{label}</p>
        <p className="text-[#EA5808] text-[32px] font-semibold leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</p>
        <p className="text-[#787168] text-xs">{desc}</p>
      </div>
    </div>
  )
}

/* ---------- Badge：來源 ---------- */

export function SourceBadge({ source }: { source: 'instructor' | 'system' }) {
  return source === 'instructor' ? (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap bg-blue-50 text-blue-600">講師回報</span>
  ) : (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap bg-green-50 text-green-700">系統偵測</span>
  )
}

/* ---------- Badge：問題類型（講師回報用） ---------- */

const ISSUE_TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  '頁面顯示異常': { label: '畫面顯示錯誤', cls: 'bg-blue-50 text-blue-600' },
  '功能無法使用': { label: '操作異常', cls: 'bg-violet-50 text-violet-600' },
  '資料錯誤': { label: '課程資料有誤', cls: 'bg-rose-50 text-rose-600' },
  '其他': { label: '其他', cls: 'bg-stone-100 text-stone-600' },
}

export function IssueTypeBadge({ issueType }: { issueType: string }) {
  const s = ISSUE_TYPE_STYLE[issueType] || { label: issueType, cls: 'bg-stone-100 text-stone-600' }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

/* ---------- Badge：異常類型（系統偵測用） ---------- */

const ANOMALY_TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  register_error: { label: '報名異常', cls: 'bg-red-50 text-red-600' },
  register_guard_fail: { label: '課程資訊遺失', cls: 'bg-amber-50 text-amber-600' },
  line_login_fail: { label: 'LINE登入失敗', cls: 'bg-cyan-50 text-cyan-600' },
}

export function AnomalyTypeBadge({ step }: { step: string }) {
  const s = ANOMALY_TYPE_STYLE[step] || { label: step, cls: 'bg-stone-100 text-stone-600' }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

/* ---------- Badge：處理狀態（講師回報用，可切換） ---------- */

export const INSTRUCTOR_STATUS_OPTIONS = [
  { value: 'pending', label: '待處理', cls: 'bg-orange-50 text-orange-600' },
  { value: 'in_progress', label: '處理中', cls: 'bg-blue-50 text-blue-600' },
  { value: 'resolved', label: '已解決', cls: 'bg-green-50 text-green-700' },
]

export function InstructorStatusBadge({ status }: { status: string }) {
  const s = INSTRUCTOR_STATUS_OPTIONS.find(o => o.value === status) || INSTRUCTOR_STATUS_OPTIONS[0]
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

/* ---------- Badge：系統偵測狀態（依事件新舊自動判斷，24hr 內＝需關注） ---------- */

export function SystemStatusBadge({ createdAt }: { createdAt: string }) {
  const isRecent = Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000
  return isRecent ? (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap bg-amber-100 text-amber-700">需關注</span>
  ) : (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap bg-stone-100 text-stone-500">已記錄</span>
  )
}

/* ---------- 下拉篩選（sm, filled） ---------- */

export function FilterSelect({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <div className="relative w-[200px] shrink-0">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg pl-3 pr-8 h-8 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
      >
        <option value="">{placeholder}：全部</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
    </div>
  )
}

/* ---------- 每頁筆數 ---------- */

export function PerPageSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative w-[110px] shrink-0">
      <select
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full appearance-none bg-white border border-stone-200 rounded-lg pl-3 pr-8 h-9 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
      >
        {[10, 20, 50].map(n => <option key={n} value={n}>每頁 {n} 筆</option>)}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
    </div>
  )
}

/* ---------- 分頁控制（上一頁／頁碼／.../下一頁） ---------- */

function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: (number | 'ellipsis')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push('ellipsis')
    result.push(p)
  })
  return result
}

export function PaginationBar({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  const pages = buildPageList(page, totalPages)
  const btnBase = 'w-9 h-9 flex items-center justify-center rounded-md text-sm font-medium transition-colors'
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className={`${btnBase} border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-transparent`}
        aria-label="上一頁"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="w-9 h-9 flex items-center justify-center text-stone-400 text-sm">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`${btnBase} ${p === page ? 'bg-orange-500 text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className={`${btnBase} border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-transparent`}
        aria-label="下一頁"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  )
}
