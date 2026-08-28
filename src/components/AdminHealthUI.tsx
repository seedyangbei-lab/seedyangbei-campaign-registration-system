'use client'

import type { CSSProperties } from 'react'

/* ---------- Icons ---------- */

export function ArrowRightIcon({ className, style, size = 16 }: { className?: string; style?: CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function ArrowLeftIcon({ className, style, size = 16 }: { className?: string; style?: CSSProperties; size?: number }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
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
    <div className="stat-card-flow-border rounded-lg w-full min-w-0 h-[120px]">
      <div className="relative z-10 bg-white border border-[#ffcead]/50 rounded-lg shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)] w-full h-full p-4 flex flex-col justify-center gap-1 min-w-0">
        <p className="text-[#575350] text-xs font-medium leading-tight truncate">{label}</p>
        <p className="text-[#EA5808] text-[32px] font-semibold leading-none" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</p>
        <p className="text-[#787168] text-xs truncate">{desc}</p>
      </div>
    </div>
  )
}

/* ---------- 漏斗統計卡片（手機版精簡版：小卡片 + 換行流動箭頭） ---------- */

export function MobileFunnelCard({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  if (highlight) {
    return (
      <div className="w-full bg-white border border-orange-500 rounded-lg shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)] flex items-center justify-center gap-1 px-2 py-2.5">
        <span className="text-[10px] leading-[15px] text-stone-600 tracking-[0.5px] whitespace-nowrap">{label}</span>
        <span className="text-[18px] leading-7 font-medium text-orange-600" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</span>
      </div>
    )
  }
  return (
    <div className="w-full min-w-0 h-20 bg-white border border-[#ffcead] rounded-lg shadow-[0px_4px_12px_0px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center gap-1 px-1 py-2">
      <span className="text-[10px] leading-[15px] text-stone-600 text-center tracking-[0.5px]">{label}</span>
      <span className="text-[18px] leading-7 font-medium text-orange-600" style={{ fontFamily: 'Inter, sans-serif' }}>{value}</span>
    </div>
  )
}

export function MobileFunnelArrow({ delay = 0 }: { delay?: number }) {
  return (
    <div className="shrink-0 flex items-center justify-center w-3">
      <ArrowRightIcon size={12} className="funnel-arrow-flow" style={{ animationDelay: `${delay}s` }} />
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
  '功能許願': { label: '功能許願', cls: 'bg-amber-50 text-amber-700' },
  '其他': { label: '其他', cls: 'bg-stone-100 text-stone-600' },
}

export function IssueTypeBadge({ issueType }: { issueType: string }) {
  const s = ISSUE_TYPE_STYLE[issueType] || { label: issueType, cls: 'bg-stone-100 text-stone-600' }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

/* ---------- Badge：異常類型（系統偵測用） ---------- */

export const SYSTEM_ISSUE_STEPS = ['register_error', 'register_guard_fail', 'line_login_fail']

// line_login_fail 這個 step 底下混了三種完全不同的人：居民報名登入、講師點邀請連結綁定、
// 講師登入中台。光看 step 分不出來，要進一步看 detail 裡的 stage / flow 才能區分是誰卡住
export function getAnomalySubtype(step: string, detail: any): string {
  if (step !== 'line_login_fail') return step
  const stage = detail?.stage
  if (stage === 'instructor_claim_token_mismatch' || stage === 'instructor_claim_bind_error') {
    return 'line_login_fail_instructor_claim'
  }
  const flow = detail?.flow
  if (flow === 'instructor_claim') return 'line_login_fail_instructor_claim'
  if (flow === 'instructor_login') return 'line_login_fail_instructor_login'
  if (flow === 'resident_register') return 'line_login_fail_resident_register'
  if (flow === 'resident_general') return 'line_login_fail_resident_general'
  // 舊資料（補這個欄位之前留下的紀錄）沒有 flow，一律當「居民登入失敗（一般）」處理
  return 'line_login_fail_resident_general'
}

const ANOMALY_TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  register_error: { label: '報名異常', cls: 'bg-red-50 text-red-600' },
  register_guard_fail: { label: '課程資訊遺失', cls: 'bg-amber-50 text-amber-600' },
  line_login_fail_resident_register: { label: '居民報名登入失敗', cls: 'bg-cyan-50 text-cyan-600' },
  line_login_fail_resident_general: { label: '居民登入失敗', cls: 'bg-teal-50 text-teal-600' },
  line_login_fail_instructor_claim: { label: '講師綁定失敗', cls: 'bg-purple-50 text-purple-600' },
  line_login_fail_instructor_login: { label: '講師登入失敗', cls: 'bg-indigo-50 text-indigo-600' },
}

export function AnomalyTypeBadge({ step, detail }: { step: string; detail?: any }) {
  const key = getAnomalySubtype(step, detail)
  const s = ANOMALY_TYPE_STYLE[key] || { label: step, cls: 'bg-stone-100 text-stone-600' }
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

/* ---------- 嚴重度判斷 + 白話說明（系統偵測用）----------
   目的：後臺看到的三種系統偵測事件，不是每一種都代表「報名資料真的出問題」。
   register_error 是報名寫入資料庫失敗，才是真的要處理；其餘兩種發生在寫入資料庫「之前」，
   使用者多半重試就會成功，不該跟 register_error 用同一種急迫程度呈現，
   否則後臺會一直顯示一堆「其實沒事」的紅色警示，反而讓真正該處理的事件被淹沒。 */

export type AnomalySeverity = 'critical' | 'info'

export function getAnomalySeverity(step: string, detail: any): AnomalySeverity {
  if (step === 'register_error') return 'critical'
  if (step === 'line_login_fail') {
    const stage = detail?.stage
    if (stage === 'instructor_claim_bind_error' || stage === 'unexpected') return 'critical'
  }
  return 'info'
}

export const SEVERITY_OPTIONS = [
  { value: 'critical', label: '建議關注' },
  { value: 'info', label: '系統已攔截' },
]

export function SeverityTag({ severity }: { severity: AnomalySeverity }) {
  return severity === 'critical' ? (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap bg-red-50 text-red-600">建議關注</span>
  ) : (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap bg-stone-100 text-stone-500">系統已攔截</span>
  )
}

// 把 detail 這包英數字 JSON 翻成白話文，讓後臺不用把內容複製出去問工程師才知道發生什麼事
export function explainAnomaly(step: string, detail: any): string {
  if (step === 'register_error') {
    return `報名資料寫入失敗，錯誤訊息：${detail?.message || '未知'}。這代表使用者送出報名時真的沒有寫入成功，建議盡快確認、必要時為居民補登報名。`
  }
  if (step === 'register_guard_fail') {
    return '使用者進入報名頁時沒有攜帶課程資訊（常見於直接打開舊連結、書籤，或分享出去的網址沒帶課程參數），系統已攔截並導回首頁，不會造成報名資料遺失，使用者重新選課即可。'
  }
  if (step === 'line_login_fail') {
    const stage = detail?.stage
    const reason = detail?.reason
    if (stage === 'token_exchange') {
      return 'LINE 登入授權碼已失效或被重複使用，常見於連結被重新整理、或瀏覽器（尤其 LINE 內建瀏覽器）重複送出請求，使用者通常只要重新登入一次即可成功，非系統故障。'
    }
    if (stage === 'profile_fetch') {
      return '已取得 LINE 授權，但讀取會員資料失敗，通常是 LINE 那端暫時性問題，使用者重新登入通常可解決。'
    }
    if (stage === 'instructor_claim_token_mismatch') {
      if (reason === 'claim_token_expired') return '講師的邀請連結已超過 7 天效期，請至講師管理重新產生一份新的邀請連結給講師。'
      return '講師點擊了已失效／被取代的邀請連結（通常是後台重新產生新連結後，舊連結就跟著失效），請重新產生最新的邀請連結給講師。'
    }
    if (stage === 'instructor_claim_bind_error') {
      return `這個 LINE 帳號已經綁定在「另一位」講師資料上，可能是同一個人建了兩筆講師資料。需要人工確認是否要合併或刪除重複的講師資料。（詳細原因：${reason || '未知'}）`
    }
    if (stage === 'unexpected') {
      return `登入流程發生非預期的系統錯誤：${reason || '未知'}，建議直接請工程端確認，可能是程式本身的問題。`
    }
    return `LINE 登入失敗，原因：${reason || '未知'}。`
  }
  return ''
}

/* ---------- Badge：處理狀態（講師回報／系統偵測共用，可切換） ---------- */

export const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理', cls: 'bg-orange-50 text-orange-600' },
  { value: 'in_progress', label: '處理中', cls: 'bg-blue-50 text-blue-600' },
  { value: 'resolved', label: '已解決', cls: 'bg-green-50 text-green-700' },
]

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0]
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

/* ---------- 下拉篩選（sm, filled） ---------- */

export function FilterSelect({
  value, onChange, options, placeholder, className,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string; className?: string }) {
  return (
    <div className={className || "relative w-[200px] shrink-0"}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-stone-200 rounded-md pl-2 pr-7 h-8 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-xs text-stone-500 whitespace-nowrap">每頁</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="appearance-none bg-white border border-stone-200 rounded-md pl-2 pr-6 h-8 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-400" />
      </div>
      <span className="text-xs text-stone-500 whitespace-nowrap">筆</span>
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
