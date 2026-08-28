'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import {
  ArrowRightIcon, ArrowLeftIcon, CopyIcon, CloseIcon, StatCard,
  SourceBadge, IssueTypeBadge, AnomalyTypeBadge, StatusBadge, getAnomalySubtype,
  STATUS_OPTIONS, SYSTEM_ISSUE_STEPS, FilterSelect, PerPageSelect, PaginationBar,
  MobileFunnelCard, MobileFunnelArrow, SeverityTag, getAnomalySeverity, explainAnomaly,
} from '@/components/AdminHealthUI'

type FunnelLog = {
  id: string
  session_id: string
  step: string
  course_ids: string | null
  detail: any
  created_at: string
  status: string
}

type IssueReport = {
  id: string
  instructor_id: string | null
  issue_type: string
  description: string
  screenshot_urls: string[] | null
  status: string
  created_at: string
  instructors?: { name: string } | null
}

type HealthRow =
  | { source: 'instructor'; id: string; createdAt: string; data: IssueReport }
  | { source: 'system'; id: string; createdAt: string; data: FunnelLog }

const STEP_LABELS: Record<string, string> = {
  select_course: '選擇課程',
  line_redirect: '導向 LINE 登入',
  line_callback: 'LINE 登入成功',
  register_submit: '送出報名',
  register_success: '報名成功',
  register_guard_fail: '課程資訊遺失',
  register_error: '報名異常',
  line_login_fail: 'LINE登入失敗',
}

const FUNNEL_CARDS = [
  { step: 'select_course', desc: '居民點擊選課' },
  { step: 'line_redirect', desc: '導向 LINE 授權' },
  { step: 'line_callback', desc: '取得使用者資料' },
  { step: 'register_submit', desc: '填完表單送出' },
  { step: 'register_success', desc: '完整完成流程' },
]

const RANGE_OPTIONS = [
  { label: '今天', days: 1 },
  { label: '近 7 天', days: 7 },
  { label: '近 30 天', days: 30 },
]

const TYPE_OPTIONS = [
  { value: '頁面顯示異常', label: '畫面顯示錯誤' },
  { value: '功能無法使用', label: '操作異常' },
  { value: '資料錯誤', label: '課程資料有誤' },
  { value: '功能許願', label: '功能許願（講師回報）' },
  { value: '其他', label: '其他（講師回報）' },
  { value: 'register_error', label: '報名異常' },
  { value: 'register_guard_fail', label: '課程資訊遺失' },
  { value: 'line_login_fail_resident_register', label: '居民報名登入失敗' },
  { value: 'line_login_fail_resident_general', label: '居民登入失敗' },
  { value: 'line_login_fail_instructor_claim', label: '講師綁定失敗' },
  { value: 'line_login_fail_instructor_login', label: '講師登入失敗' },
]

export default function SystemHealthPage() {
  const supabase = createClient()
  const [funnelLogs, setFunnelLogs] = useState<FunnelLog[]>([])
  const [issueReports, setIssueReports] = useState<IssueReport[]>([])
  const [rangeDays, setRangeDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [funnelError, setFunnelError] = useState<string | null>(null)
  const [issueError, setIssueError] = useState<string | null>(null)

  const [sourceFilter, setSourceFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [detailTarget, setDetailTarget] = useState<HealthRow | null>(null)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [zoomImage, setZoomImage] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [rangeDays])
  useEffect(() => { setPage(1) }, [sourceFilter, statusFilter, typeFilter, rangeDays])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(t)
  }, [toast])

  // 詳情頁 / 截圖放大時鎖定整體頁面捲動（手機版全螢幕頁面體驗）
  useEffect(() => {
    if (!detailTarget && !zoomImage) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [detailTarget, zoomImage])

  useEffect(() => {
    setPendingStatus(detailTarget ? detailTarget.data.status : null)
  }, [detailTarget])

  const fetchData = async () => {
    setLoading(true)
    setFunnelError(null)
    setIssueError(null)
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
    // 兩張表分開處理錯誤：其中一張讀取失敗（例如 issue_reports 還沒建表）不會讓另一張跟著整頁掛掉
    const [funnelRes, issueRes] = await Promise.all([
      supabase.from('funnel_logs').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(3000),
      supabase.from('issue_reports').select('*, instructors(name)').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
    ])
    if (funnelRes.error) {
      console.error('funnel_logs fetch error:', funnelRes.error)
      setFunnelError(funnelRes.error.message)
      setFunnelLogs([])
    } else {
      setFunnelLogs(funnelRes.data || [])
    }
    if (issueRes.error) {
      console.error('issue_reports fetch error:', issueRes.error)
      setIssueError(issueRes.error.message)
      setIssueReports([])
    } else {
      setIssueReports((issueRes.data as any) || [])
    }
    setLoading(false)
  }

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const log of funnelLogs) counts[log.step] = (counts[log.step] || 0) + 1
    return counts
  }, [funnelLogs])

  const combinedRows: HealthRow[] = useMemo(() => {
    const instructorRows: HealthRow[] = issueReports.map(r => ({ source: 'instructor', id: r.id, createdAt: r.created_at, data: r }))
    const systemRows: HealthRow[] = funnelLogs
      .filter(l => SYSTEM_ISSUE_STEPS.includes(l.step))
      .map(l => ({ source: 'system', id: l.id, createdAt: l.created_at, data: l }))
    return [...instructorRows, ...systemRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [issueReports, funnelLogs])

  const filteredRows = useMemo(() => combinedRows.filter(row => {
    if (sourceFilter && row.source !== sourceFilter) return false
    if (statusFilter && row.data.status !== statusFilter) return false
    if (typeFilter) {
      if (row.source === 'instructor') {
        if (row.data.issue_type !== typeFilter) return false
      } else {
        if (getAnomalySubtype(row.data.step, row.data.detail) !== typeFilter) return false
      }
    }
    return true
  }), [combinedRows, sourceFilter, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)

  const formatDT = (ts: string) => {
    const d = new Date(ts)
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const handleCopyDetail = (row: FunnelLog) => {
    navigator.clipboard.writeText(JSON.stringify({ step: row.step, course_ids: row.course_ids, detail: row.detail, created_at: row.created_at }, null, 2))
    setToast('已複製事件詳細內容')
  }

  const handleConfirmStatus = async () => {
    if (!detailTarget || pendingStatus === null || pendingStatus === detailTarget.data.status) {
      setDetailTarget(null)
      return
    }
    setStatusSaving(true)
    // 用 .select() 拿回實際被更新的那一列：若 RLS 政策擋掉寫入，Supabase 不會回傳 error，
    // 但實際受影響筆數會是 0，這裡要能分辨「寫入成功」跟「靜默失敗」，避免畫面顯示假的已儲存狀態
    const table = detailTarget.source === 'instructor' ? 'issue_reports' : 'funnel_logs'
    const { data, error } = await supabase.from(table).update({ status: pendingStatus }).eq('id', detailTarget.id).select('id')
    const succeeded = !error && (data?.length || 0) > 0
    if (succeeded) {
      if (detailTarget.source === 'instructor') {
        setIssueReports(prev => prev.map(r => r.id === detailTarget.id ? { ...r, status: pendingStatus } : r))
      } else {
        setFunnelLogs(prev => prev.map(r => r.id === detailTarget.id ? { ...r, status: pendingStatus } : r))
      }
      setToast('狀態已更新')
    } else {
      console.error('狀態更新失敗:', error || '受影響筆數為 0，可能是 RLS 政策擋掉寫入')
      setToast('狀態更新失敗，請稍後再試')
    }
    setStatusSaving(false)
    setDetailTarget(null)
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-4">
        <h2 className="text-stone-800 text-2xl font-bold">系統健康</h2>
        <p className="text-stone-400 mt-1 text-sm">追蹤系統狀態與異常回報，每走完一步，離穩定更進一步</p>
      </div>
      <div className="border-b border-[#E7E5E4] mb-4" />
      <div className="flex items-center gap-2 mb-6">
        {RANGE_OPTIONS.map(opt => {
          const selected = rangeDays === opt.days
          return (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`flex-1 md:flex-none h-8 md:h-auto md:p-2 px-2 flex items-center justify-center rounded-md text-xs font-medium leading-4 transition-colors ${
                selected ? 'bg-orange-500 text-white' : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {(funnelError || issueError) && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm space-y-1">
          {funnelError && <p><span className="font-medium">funnel_logs 讀取失敗：</span>{funnelError}</p>}
          {issueError && (
            <p>
              <span className="font-medium">issue_reports 讀取失敗：</span>{issueError}
              {' '}（若訊息包含 relation ... does not exist，代表 sql/2026-07-14_issue_reports.sql 這份遷移還沒在 Supabase SQL Editor 執行過）
            </p>
          )}
        </div>
      )}

      {/* 報名流程統計卡片 + 步驟箭頭：桌面版 5 張卡片等分寬度，箭頭獨立佔一欄，卡片不會被撐出區域 */}
      <div
        className="hidden md:grid gap-2 mb-8"
        style={{ gridTemplateColumns: Array(FUNNEL_CARDS.length).fill('minmax(0, 1fr)').join(' 20px ') }}
      >
        {FUNNEL_CARDS.map((c, i) => (
          <Fragment key={c.step}>
            <StatCard label={STEP_LABELS[c.step]} value={loading ? '···' : (stepCounts[c.step] || 0)} desc={c.desc} />
            {i < FUNNEL_CARDS.length - 1 && (
              <div className="flex items-center justify-center">
                <ArrowRightIcon className="funnel-arrow-flow" style={{ animationDelay: `${i * 0.18}s` }} />
              </div>
            )}
          </Fragment>
        ))}
      </div>

      {/* 手機版：固定「上面四個、下面一個」兩列排版，不依賴視窗寬度自動換行 */}
      <div className="md:hidden bg-gradient-to-b from-white to-[#ffe2cd] border border-[#ffe2cd] rounded-[10px] p-2 flex flex-col gap-2 mb-8">
        <div
          className="grid gap-1 items-center"
          style={{ gridTemplateColumns: Array(4).fill('minmax(0, 1fr)').join(' 12px ') }}
        >
          {FUNNEL_CARDS.slice(0, 4).map((c, i) => (
            <Fragment key={c.step}>
              <MobileFunnelCard label={STEP_LABELS[c.step]} value={loading ? '···' : (stepCounts[c.step] || 0)} />
              {i < 3 && <MobileFunnelArrow delay={i * 0.18} />}
            </Fragment>
          ))}
        </div>
        <MobileFunnelCard
          label={STEP_LABELS[FUNNEL_CARDS[4].step]}
          value={loading ? '···' : (stepCounts[FUNNEL_CARDS[4].step] || 0)}
          highlight
        />
      </div>

      {/* 系統狀態與回報 */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div
          className="px-6 h-16 border-b border-stone-200 flex items-center gap-2 shrink-0"
          style={{ background: 'linear-gradient(90deg, #FFF3E9 0%, #FFFFFF 100%)' }}
        >
          <h3 className="text-stone-800" style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 400 }}>系統狀態與回報</h3>
        </div>

        {/* 篩選列：來源／狀態／類型 + 每頁筆數，同一列 */}
        <div className="px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="grid grid-cols-3 gap-2 md:flex md:items-center md:gap-2 md:flex-wrap">
            <FilterSelect value={sourceFilter} onChange={setSourceFilter} placeholder="來源" options={[{ value: 'instructor', label: '講師回報' }, { value: 'system', label: '系統偵測' }]} className="relative w-full md:w-[200px] shrink-0" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="狀態" options={STATUS_OPTIONS} className="relative w-full md:w-[200px] shrink-0" />
            <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="類型" options={TYPE_OPTIONS} className="relative w-full md:w-[200px] shrink-0" />
          </div>
          <div className="hidden md:block">
            <PerPageSelect value={pageSize} onChange={v => { setPageSize(v); setPage(1) }} />
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-stone-400 text-sm">讀取中...</div>
        ) : paginatedRows.length === 0 ? (
          <div className="px-6 py-10 text-center text-stone-400 text-sm">這段期間沒有符合條件的資料，狀況良好。</div>
        ) : (
          <>
            {/* 桌面版：表格 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '40px' }} /><col style={{ width: '90px' }} /><col style={{ width: '120px' }} />
                  <col style={{ width: '100px' }} /><col style={{ width: '150px' }} /><col />
                  <col style={{ width: '80px' }} /><col style={{ width: '112px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-stone-50 text-stone-500 text-xs">
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">#</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">來源</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">時間</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">類型</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">課程名稱</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">詳細資訊</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">狀態</th>
                    <th className="text-left font-medium px-2 py-3 overflow-hidden">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDEB]">
                  {paginatedRows.map((row, i) => (
                    <tr key={`${row.source}-${row.id}`} className="h-[63px]">
                      <td className="px-2 py-4 text-stone-400 text-xs overflow-hidden">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-2 py-4 overflow-hidden"><SourceBadge source={row.source} /></td>
                      <td className="px-2 py-4 text-stone-400 text-xs whitespace-nowrap overflow-hidden">{formatDT(row.createdAt)}</td>
                      <td className="px-2 py-4 overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.source === 'instructor' ? <IssueTypeBadge issueType={row.data.issue_type} /> : (
                            <>
                              <AnomalyTypeBadge step={row.data.step} detail={row.data.detail} />
                              <SeverityTag severity={getAnomalySeverity(row.data.step, row.data.detail)} />
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-stone-600 text-xs truncate overflow-hidden">
                        {row.source === 'instructor' ? (row.data.instructors?.name ? `講師：${row.data.instructors.name}` : '—') : (row.data.course_ids || '—')}
                      </td>
                      <td className="px-2 py-4 text-stone-500 text-xs truncate overflow-hidden" title={row.source === 'instructor' ? row.data.description : explainAnomaly(row.data.step, row.data.detail)}>
                        {row.source === 'instructor' ? row.data.description : explainAnomaly(row.data.step, row.data.detail)}
                      </td>
                      <td className="px-2 py-4 overflow-hidden">
                        <StatusBadge status={row.data.status} />
                      </td>
                      <td className="px-2 py-4 overflow-hidden">
                        <button
                          onClick={() => setDetailTarget(row)}
                          className="w-full flex items-center justify-center text-xs border border-stone-300 text-stone-600 hover:bg-stone-50 px-2 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap"
                        >
                          查看詳情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 手機版：卡片列表 */}
            <div className="md:hidden flex flex-col gap-3 px-4 py-4">
              {paginatedRows.map(row => (
                <div key={`${row.source}-${row.id}`} className="bg-white border border-stone-200 rounded-xl px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <SourceBadge source={row.source} />
                    <span className="text-xs text-stone-400">{formatDT(row.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {row.source === 'instructor' ? (
                      <>
                        <IssueTypeBadge issueType={row.data.issue_type} />
                        <span className="text-xs font-medium text-stone-800 truncate">
                          {row.data.instructors?.name ? `講師：${row.data.instructors.name}` : '—'}
                        </span>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <AnomalyTypeBadge step={row.data.step} detail={row.data.detail} />
                        <SeverityTag severity={getAnomalySeverity(row.data.step, row.data.detail)} />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 truncate">
                    {row.source === 'instructor' ? row.data.description : explainAnomaly(row.data.step, row.data.detail)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-600">狀態</span>
                    <StatusBadge status={row.data.status} />
                  </div>
                  <button
                    onClick={() => setDetailTarget(row)}
                    className="w-full h-8 flex items-center justify-center text-xs border border-stone-300 text-stone-600 rounded-md font-medium transition-colors"
                  >
                    查看詳情
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filteredRows.length > 0 && (
          <div className="px-6 border-t border-stone-100 flex items-center justify-center" style={{ height: '60px' }}>
            <PaginationBar page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-[60]">
          {toast}
        </div>
      )}

      {/* 查看詳情彈窗（桌面版，講師回報／系統偵測共用，可切換處理狀態） */}
      {detailTarget && (
        <div className="hidden md:flex fixed inset-0 bg-black/40 z-50 items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setDetailTarget(null) }}>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h3 className="text-stone-800 font-bold text-lg">{detailTarget.source === 'instructor' ? '問題回報詳情' : '系統事件詳情'}</h3>
              <button onClick={() => setDetailTarget(null)} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors" aria-label="關閉">
                <CloseIcon className="text-stone-600" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                {detailTarget.source === 'instructor' ? <IssueTypeBadge issueType={detailTarget.data.issue_type} /> : (
                  <>
                    <AnomalyTypeBadge step={detailTarget.data.step} detail={detailTarget.data.detail} />
                    <SeverityTag severity={getAnomalySeverity(detailTarget.data.step, detailTarget.data.detail)} />
                  </>
                )}
                <span className="text-xs text-stone-400">{formatDT(detailTarget.createdAt)}</span>
                {detailTarget.source === 'instructor' && detailTarget.data.instructors?.name && <span className="text-xs text-stone-400">・講師：{detailTarget.data.instructors.name}</span>}
              </div>

              {detailTarget.source === 'instructor' ? (
                <div>
                  <p className="text-sm font-medium text-stone-600 mb-1.5">問題描述</p>
                  <p className="text-sm text-stone-700 whitespace-pre-wrap bg-stone-50 rounded-xl p-3">{detailTarget.data.description}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-stone-600 mb-1.5">系統判讀</p>
                    <p className="text-sm text-stone-700 leading-relaxed bg-orange-50 border border-orange-100 rounded-xl p-3">
                      {explainAnomaly(detailTarget.data.step, detailTarget.data.detail)}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-stone-600">原始紀錄<span className="text-xs text-stone-400 font-normal">（如需回報工程師可直接複製）</span></p>
                      <button
                        onClick={() => handleCopyDetail(detailTarget.data)}
                        className="flex items-center gap-1 text-xs bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 px-2 py-1 rounded-md font-medium transition-colors"
                      >
                        <CopyIcon />複製資訊
                      </button>
                    </div>
                    {detailTarget.data.course_ids && <p className="text-xs text-stone-500 mb-1.5">課程：{detailTarget.data.course_ids}</p>}
                    <pre className="text-xs text-stone-700 whitespace-pre-wrap break-all bg-stone-50 rounded-xl p-3 max-h-64 overflow-y-auto">
                      {detailTarget.data.detail ? JSON.stringify(detailTarget.data.detail, null, 2) : '—'}
                    </pre>
                  </div>
                </div>
              )}

              {detailTarget.source === 'instructor' && detailTarget.data.screenshot_urls && detailTarget.data.screenshot_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-stone-600 mb-1.5">截圖（{detailTarget.data.screenshot_urls.length}）</p>
                  <div className="grid grid-cols-4 gap-2">
                    {detailTarget.data.screenshot_urls.map((url, i) => (
                      <button key={url + i} type="button" onClick={() => setZoomImage(url)} className="aspect-square rounded-lg overflow-hidden border border-stone-200 block">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-stone-600 mb-1.5">處理狀態</p>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setPendingStatus(o.value)}
                      disabled={statusSaving}
                      className={`flex-1 text-sm font-medium py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                        pendingStatus === o.value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleConfirmStatus}
                disabled={statusSaving}
                className="w-full h-11 flex items-center justify-center rounded-lg bg-orange-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {statusSaving ? '儲存中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 查看詳情（手機版，全螢幕頁面樣式，底部按鈕 sticky，頁面本身不可捲動） */}
      {detailTarget && (
        <div className="md:hidden fixed inset-0 z-50 bg-white flex flex-col">
          <div className="shrink-0 h-[52px] px-4 flex items-center justify-between shadow-[0px_4px_2px_0px_rgba(0,0,0,0.03)]">
            <button onClick={() => setDetailTarget(null)} className="p-1 -ml-1" aria-label="返回">
              <ArrowLeftIcon className="text-stone-700" />
            </button>
            <p className="text-[14px] font-bold text-stone-600 tracking-[3px]">{detailTarget.source === 'instructor' ? '問題回報詳情' : '系統事件詳情'}</p>
            <div className="w-4 h-4" aria-hidden="true" />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-600">回報來源</span>
              <SourceBadge source={detailTarget.source} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-600">時間</span>
              <span className="text-sm text-stone-500">{formatDT(detailTarget.createdAt)}</span>
            </div>

            {detailTarget.source === 'instructor' ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-600">問題描述</span>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-sm text-stone-600 whitespace-pre-wrap">{detailTarget.data.description}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-600">類型</span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <AnomalyTypeBadge step={detailTarget.data.step} detail={detailTarget.data.detail} />
                    <SeverityTag severity={getAnomalySeverity(detailTarget.data.step, detailTarget.data.detail)} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-stone-600">系統判讀</span>
                  <p className="text-sm text-stone-700 leading-relaxed bg-orange-50 border border-orange-100 rounded-xl p-3">
                    {explainAnomaly(detailTarget.data.step, detailTarget.data.detail)}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-600">原始紀錄</span>
                    <button
                      onClick={() => handleCopyDetail(detailTarget.data)}
                      className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-600 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                    >
                      <CopyIcon />複製資訊
                    </button>
                  </div>
                  {detailTarget.data.course_ids && <p className="text-xs text-stone-500">課程：{detailTarget.data.course_ids}</p>}
                  <pre className="text-xs text-stone-600 whitespace-pre-wrap break-all bg-stone-50 rounded-xl p-3 max-h-64 overflow-y-auto">
                    {detailTarget.data.detail ? JSON.stringify(detailTarget.data.detail, null, 2) : '—'}
                  </pre>
                </div>
              </div>
            )}

            {detailTarget.source === 'instructor' && detailTarget.data.screenshot_urls && detailTarget.data.screenshot_urls.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-stone-600">
                  截圖上傳 <span className="text-xs text-stone-400">({detailTarget.data.screenshot_urls.length})</span>
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {detailTarget.data.screenshot_urls.map((url, i) => (
                    <button
                      key={url + i}
                      type="button"
                      onClick={() => setZoomImage(url)}
                      className="h-[100px] rounded-xl border border-stone-300 overflow-hidden"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-stone-600">處理狀態</span>
              <div className="flex gap-2 pt-1.5">
                {STATUS_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setPendingStatus(o.value)}
                    disabled={statusSaving}
                    className={`flex-1 h-11 flex items-center justify-center rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${
                      pendingStatus === o.value ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-stone-200 text-stone-500'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 p-4 rounded-t-2xl shadow-[0px_-3px_4px_0px_rgba(0,0,0,0.08)] bg-white">
            <button
              onClick={handleConfirmStatus}
              disabled={statusSaving}
              className="w-full h-[50px] flex items-center justify-center rounded-[10px] bg-orange-500 text-white text-base font-medium disabled:opacity-50"
            >
              {statusSaving ? '儲存中...' : '確認'}
            </button>
          </div>
        </div>
      )}

      {/* 截圖放大檢視（桌機／手機共用） */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            aria-label="關閉"
          >
            <CloseIcon />
          </button>
          <img src={zoomImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
