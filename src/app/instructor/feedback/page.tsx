'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { hasValidInstructorToken } from '@/lib/instructor-auth'
import { getInstructorCourseFeedback, proxyFillCourseFeedback } from '@/lib/instructorCoursesApi'
import { FeedbackSummaryPanel, FeedbackResponseList, type FeedbackDetail } from '@/components/CourseFeedbackReport'
import { FeedbackQuestions, useFeedbackDraft } from '@/components/CourseFeedbackForm'
import { formatDeadline } from '@/lib/courseFeedback'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

type Participant = FeedbackDetail['participants'][number]

// 講師代填：沒有 LINE 帳號的學員（多為現場報名）無法自己登入，由講師口頭詢問後代為填寫
function ProxyFillModal({ courseId, participant, onClose, onDone }: {
  courseId: string; participant: Participant; onClose: () => void; onDone: () => void
}) {
  const draft = useFeedbackDraft()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    if (draft.dirty && !window.confirm('代填內容還沒送出，確定要離開嗎？')) return
    onClose()
  }
  const submit = async () => {
    setError('')
    if (!draft.validate()) { setError('還有題目沒有填寫，請看紅框標示的題目'); return }
    setSaving(true)
    try {
      await proxyFillCourseFeedback(courseId, participant.registration_id, draft.answers)
      onDone()
    } catch (e: any) {
      setError(e?.message || '送出失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch md:items-center justify-center md:p-4">
      <div className="bg-stone-50 w-full md:max-w-[640px] md:max-h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-stone-800">代填課程回饋</h3>
            <p className="text-sm text-stone-500">學員：{participant.name}{participant.room_number ? `（${participant.room_number}）` : ''}</p>
          </div>
          <button type="button" onClick={close} aria-label="關閉" className="p-2 hover:bg-stone-100 rounded-xl text-stone-500">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-5 py-4">
          <p className="text-sm text-stone-500 mb-3">請逐題念給學員聽，依學員的回答勾選。送出後會標記為「講師代填」，無法修改。</p>
          <FeedbackQuestions answers={draft.answers} onChange={draft.onChange} missing={draft.missing} registerRef={draft.registerRef} />
        </div>
        <div className="flex-shrink-0 bg-white px-5 py-4 border-t border-stone-200 flex flex-col gap-2">
          {error && <p className="text-sm font-medium text-red-600 text-center" role="alert">{error}</p>}
          <button type="button" onClick={submit} disabled={saving}
            className="w-full min-h-[52px] bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white text-base font-bold rounded-xl transition-colors">
            {saving ? '送出中…' : '送出代填'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FeedbackPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId')
  const [detail, setDetail] = useState<(FeedbackDetail & { window: string }) | null>(null)
  const [error, setError] = useState('')
  const [proxyTarget, setProxyTarget] = useState<Participant | null>(null)
  const [toast, setToast] = useState('')

  useBodyScrollLock(!!proxyTarget)

  const load = async () => {
    if (!courseId) return
    try {
      setDetail(await getInstructorCourseFeedback(courseId))
    } catch (e: any) {
      setError(e?.message || '讀取失敗')
    }
  }

  useEffect(() => {
    if (!courseId || !hasValidInstructorToken()) { router.replace('/instructor'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(t)
  }, [toast])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-stone-600 text-sm">{error}</p>
        <button onClick={() => router.push('/instructor')} className="text-orange-500 text-sm hover:underline">回到我的課程</button>
      </div>
    )
  }
  if (!detail) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>
  }

  const { course } = detail
  const canProxy = detail.window === 'open'

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-10">
      <div className="sticky top-0 z-30 bg-white h-[52px] px-4 flex items-center shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
        <button onClick={() => router.push('/instructor')} aria-label="返回" className="w-6 h-6 flex items-center justify-center shrink-0 text-stone-600">
          <BackArrowIcon />
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">課程回饋</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      <div className="p-4 md:max-w-[900px] md:mx-auto flex flex-col gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-1.5">
          <p className="font-bold text-stone-800 text-base">{course.title}</p>
          <p className="text-xs text-stone-500">{course.date} · {(course.time_start || '').slice(0, 5)}-{(course.time_end || '').slice(0, 5)} · {course.location}</p>
          <p className={`text-xs font-medium mt-1 ${detail.window === 'closed' ? 'text-stone-500' : 'text-orange-500'}`}>
            {detail.window === 'not_started' ? '課程開始後學員即可填寫回饋'
              : detail.window === 'closed' ? `填寫已於 ${formatDeadline(course)} 截止`
              : `學員可填寫至 ${formatDeadline(course)} 晚上 11:59`}
          </p>
        </div>

        <FeedbackSummaryPanel summary={detail.summary} />

        {!canProxy && detail.window === 'closed' && (
          <p className="text-xs text-stone-500">已超過填寫期限，無法再代填。</p>
        )}
        <FeedbackResponseList participants={detail.participants} onProxyFill={canProxy ? setProxyTarget : undefined} />
      </div>

      {proxyTarget && courseId && (
        <ProxyFillModal courseId={courseId} participant={proxyTarget}
          onClose={() => setProxyTarget(null)}
          onDone={async () => { setProxyTarget(null); setToast('已送出代填'); await load() }} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-[60]">{toast}</div>
      )}
    </div>
  )
}

export default function InstructorFeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <FeedbackPageInner />
    </Suspense>
  )
}
