'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

interface CheckinEvent {
  id: string
  title: string
  description: string | null
  checkin_start_at: string
  checkin_end_at: string
  location: string | null
}

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function formatRange(startIso: string, endIso: string) {
  const s = new Date(startIso); const e = new Date(endIso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${s.getMonth() + 1}/${s.getDate()} ${pad(s.getHours())}:${pad(s.getMinutes())} - ${pad(e.getHours())}:${pad(e.getMinutes())}`
}
function getStatus(ev: CheckinEvent): 'upcoming' | 'open' | 'closed' {
  const now = Date.now()
  const start = new Date(ev.checkin_start_at).getTime()
  const end = new Date(ev.checkin_end_at).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'closed'
  return 'open'
}

function CheckinPageInner() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [instructor, setInstructor] = useState<any>(null)
  const [events, setEvents] = useState<CheckinEvent[]>([])
  const [myRecords, setMyRecords] = useState<Record<string, string>>({}) // event_id -> checked_in_at
  const [checkingInId, setCheckingInId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const loadData = async (instructorId: string) => {
    const [{ data: ev }, { data: recs }] = await Promise.all([
      supabase.from('checkin_events').select('id, title, description, checkin_start_at, checkin_end_at, location').order('checkin_start_at', { ascending: false }),
      supabase.from('checkin_records').select('event_id, checked_in_at').eq('instructor_id', instructorId),
    ])
    setEvents(ev || [])
    setMyRecords(Object.fromEntries((recs || []).map((r: any) => [r.event_id, r.checked_in_at])))
  }

  useEffect(() => {
    (async () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('instructor_line_user') : null
      if (!stored) { router.replace('/instructor'); return }
      let lineUserId = ''
      try { lineUserId = JSON.parse(stored).lineUserId } catch { router.replace('/instructor'); return }

      const { data: instr } = await supabase.from('instructors').select('id, name').eq('line_user_id', lineUserId).maybeSingle()
      if (!instr) { router.replace('/instructor'); return }
      setInstructor(instr)
      await loadData(instr.id)
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCheckin = async (ev: CheckinEvent) => {
    if (!instructor) return
    setCheckingInId(ev.id); setError('')
    const { error: insertError } = await supabase.from('checkin_records').insert({
      event_id: ev.id, instructor_id: instructor.id, method: 'self',
    })
    // 23505 = unique constraint violation：代表已經簽到過（例如連點兩下），不算真的失敗
    if (insertError && insertError.code !== '23505') {
      setError('簽到失敗，請稍後再試')
      setCheckingInId(null)
      return
    }
    await loadData(instructor.id)
    setCheckingInId(null)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>
  }

  const sorted = events.slice().sort((a, b) => {
    const rank = (s: string) => s === 'open' ? 0 : s === 'upcoming' ? 1 : 2
    return rank(getStatus(a)) - rank(getStatus(b)) || new Date(a.checkin_start_at).getTime() - new Date(b.checkin_start_at).getTime()
  })

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-[100px]">
      <div className="sticky top-0 z-30 bg-white h-[52px] px-4 flex items-center shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
        <button onClick={() => router.push('/instructor')} aria-label="返回" className="w-6 h-6 flex items-center justify-center shrink-0 text-stone-600">
          <BackArrowIcon />
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">活動簽到</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 flex flex-col gap-3">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg px-3 py-2">{error}</div>}

        {sorted.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-400 text-sm">目前沒有簽到活動</div>
        )}

        {sorted.map(ev => {
          const status = getStatus(ev)
          const checkedInAt = myRecords[ev.id]
          const pad = (n: number) => String(n).padStart(2, '0')
          return (
            <div key={ev.id} className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-base font-bold text-stone-800">{ev.title}</p>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <ClockIcon />{formatRange(ev.checkin_start_at, ev.checkin_end_at)}
              </div>
              {ev.location && (
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <PinIcon />{ev.location}
                </div>
              )}
              {ev.description && <p className="text-xs text-stone-400 mt-0.5">{ev.description}</p>}

              {checkedInAt ? (
                <div className="mt-2 flex items-center justify-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-sm font-medium py-2.5 rounded-lg">
                  <CheckCircleIcon />已簽到 · {(() => { const t = new Date(checkedInAt); return `${pad(t.getHours())}:${pad(t.getMinutes())}` })()}
                </div>
              ) : status === 'open' ? (
                <button
                  onClick={() => handleCheckin(ev)}
                  disabled={checkingInId === ev.id}
                  className="mt-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                >
                  {checkingInId === ev.id ? '簽到中...' : '我要簽到'}
                </button>
              ) : status === 'upcoming' ? (
                <div className="mt-2 text-center bg-stone-100 text-stone-400 text-sm font-medium py-2.5 rounded-lg">
                  簽到尚未開放
                </div>
              ) : (
                <div className="mt-2 text-center bg-stone-100 text-stone-400 text-sm font-medium py-2.5 rounded-lg">
                  簽到已截止
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <CheckinPageInner />
    </Suspense>
  )
}
