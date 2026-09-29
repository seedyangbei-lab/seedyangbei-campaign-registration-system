'use client'

import { useEffect, useMemo, useState } from 'react'
import { StatCard, FilterDropdown } from '@/components/AdminUI'
import AdminCourseFeedbackModal from '@/components/AdminCourseFeedbackModal'
import type { FeedbackDetail } from '@/components/CourseFeedbackReport'
import { getFeedbackOverview } from '@/lib/adminApi'
import { SCALE_QUESTIONS, YESNO_QUESTIONS, COMMENT_LABEL, scaleLabel, formatPercent } from '@/lib/courseFeedback'

type CourseRow = {
  id: string; title: string; date: string; time_start: string; time_end: string; location: string
  instructor_names: string[]
  summary: FeedbackDetail['summary']
}

type SortKey = 'date' | 'rate'

// 多堂課合併的加權平均（每堂課的平均 × 該堂課的回饋份數）
function weightedAverage(rows: CourseRow[], key: string) {
  let sum = 0, n = 0
  rows.forEach(r => {
    const s = r.summary.stats.scale.find(x => x.key === key)
    if (s?.average != null) { sum += s.average * r.summary.stats.count; n += r.summary.stats.count }
  })
  return n ? sum / n : null
}

function csvField(v: any) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

export default function AdminFeedbackPage() {
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [exporting, setExporting] = useState(false)
  const [detailCourse, setDetailCourse] = useState<CourseRow | null>(null)

  useEffect(() => {
    getFeedbackOverview()
      .then(body => setCourses(body.courses || []))
      .catch(e => setError(e?.message || '讀取失敗'))
      .finally(() => setLoading(false))
  }, [])

  const months = useMemo(
    () => Array.from(new Set(courses.map(c => c.date?.slice(0, 7)).filter(Boolean))).sort().reverse(),
    [courses]
  )

  const rows = useMemo(() => {
    const list = courses.filter(c => filterMonth ? c.date?.startsWith(filterMonth) : true)
    return list.slice().sort((a, b) => sortKey === 'rate'
      ? (a.summary.responseRate ?? -1) - (b.summary.responseRate ?? -1)
      : b.date.localeCompare(a.date))
  }, [courses, filterMonth, sortKey])

  const totals = useMemo(() => {
    const attended = rows.reduce((n, r) => n + r.summary.attendedCount, 0)
    const responded = rows.reduce((n, r) => n + r.summary.respondedCount, 0)
    const statCount = rows.reduce((n, r) => n + r.summary.stats.count, 0)
    const rejoin = rows.reduce((n, r) => n + (r.summary.stats.yesno.find(y => y.key === 'q_rejoin')?.yesCount || 0), 0)
    const avgs = SCALE_QUESTIONS.map(q => weightedAverage(rows, q.key)).filter((v): v is number => v !== null)
    return {
      attended, responded,
      rate: attended ? responded / attended : null,
      overallAverage: avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null,
      rejoinRate: statCount ? rejoin / statCount : null,
    }
  }, [rows])

  const openDetail = (c: CourseRow) => setDetailCourse(c)

  const exportCSV = async () => {
    setExporting(true)
    try {
      const body = await getFeedbackOverview({ month: filterMonth || undefined, responses: true })
      const header = [
        '課程日期', '課程名稱', '講師', '姓名', '房號', '手機', '出席狀態', '現場報名', '填寫方式', '填寫時間',
        ...SCALE_QUESTIONS.map(q => q.shortLabel), ...YESNO_QUESTIONS.map(q => q.shortLabel), COMMENT_LABEL,
      ]
      const statusText: Record<string, string> = { attended: '已出席', confirmed: '未點名', absent: '未出席' }
      const lines = (body.responses || []).map((r: any) => [
        r.course_date, r.course_title, (r.instructor_names || []).join('、'), r.name, r.room_number, r.phone,
        statusText[r.status] || r.status, r.is_walk_in ? '是' : '否', r.submitted_by === 'instructor' ? '講師代填' : '本人填寫',
        new Date(r.submitted_at).toLocaleString('zh-TW', { hour12: false }),
        ...SCALE_QUESTIONS.map(q => scaleLabel(q, r[q.key])), ...YESNO_QUESTIONS.map(q => r[q.key] ? '是' : '否'), r.comment,
      ].map(csvField).join(','))
      // 開頭加 BOM，Excel 直接開才不會中文亂碼
      const blob = new Blob(['﻿' + [header.map(csvField).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `課程回饋${filterMonth ? `_${filterMonth}` : ''}.csv`
      a.click()
    } catch (e: any) {
      alert('匯出失敗：' + (e?.message || '請稍後再試'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">課程回饋</h2>
          <p className="text-stone-400 mt-1 text-sm">每堂課的回饋回收狀況與結果。填寫率 = 已出席者中有填回饋的人數 ÷ 出席人數（含現場報名）</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterDropdown value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-[140px]">
            <option value="">全部月份</option>
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </FilterDropdown>
          <FilterDropdown value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="w-[150px]">
            <option value="date">依日期（新到舊）</option>
            <option value="rate">依填寫率（低到高）</option>
          </FilterDropdown>
          <button onClick={exportCSV} disabled={exporting || rows.length === 0}
            className="h-8 px-3 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white text-xs font-medium transition-colors whitespace-nowrap">
            {exporting ? '匯出中…' : '匯出 CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="整體填寫率" value={formatPercent(totals.rate)} desc={`${totals.responded} / ${totals.attended} 位出席者`} />
        <StatCard label="課程數" value={rows.length} desc="已開始的課程" />
        <StatCard label="平均分數" value={totals.overallAverage?.toFixed(2) ?? '—'} desc="四題五等級題的平均（滿分 5）" />
        <StatCard label="願意再參與" value={formatPercent(totals.rejoinRate)} desc="答「是」的比例" />
      </div>

      {loading ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-400 text-sm">載入中…</div>
      ) : error ? (
        <div className="bg-white border border-red-200 rounded-xl p-6 text-center text-red-600 text-sm">
          {error}
          {/course_feedbacks/.test(error) && <p className="text-stone-500 mt-2">sql/2026-09-29_course_feedbacks.sql 這份遷移可能還沒在 Supabase SQL Editor 執行過。</p>}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-400 text-sm">沒有符合條件的課程</div>
      ) : (
        <>
          {/* 電腦版表格 */}
          <div className="hidden md:block bg-white border border-stone-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs">
                {/* 分組標題：讓「回收狀況」「各題平均」這些數字一眼看得懂是什麼 */}
                <tr className="border-b border-stone-200/70">
                  <th colSpan={3} />
                  <th colSpan={4} className="px-4 pt-3 pb-1.5 text-center font-medium text-stone-400 whitespace-nowrap border-l border-stone-200/70">回收狀況</th>
                  <th colSpan={SCALE_QUESTIONS.length} className="px-4 pt-3 pb-1.5 text-center font-medium text-stone-400 whitespace-nowrap border-l border-stone-200/70">各題平均（滿分 5）</th>
                  <th className="px-4 pt-3 pb-1.5 border-l border-stone-200/70" />
                </tr>
                <tr className="whitespace-nowrap">
                  <th className="text-left font-medium px-4 py-2.5">日期</th>
                  <th className="text-left font-medium px-4 py-2.5">課程</th>
                  <th className="text-left font-medium px-4 py-2.5">講師</th>
                  <th className="text-right font-medium px-4 py-2.5 border-l border-stone-200/70">出席</th>
                  <th className="text-right font-medium px-3 py-2.5" title="出席人數中屬於現場報名的人數">其中現場</th>
                  <th className="text-right font-medium px-3 py-2.5">回收</th>
                  <th className="text-left font-medium px-4 py-2.5">填寫率</th>
                  {SCALE_QUESTIONS.map((q, i) => (
                    <th key={q.key} className={`text-right font-medium px-3 py-2.5 ${i === 0 ? 'border-l border-stone-200/70' : ''}`}>{q.shortLabel}</th>
                  ))}
                  <th className="text-right font-medium px-4 py-2.5 border-l border-stone-200/70">願意再參與</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map(c => {
                  const s = c.summary
                  const dash = <span className="text-stone-300">—</span>
                  const rate = s.responseRate
                  return (
                    <tr key={c.id} onClick={() => openDetail(c)} className="hover:bg-orange-50/50 cursor-pointer">
                      <td className="px-4 py-3 text-stone-600 whitespace-nowrap tabular-nums">{c.date}</td>
                      <td className="px-4 py-3 text-stone-800 font-medium min-w-[160px] max-w-[240px]"><span className="line-clamp-2">{c.title}</span></td>
                      <td className="px-4 py-3 text-stone-600 min-w-[96px] max-w-[200px]" title={c.instructor_names.join('、')}>
                        <span className="line-clamp-2">{c.instructor_names.join('、') || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-stone-800 font-medium border-l border-stone-100">{s.attendedCount}</td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-stone-500">{s.walkInCount > 0 ? s.walkInCount : dash}</td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-stone-700">{s.respondedCount}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {rate === null ? dash : (
                          <div className="flex items-center gap-2" title={`${s.respondedCount} / ${s.attendedCount} 位出席者`}>
                            <span className="w-10 text-right tabular-nums font-bold text-stone-800">{formatPercent(rate)}</span>
                            <span className="w-14 h-1.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                              <span className="block h-full rounded-full bg-orange-500" style={{ width: `${Math.round(rate * 100)}%` }} />
                            </span>
                          </div>
                        )}
                      </td>
                      {SCALE_QUESTIONS.map((q, i) => {
                        const avg = s.stats.scale.find(x => x.key === q.key)?.average
                        return (
                          <td key={q.key} className={`px-3 py-3 text-right tabular-nums whitespace-nowrap text-stone-700 ${i === 0 ? 'border-l border-stone-100' : ''}`}>
                            {avg != null ? avg.toFixed(2) : dash}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-stone-700 border-l border-stone-100">
                        {s.stats.count ? formatPercent(s.stats.yesno.find(y => y.key === 'q_rejoin')?.yesRate) : dash}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 手機版卡片 */}
          <div className="md:hidden flex flex-col gap-3">
            {rows.map(c => (
              <button key={c.id} onClick={() => openDetail(c)} className="bg-white border border-stone-200 rounded-xl p-4 text-left flex flex-col gap-2">
                <p className="font-bold text-stone-800">{c.title}</p>
                <p className="text-xs text-stone-500">{c.date} · {c.instructor_names.join('、') || '—'}</p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-stone-600 whitespace-nowrap">
                    回收 {c.summary.respondedCount} / 出席 {c.summary.attendedCount}
                    {c.summary.walkInCount > 0 && <span className="text-xs text-stone-400 ml-1">其中現場 {c.summary.walkInCount}</span>}
                  </span>
                  <span className="font-bold text-stone-800 tabular-nums">{formatPercent(c.summary.responseRate)}</span>
                </div>
                {c.summary.responseRate !== null && (
                  <span className="h-1.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                    <span className="block h-full rounded-full bg-orange-500" style={{ width: `${Math.round((c.summary.responseRate || 0) * 100)}%` }} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {detailCourse && <AdminCourseFeedbackModal course={detailCourse} onClose={() => setDetailCourse(null)} />}
    </div>
  )
}
