'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AttendeeCheckItem from '@/components/AttendeeCheckItem'
import WalkInRegistrationModal from '@/components/WalkInRegistrationModal'

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ClipboardCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

// 中台「出席紀錄」手機版全螢幕頁面
// - 預設「檢視模式」：只顯示狀態徽章（未確認／已出席／未出席），對照 Figma node 481:19958
// - 按「更新出席狀態」才切換到「編輯模式」：改成可勾選清單，對照 Figma node 470:18028
// - 編輯模式按「確認」才會真的寫入資料庫，寫完切回檢視模式
function AttendancePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const courseId = searchParams.get('courseId') || ''

  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<any>(null)
  const [list, setList] = useState<any[]>([])
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchAttendance = async () => {
    setLoading(true)
    const stored = typeof window !== 'undefined' ? localStorage.getItem('instructor_line_user') : null
    if (!stored) { router.replace('/instructor'); return }
    try { JSON.parse(stored) } catch { router.replace('/instructor'); return }

    const { data: courseRow } = await supabase.from('courses').select('id, title, date').eq('id', courseId).maybeSingle()
    setCourse(courseRow)
    const { data: regs, error } = await supabase
      .from('registrations')
      .select('id, status, is_walk_in, users(id, name, room_number, line_id)')
      .eq('course_id', courseId)
      .in('status', ['confirmed', 'attended', 'absent'])
      .order('registered_at')
    if (error) {
      console.error('attendance fetch error:', error)
      setErrorMsg('讀取報名名單失敗：' + error.message + (error.message.includes('is_walk_in') ? '（sql/2026-07-16_registrations_walk_in.sql 這份遷移可能還沒在 Supabase SQL Editor 執行過）' : ''))
    } else {
      setErrorMsg('')
    }
    setList(regs || [])
    setCheckedIds(new Set((regs || []).filter((r: any) => r.status === 'attended').map((r: any) => r.id)))
    setLoading(false)
  }

  useEffect(() => {
    if (!courseId) { router.replace('/instructor'); return }
    fetchAttendance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const enterEditMode = () => {
    setCheckedIds(new Set(list.filter((r: any) => r.status === 'attended').map((r: any) => r.id)))
    setMode('edit')
  }

  const handleConfirm = async () => {
    setSaving(true)
    // 平行送出所有變更，而非一筆一筆等待，避免多人異動時儲存時間疊加
    // 三種情況：勾選出席／原本已出席被取消（撤銷＋收回點數）／原本未確認且這次審核後仍未勾選（標記未出席，不動點數）
    await Promise.all(list.map((reg: any) => {
      const shouldAttend = checkedIds.has(reg.id)
      const isAttended = reg.status === 'attended'
      const isAbsent = reg.status === 'absent'
      if (shouldAttend && !isAttended) {
        return fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: course?.title, lineUserId: reg.users?.line_id || '', action: 'attend' }) })
      } else if (!shouldAttend && isAttended) {
        return fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: course?.title, lineUserId: reg.users?.line_id || '', action: 'unattend' }) })
      } else if (!shouldAttend && !isAttended && !isAbsent) {
        return fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: course?.title, lineUserId: reg.users?.line_id || '', action: 'mark_absent' }) })
      }
      return Promise.resolve()
    }))
    setSaving(false)
    setMode('view')
    fetchAttendance()
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>
  }

  return (
    <div className="min-h-screen bg-white pb-[100px]">
      <div className="sticky top-0 z-30 bg-white h-[52px] px-4 flex items-center justify-between shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
        <button onClick={() => router.push('/instructor')} aria-label="返回" className="w-6 h-6 flex items-center justify-center shrink-0 text-stone-600">
          <BackArrowIcon />
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">出席紀錄</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      <div
        className="w-full border-y border-[#f2d8c4] flex flex-col items-center justify-center gap-1 py-8 px-4"
        style={{ background: 'linear-gradient(to bottom, #ffead7 0%, #fff4e9 20%, #fffbf6 50%, #ffffff 100%)' }}
      >
        <p className="text-xl font-bold text-[#292524]">{course?.title}</p>
        <p className="text-sm font-medium text-[#a8a29e]">{course?.date}</p>
      </div>

      <div className="p-8 flex flex-col gap-4 items-center">
        {mode === 'edit' && (
          <>
            <p className="text-xs text-stone-600 text-center w-full">已勾選 {checkedIds.size} / {list.length} 人</p>
            <p className="text-xs text-stone-400 whitespace-nowrap">勾選代表已出席，取消勾選代表撤銷出席</p>
          </>
        )}

        {errorMsg && <p className="text-xs text-red-500 text-center">{errorMsg}</p>}

        {list.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-sm">此課程尚無報名者</div>
        ) : (
          <div className="w-full flex flex-col gap-2">
            {list.map((reg: any) => (
              mode === 'view' ? (
                <AttendeeCheckItem
                  key={reg.id}
                  mode="view"
                  name={reg.users?.name}
                  roomNumber={reg.users?.room_number}
                  badge={reg.is_walk_in ? '現場報到' : undefined}
                  status={reg.status === 'attended' || reg.status === 'absent' ? reg.status : 'confirmed'}
                />
              ) : (
                <AttendeeCheckItem
                  key={reg.id}
                  mode="edit"
                  checked={checkedIds.has(reg.id)}
                  name={reg.users?.name}
                  roomNumber={reg.users?.room_number}
                  badge={reg.is_walk_in ? '現場報到' : undefined}
                  onToggle={() => {
                    const next = new Set(checkedIds)
                    checkedIds.has(reg.id) ? next.delete(reg.id) : next.add(reg.id)
                    setCheckedIds(next)
                  }}
                />
              )
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-white p-4 rounded-t-2xl shadow-[0px_-3px_4px_0px_rgba(0,0,0,0.08)] flex gap-2.5">
        <button
          type="button"
          onClick={() => setWalkInModalOpen(true)}
          className="flex-1 h-[50px] flex items-center justify-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 font-medium text-base rounded-[10px] transition-colors hover:bg-orange-100"
        >
          <PlusIcon />
          新增現場報到
        </button>
        {mode === 'view' ? (
          <button
            type="button"
            onClick={enterEditMode}
            className="flex-1 h-[50px] flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-medium text-base rounded-[10px] transition-colors"
          >
            <ClipboardCheckIcon />
            更新出席狀態
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 h-[50px] flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium text-base rounded-[10px] transition-colors"
          >
            {saving ? '儲存中...' : <><CheckIcon />確認</>}
          </button>
        )}
      </div>

      {walkInModalOpen && (
        <WalkInRegistrationModal
          courseId={courseId}
          courseTitle={course?.title}
          existingUserIds={list.map((r: any) => r.users?.id).filter(Boolean)}
          onClose={() => setWalkInModalOpen(false)}
          onConfirmed={(regs) => {
            setList(l => [...l, ...regs])
            setCheckedIds(prev => {
              const next = new Set(prev)
              regs.forEach(r => next.add(r.id))
              return next
            })
            setWalkInModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <AttendancePageInner />
    </Suspense>
  )
}
