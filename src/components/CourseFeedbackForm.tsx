'use client'

import { useEffect, useRef, useState } from 'react'
import { getResidentToken } from '@/lib/resident-auth'
import {
  FEEDBACK_QUESTIONS, EMPTY_ANSWERS, COMMENT_LABEL, COMMENT_HINT, COMMENT_MAX,
  missingAnswers, formatDeadline, type FeedbackAnswers, type ScaleQuestion, type YesNoQuestion,
} from '@/lib/courseFeedback'

// 課程回饋問卷：居民填寫（電腦版彈窗／手機版獨立頁）與講師代填共用同一份題目元件。
// 使用者多為長輩：題目 18px 粗體、選項 17px，整列都能點（高度至少 52px），
// 選中時除了顏色也有實心圓點＋粗體，不只靠顏色辨識。

const IconCheck = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${selected ? 'border-orange-500' : 'border-stone-300 bg-white'}`}>
      {selected && <span className="w-[11px] h-[11px] rounded-full bg-orange-500" />}
    </span>
  )
}

function optionClass(selected: boolean, readOnly: boolean) {
  const base = 'w-full flex items-center gap-3 min-h-[52px] px-4 py-3 rounded-xl border text-[17px] text-left transition-colors'
  if (selected) return `${base} border-orange-500 bg-orange-50 text-orange-700 font-bold`
  if (readOnly) return `${base} border-stone-100 text-stone-400`
  return `${base} border-stone-200 bg-white text-stone-700 hover:border-orange-300 hover:bg-orange-50/50`
}

function QuestionCard({
  index, total, label, missing, children, cardRef,
}: {
  index: number; total: number; label: string; missing: boolean
  children: React.ReactNode; cardRef?: (el: HTMLDivElement | null) => void
}) {
  return (
    <div ref={cardRef} className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 scroll-mt-20 ${missing ? 'border-red-400' : 'border-stone-200'}`}>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-orange-600">第 {index} 題／共 {total} 題</span>
        <p className="text-lg font-bold text-stone-800 leading-relaxed">
          {label}<span className="text-red-500 ml-1" aria-label="必填">*</span>
        </p>
        {missing && <p className="text-base font-medium text-red-600">這題還沒填喔</p>}
      </div>
      {children}
    </div>
  )
}

export function FeedbackQuestions({
  answers, onChange, readOnly = false, missing = [], registerRef,
}: {
  answers: FeedbackAnswers
  onChange?: (next: FeedbackAnswers) => void
  readOnly?: boolean
  missing?: string[]
  registerRef?: (key: string, el: HTMLDivElement | null) => void
}) {
  const total = FEEDBACK_QUESTIONS.length
  const set = (patch: Partial<FeedbackAnswers>) => { if (!readOnly) onChange?.({ ...answers, ...patch }) }

  return (
    <div className="flex flex-col gap-4">
      {FEEDBACK_QUESTIONS.map((q, i) => (
        <QuestionCard key={q.key} index={i + 1} total={total} label={q.label}
          missing={missing.includes(q.key)} cardRef={el => registerRef?.(q.key, el)}>
          {q.type === 'scale' ? (
            <div role="radiogroup" aria-label={q.label} className="flex flex-col gap-2">
              {(q as ScaleQuestion).options.map((opt, oi) => {
                const score = 5 - oi
                const selected = answers[q.key] === score
                return (
                  <button key={opt} type="button" role="radio" aria-checked={selected} disabled={readOnly}
                    onClick={() => set({ [q.key]: score } as Partial<FeedbackAnswers>)}
                    className={optionClass(selected, readOnly)}>
                    <RadioDot selected={selected} />
                    {opt}
                  </button>
                )
              })}
            </div>
          ) : (
            <div role="radiogroup" aria-label={(q as YesNoQuestion).label} className="grid grid-cols-2 gap-3">
              {([[true, '是'], [false, '否']] as const).map(([val, text]) => {
                const selected = answers[q.key] === val
                return (
                  <button key={text} type="button" role="radio" aria-checked={selected} disabled={readOnly}
                    onClick={() => set({ [q.key]: val } as Partial<FeedbackAnswers>)}
                    className={`${optionClass(selected, readOnly)} justify-center min-h-[56px] text-lg`}>
                    <RadioDot selected={selected} />
                    {text}
                  </button>
                )
              })}
            </div>
          )}
        </QuestionCard>
      ))}

      <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-bold text-stone-800">{COMMENT_LABEL}<span className="text-base font-normal text-stone-500 ml-2">（選填）</span></p>
          <p className="text-base text-stone-500 leading-relaxed">{COMMENT_HINT}</p>
        </div>
        {readOnly ? (
          <p className="text-[17px] text-stone-700 leading-relaxed whitespace-pre-wrap break-words">{answers.comment || '（未填寫）'}</p>
        ) : (
          <>
            <textarea value={answers.comment} maxLength={COMMENT_MAX} rows={4}
              onChange={e => set({ comment: e.target.value })}
              placeholder="請輸入您的回答"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-[17px] text-stone-800 leading-relaxed placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-y min-h-[120px]" />
            <p className="text-sm text-stone-400 text-right">{answers.comment.length}／{COMMENT_MAX}</p>
          </>
        )}
      </div>
    </div>
  )
}

// 把資料庫的回饋列轉回表單答案格式（唯讀檢視用）
export function feedbackToAnswers(f: any): FeedbackAnswers {
  return {
    q_admin: f.q_admin, q_promotion: f.q_promotion, q_purpose: f.q_purpose, q_content: f.q_content,
    q_community: f.q_community, q_rejoin: f.q_rejoin, comment: f.comment || '',
  }
}

export const MISSING_ANSWERS_MESSAGE = '還有題目沒有填寫，請看紅框標示的題目'

// 題目元件＋送出前檢查：未答題目標紅並捲到第一題未答的位置
export function useFeedbackDraft() {
  const [answers, setAnswers] = useState<FeedbackAnswers>(EMPTY_ANSWERS)
  const [missing, setMissing] = useState<string[]>([])
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  const onChange = (next: FeedbackAnswers) => {
    setAnswers(next)
    // 已補答的題目即時拿掉紅框
    if (missing.length) setMissing(missingAnswers(next).filter(k => missing.includes(k)))
  }
  const validate = () => {
    const m = missingAnswers(answers)
    setMissing(m)
    if (m.length) refs.current[m[0]]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return m.length === 0
  }
  const dirty = JSON.stringify(answers) !== JSON.stringify(EMPTY_ANSWERS)
  const reset = () => { setAnswers(EMPTY_ANSWERS); setMissing([]) }
  const registerRef = (key: string, el: HTMLDivElement | null) => { refs.current[key] = el }

  return { answers, onChange, missing, validate, dirty, reset, registerRef }
}

/* ---------- 居民填寫 ---------- */

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: any }

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
function formatCourseDate(date?: string) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${weekdays[d.getDay()]}）`
}

export function CourseInfoCard({ course }: { course: any }) {
  return (
    <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-4 flex flex-col gap-1.5">
      <p className="text-lg font-bold text-stone-800 leading-snug break-words">{course.title}</p>
      <p className="text-base text-stone-600">{formatCourseDate(course.date)} {course.time_start?.slice(0, 5)}–{course.time_end?.slice(0, 5)}</p>
      {course.location && <p className="text-base text-stone-600 break-words">{course.location}</p>}
      {course.instructor_name && <p className="text-base text-stone-600">講師：{course.instructor_name}</p>}
    </div>
  )
}

function Notice({ title, message }: { title: string; message?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl px-5 py-8 text-center flex flex-col gap-2">
      <p className="text-lg font-bold text-stone-700">{title}</p>
      {message && <p className="text-base text-stone-500 leading-relaxed">{message}</p>}
    </div>
  )
}

// variant：modal＝電腦版彈窗內容（呼叫端負責外框）；page＝手機版獨立頁
export function ResidentFeedbackForm({
  registrationId, variant, onClose, onSubmitted,
}: {
  registrationId: string
  variant: 'modal' | 'page'
  onClose: () => void
  onSubmitted?: () => void
}) {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)
  const draft = useFeedbackDraft()

  // 漏填提示在補完所有紅框題目後自動消失，不必再按一次送出
  useEffect(() => {
    if (submitError === MISSING_ANSWERS_MESSAGE && draft.missing.length === 0) setSubmitError('')
  }, [submitError, draft.missing.length])

  useEffect(() => {
    let cancelled = false
    const token = getResidentToken()
    if (!token) { setState({ kind: 'error', message: '登入已過期，請先登出後重新用 LINE 登入。' }); return }
    fetch(`/api/feedback?registrationId=${encodeURIComponent(registrationId)}`, { headers: { 'x-resident-token': token } })
      .then(async res => {
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.status === 401) setState({ kind: 'error', message: '登入已過期，請先登出後重新用 LINE 登入。' })
        else if (!res.ok) setState({ kind: 'error', message: body.error || '讀取失敗，請稍後再試。' })
        else setState({ kind: 'ready', data: body })
      })
      .catch(() => { if (!cancelled) setState({ kind: 'error', message: '網路連線不穩，請稍後再試。' }) })
    return () => { cancelled = true }
  }, [registrationId])

  const data = state.kind === 'ready' ? state.data : null
  const canFill = !!data && !data.feedback && data.eligible && data.window === 'open' && !done

  const handleClose = () => {
    if (canFill && draft.dirty && !window.confirm('問卷還沒送出，確定要離開嗎？')) return
    onClose()
  }

  const handleSubmit = async () => {
    setSubmitError('')
    if (!draft.validate()) { setSubmitError(MISSING_ANSWERS_MESSAGE); return }
    const token = getResidentToken()
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-resident-token': token || '' },
        body: JSON.stringify({ registrationId, answers: draft.answers }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) { setSubmitError(body.error || '送出失敗，請稍後再試'); return }
      setDone(true)
      onSubmitted?.()
    } catch {
      setSubmitError('網路連線不穩，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  let body: React.ReactNode
  if (state.kind === 'loading') {
    body = <div className="py-16 text-center text-base text-stone-400">載入中…</div>
  } else if (state.kind === 'error') {
    body = <Notice title="無法開啟問卷" message={state.message} />
  } else if (done) {
    body = (
      <div className="bg-white border border-stone-200 rounded-2xl px-5 py-10 text-center flex flex-col items-center gap-3">
        <span className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><IconCheck className="w-7 h-7" /></span>
        <p className="text-xl font-bold text-stone-800">已送出，謝謝您！</p>
        <p className="text-base text-stone-500 leading-relaxed">感謝您耐心的填寫，期待下次活動再相見 😊</p>
      </div>
    )
  } else {
    const d = state.data
    body = (
      <div className="flex flex-col gap-4">
        <CourseInfoCard course={d.course} />
        {d.feedback ? (
          <>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-base font-medium">
              <IconCheck />您已經填寫過這堂課的回饋，以下是您的回答
            </div>
            <FeedbackQuestions answers={feedbackToAnswers(d.feedback)} readOnly />
          </>
        ) : !d.eligible ? (
          <Notice title="這堂課目前無法填寫回饋" />
        ) : d.window === 'not_started' ? (
          <Notice title="課程開始後才能填寫" />
        ) : d.window === 'closed' ? (
          <Notice title="已超過填寫期限" message={`這堂課的回饋問卷已於 ${formatDeadline(d.course)} 截止。`} />
        ) : (
          <>
            <p className="text-base text-stone-600 leading-relaxed px-1">
              本問卷蒐集來的資訊，僅會作為內部課程改善使用，絕不外洩也不會作為其他用途使用，敬請放心填寫！
              <span className="block mt-1 text-stone-500">填寫期限：{formatDeadline(d.course)} 晚上 11:59 前</span>
            </p>
            <FeedbackQuestions answers={draft.answers} onChange={draft.onChange} missing={draft.missing} registerRef={draft.registerRef} />
          </>
        )}
      </div>
    )
  }

  const footer = canFill ? (
    <div className="flex flex-col gap-2">
      {submitError && <p className="text-base font-medium text-red-600 text-center" role="alert">{submitError}</p>}
      <button type="button" onClick={handleSubmit} disabled={submitting}
        className="w-full min-h-[56px] bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white text-lg font-bold rounded-xl transition-colors">
        {submitting ? '送出中…' : '送出問卷'}
      </button>
    </div>
  ) : (
    <button type="button" onClick={onClose}
      className="w-full min-h-[56px] bg-stone-100 hover:bg-stone-200 text-stone-700 text-lg font-bold rounded-xl transition-colors">
      {done ? '完成' : '關閉'}
    </button>
  )

  if (variant === 'modal') {
    return (
      <div className="bg-stone-50 w-full max-w-[640px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h3 className="text-xl font-bold text-stone-800">課程回饋問卷</h3>
          <button type="button" onClick={handleClose} aria-label="關閉" className="p-2 hover:bg-stone-100 rounded-xl text-stone-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{body}</div>
        <div className="flex-shrink-0 bg-white px-6 py-4 border-t border-stone-200">{footer}</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 flex items-center gap-2 px-2 h-14">
        <button type="button" onClick={handleClose} className="flex items-center gap-1 px-2 py-2 text-lg text-stone-700">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          返回
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-stone-800 pr-16">課程回饋問卷</h1>
      </div>
      <div className="flex-1 px-4 py-5 pb-40">{body}</div>
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-white p-4 rounded-tl-2xl rounded-tr-2xl" style={{ boxShadow: '0px -3px 4px 0px rgba(0,0,0,0.08)' }}>
        {footer}
      </div>
    </main>
  )
}
