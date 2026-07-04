'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

type FunnelLog = {
  id: string
  session_id: string
  step: string
  course_ids: string | null
  detail: any
  created_at: string
}

const STEP_LABELS: Record<string, string> = {
  select_course: '選擇課程',
  line_redirect: '導向 LINE 登入',
  line_callback: 'LINE 登入成功回來',
  register_submit: '送出報名',
  register_success: '報名成功',
  register_guard_fail: '課程資訊遺失',
  register_error: '報名失敗',
}

// 正常流程步驟（依序），問題步驟另外處理
const FUNNEL_ORDER = ['select_course', 'line_redirect', 'line_callback', 'register_submit', 'register_success']
const ISSUE_STEPS = ['register_guard_fail', 'register_error']

const RANGE_OPTIONS = [
  { label: '今天', days: 1 },
  { label: '近 7 天', days: 7 },
  { label: '近 30 天', days: 30 },
]

export default function SystemHealthPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<FunnelLog[]>([])
  const [rangeDays, setRangeDays] = useState(7)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => { fetchLogs() }, [rangeDays])

  const fetchLogs = async () => {
    setLoading(true)
    setErrored(false)
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('funnel_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(3000)

    if (error) { setErrored(true); setLoading(false); return }
    setLogs(data || [])
    setLoading(false)
  }

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const log of logs) counts[log.step] = (counts[log.step] || 0) + 1
    return counts
  }, [logs])

  const maxFunnelCount = Math.max(1, ...FUNNEL_ORDER.map(s => stepCounts[s] || 0))

  const issueLogs = useMemo(
    () => logs.filter(l => ISSUE_STEPS.includes(l.step)).slice(0, 30),
    [logs]
  )

  const totalSelect = stepCounts['select_course'] || 0
  const totalSuccess = stepCounts['register_success'] || 0
  const conversionRate = totalSelect > 0 ? Math.round((totalSuccess / totalSelect) * 100) : null
  const totalIssues = ISSUE_STEPS.reduce((sum, s) => sum + (stepCounts[s] || 0), 0)

  const statCards = [
    { label: '選課次數', value: totalSelect, desc: '選擇課程並點擊前往報名', color: 'bg-orange-50 border-orange-100' },
    { label: '報名成功', value: totalSuccess, desc: '完整走完流程的次數', color: 'bg-cyan-50 border-cyan-100' },
    {
      label: '完成率',
      value: conversionRate === null ? '—' : `${conversionRate}%`,
      desc: '選課到報名成功的粗估比例',
      color: 'bg-violet-50 border-violet-100',
    },
    {
      label: '異常事件',
      value: totalIssues,
      desc: '課程資訊遺失 + 報名失敗',
      color: totalIssues > 0 ? 'bg-red-50 border-red-100' : 'bg-stone-50 border-stone-100',
    },
  ]

  const formatDT = (ts: string) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">系統健康</h2>
          <p className="text-stone-400 mt-1 text-sm">追蹤居民從選課到報名成功的每一步，異常事件會標紅提醒</p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                rangeDays === opt.days ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {errored && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm">
          讀取 funnel_logs 失敗，請確認資料表已建立、RLS 政策允許讀取。
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-3 md:p-5`}>
            <p className="text-stone-600 text-xs md:text-sm font-medium leading-tight">{s.label}</p>
            <p className="text-stone-800 text-2xl md:text-4xl font-bold mt-1 mb-1">{loading ? '···' : s.value}</p>
            <p className="text-stone-400 text-xs hidden md:block">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* 流程漏斗 */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="text-stone-700 font-semibold mb-5">報名流程漏斗</h3>
        <div className="space-y-4">
          {FUNNEL_ORDER.map(step => {
            const count = stepCounts[step] || 0
            const width = Math.round((count / maxFunnelCount) * 100)
            return (
              <div key={step}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-stone-600">{STEP_LABELS[step] || step}</span>
                  <span className="text-sm font-bold text-stone-800">{count}</span>
                </div>
                <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(width, count > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {!loading && totalSelect === 0 && (
          <p className="text-stone-400 text-sm mt-4">這段期間還沒有資料，數字會在居民開始使用後累積。</p>
        )}
      </div>

      {/* 異常事件列表 */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center gap-2">
          <h3 className="text-stone-700 font-semibold">最近的異常事件</h3>
          {totalIssues > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{totalIssues}</span>
          )}
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-stone-400 text-sm">讀取中...</div>
        ) : issueLogs.length === 0 ? (
          <div className="px-6 py-10 text-center text-stone-400 text-sm">這段期間沒有異常事件，狀況良好。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 text-xs">
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">時間</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">類型</th>
                  <th className="text-left font-medium px-4 py-3 whitespace-nowrap">課程 ID</th>
                  <th className="text-left font-medium px-4 py-3">詳細內容</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {issueLogs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">{formatDT(log.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">
                        {STEP_LABELS[log.step] || log.step}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{log.course_ids || '—'}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs max-w-xs truncate" title={log.detail ? JSON.stringify(log.detail) : ''}>
                      {log.detail ? JSON.stringify(log.detail) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
