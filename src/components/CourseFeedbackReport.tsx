'use client'

import { useState } from 'react'
import {
  SCALE_QUESTIONS, YESNO_QUESTIONS, FEEDBACK_QUESTIONS, COMMENT_LABEL,
  scaleLabel, formatPercent, type ScaleQuestion,
} from '@/lib/courseFeedback'

// 講師中台與後台共用：單一課程的回饋統計＋每份回饋明細。
// 分布圖是單一系列（各選項人數），用同一個橘色表示多寡，數字與百分比一律以文字標出，不靠顏色辨識。

export type FeedbackDetail = {
  course: any
  participants: {
    registration_id: string
    status: 'confirmed' | 'attended' | 'absent'
    is_walk_in: boolean
    name: string
    room_number: string | null
    has_line: boolean
    feedback: any | null
  }[]
  summary: {
    attendedCount: number
    walkInCount: number
    respondedCount: number
    totalFeedbackCount: number
    responseRate: number | null
    stats: {
      count: number
      scale: { key: string; average: number | null; positiveRate: number | null; distribution: number[] }[]
      yesno: { key: string; yesCount: number; yesRate: number | null }[]
    }
  }
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-800 leading-8">{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  )
}

function DistributionRows({ q, distribution, count }: { q: ScaleQuestion; distribution: number[]; count: number }) {
  const max = Math.max(1, ...distribution)
  return (
    <div className="flex flex-col gap-1.5">
      {q.options.map((opt, i) => {
        const n = distribution[i] || 0
        const pct = count ? n / count : 0
        return (
          <div key={opt} className="flex items-center gap-2 text-sm" title={`${opt}：${n} 人（${formatPercent(pct)}）`}>
            <span className="w-20 flex-shrink-0 text-stone-600">{opt}</span>
            <div className="flex-1 h-3 bg-stone-100 rounded">
              {n > 0 && <div className="h-3 bg-orange-400 rounded" style={{ width: `${(n / max) * 100}%` }} />}
            </div>
            <span className="w-20 flex-shrink-0 text-right tabular-nums text-stone-700">{n} 人 · {formatPercent(pct)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function FeedbackSummaryPanel({ summary }: { summary: FeedbackDetail['summary'] }) {
  const { stats } = summary
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="填寫率" value={formatPercent(summary.responseRate)} sub="已出席者中有填回饋的比例" />
        <Tile label="回收份數／出席人數" value={`${summary.respondedCount} / ${summary.attendedCount}`}
          sub={summary.walkInCount ? `出席含現場報名 ${summary.walkInCount} 人` : '出席含現場報名'} />
        {YESNO_QUESTIONS.map(q => {
          const s = stats.yesno.find(y => y.key === q.key)
          return <Tile key={q.key} label={`${q.shortLabel}（答「是」）`} value={formatPercent(s?.yesRate)} sub={`${s?.yesCount ?? 0} / ${stats.count} 人`} />
        })}
      </div>

      {summary.totalFeedbackCount > summary.respondedCount && (
        <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
          另有 {summary.totalFeedbackCount - summary.respondedCount} 份回饋來自尚未點名或標記未出席的學員，暫不計入填寫率與統計。
        </p>
      )}

      {stats.count === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-sm text-stone-400">目前還沒有可統計的回饋</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {SCALE_QUESTIONS.map(q => {
            const s = stats.scale.find(x => x.key === q.key)
            return (
              <div key={q.key} className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-bold text-stone-800 leading-5">{q.label}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-stone-800 leading-6 tabular-nums">{s?.average?.toFixed(2) ?? '—'}<span className="text-xs font-normal text-stone-400"> / 5</span></p>
                    <p className="text-xs text-stone-500">正向 {formatPercent(s?.positiveRate)}</p>
                  </div>
                </div>
                <DistributionRows q={q} distribution={s?.distribution || []} count={stats.count} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const STATUS_TEXT: Record<string, { text: string; cls: string }> = {
  attended: { text: '已出席', cls: 'bg-green-50 text-green-700' },
  confirmed: { text: '未點名', cls: 'bg-amber-50 text-amber-700' },
  absent: { text: '未出席', cls: 'bg-stone-100 text-stone-500' },
}

function formatDateTime(ts: string) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function ResponseAnswers({ f }: { f: any }) {
  return (
    <dl className="flex flex-col gap-2 text-sm">
      {FEEDBACK_QUESTIONS.map(q => (
        <div key={q.key} className="flex flex-col md:flex-row md:gap-3">
          <dt className="text-stone-500 md:w-28 flex-shrink-0">{q.shortLabel}</dt>
          <dd className="text-stone-800 font-medium">
            {q.type === 'scale' ? scaleLabel(q, f[q.key]) : f[q.key] ? '是' : '否'}
          </dd>
        </div>
      ))}
      <div className="flex flex-col md:flex-row md:gap-3">
        <dt className="text-stone-500 md:w-28 flex-shrink-0">{COMMENT_LABEL}</dt>
        <dd className="text-stone-800 whitespace-pre-wrap break-words">{f.comment || '（未填寫）'}</dd>
      </div>
    </dl>
  )
}

export function FeedbackResponseList({
  participants, onProxyFill,
}: {
  participants: FeedbackDetail['participants']
  // 有傳才顯示「代填」按鈕（講師中台用；後台不代填）
  onProxyFill?: (p: FeedbackDetail['participants'][number]) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const responded = participants.filter(p => p.feedback)
    .sort((a, b) => new Date(b.feedback.submitted_at).getTime() - new Date(a.feedback.submitted_at).getTime())
  const pending = participants.filter(p => !p.feedback && p.status !== 'absent')

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-stone-800">已填寫（{responded.length}）</h3>
        {responded.length === 0 ? (
          <p className="text-sm text-stone-400 bg-white border border-stone-200 rounded-xl p-4 text-center">還沒有人填寫</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {responded.map(p => {
              const open = expanded === p.registration_id
              const st = STATUS_TEXT[p.status]
              return (
                <li key={p.registration_id} className="bg-white border border-stone-200 rounded-xl">
                  <button onClick={() => setExpanded(open ? null : p.registration_id)}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left" aria-expanded={open}>
                    <span className="font-bold text-stone-800">{p.name}</span>
                    {p.room_number && <span className="text-sm text-stone-500">{p.room_number}</span>}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span>
                    {p.feedback.submitted_by === 'instructor' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700">講師代填</span>
                    )}
                    <span className="ml-auto text-xs text-stone-400 flex-shrink-0">{formatDateTime(p.feedback.submitted_at)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-stone-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {!open && p.feedback.comment && (
                    <p className="px-4 pb-3 -mt-1 text-sm text-stone-600 line-clamp-2 break-words">「{p.feedback.comment}」</p>
                  )}
                  {open && <div className="px-4 pb-4 border-t border-stone-100 pt-3"><ResponseAnswers f={p.feedback} /></div>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-base font-bold text-stone-800">尚未填寫（{pending.length}）</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-400 bg-white border border-stone-200 rounded-xl p-4 text-center">大家都填完了</p>
        ) : (
          <ul className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {pending.map(p => {
              const st = STATUS_TEXT[p.status]
              return (
                <li key={p.registration_id} className="flex items-center gap-2 px-4 py-3">
                  <span className="font-medium text-stone-800">{p.name}</span>
                  {p.room_number && <span className="text-sm text-stone-500">{p.room_number}</span>}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${st.cls}`}>{st.text}</span>
                  {p.is_walk_in && <span className="text-xs font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600">現場報名</span>}
                  <span className="ml-auto flex-shrink-0">
                    {!p.has_line && onProxyFill ? (
                      <button onClick={() => onProxyFill(p)}
                        className="text-xs font-medium px-3 py-1.5 rounded-md bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 transition-colors">
                        代填
                      </button>
                    ) : !p.has_line ? (
                      <span className="text-xs text-stone-400">無 LINE 帳號</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
