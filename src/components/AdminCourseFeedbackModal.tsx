'use client'

import { useEffect, useState } from 'react'
import { FeedbackSummaryPanel, FeedbackResponseList, type FeedbackDetail } from '@/components/CourseFeedbackReport'
import { getCourseFeedbackDetail } from '@/lib/adminApi'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

// 後台單一課程的學員回饋明細（含填寫者姓名）。「課程回饋」總覽頁跟「課程管理」列表的「學員回饋」按鈕共用
export default function AdminCourseFeedbackModal({ course, onClose }: {
  course: { id: string; title: string; date: string; time_start?: string; time_end?: string; location?: string; instructor_names?: string[] }
  onClose: () => void
}) {
  const [detail, setDetail] = useState<FeedbackDetail | null>(null)
  const [error, setError] = useState('')

  useBodyScrollLock(true)

  useEffect(() => {
    setDetail(null)
    setError('')
    getCourseFeedbackDetail(course.id)
      .then(setDetail)
      .catch(e => setError(e?.message || '讀取失敗'))
  }, [course.id])

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-stretch md:items-center justify-center md:p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#fafaf9] w-full md:max-w-[960px] md:max-h-[90vh] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white flex items-start justify-between gap-3 px-5 py-4 border-b border-stone-200">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-stone-800 break-words">{course.title}</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {course.date} · {(course.time_start || '').slice(0, 5)}-{(course.time_end || '').slice(0, 5)} · {course.location}
              {course.instructor_names?.length ? ` · 講師：${course.instructor_names.join('、')}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="關閉" className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-400 flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
          {error ? (
            <p className="text-sm text-red-600 text-center py-10">
              {error}
              {/course_feedbacks/.test(error) && <span className="block text-stone-500 mt-2">sql/2026-09-29_course_feedbacks.sql 這份遷移可能還沒在 Supabase SQL Editor 執行過。</span>}
            </p>
          ) : !detail ? (
            <p className="text-sm text-stone-400 text-center py-10">載入中…</p>
          ) : (
            <>
              {/* 排序與中台學員回饋頁一致：先名單、後統計 */}
              <FeedbackResponseList participants={detail.participants} />
              <FeedbackSummaryPanel summary={detail.summary} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
