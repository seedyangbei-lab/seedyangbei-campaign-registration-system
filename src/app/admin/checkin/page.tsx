'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface CheckinEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  checkin_start_at: string
  checkin_end_at: string
  location: string | null
  created_at: string
}
interface CheckinRecord {
  id: string
  event_id: string
  instructor_id: string
  checked_in_at: string
  method: 'self' | 'manual'
}
interface Instructor { id: string; name: string; avatar_url: string | null }

const emptyForm = { title: '', description: '', event_date: '', start_time: '', end_time: '', location: '' }

/* ---------- Icons（inline SVG，禁止 emoji） ---------- */

function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}:00`).toISOString()
}
function splitDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}
function formatRange(startIso: string, endIso: string) {
  const s = new Date(startIso); const e = new Date(endIso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${s.getMonth() + 1}/${s.getDate()}`
  return `${dateStr} ${pad(s.getHours())}:${pad(s.getMinutes())} - ${pad(e.getHours())}:${pad(e.getMinutes())}`
}
function getStatus(ev: CheckinEvent): 'upcoming' | 'open' | 'closed' {
  const now = Date.now()
  const start = new Date(ev.checkin_start_at).getTime()
  const end = new Date(ev.checkin_end_at).getTime()
  if (now < start) return 'upcoming'
  if (now > end) return 'closed'
  return 'open'
}
function StatusBadge({ status }: { status: 'upcoming' | 'open' | 'closed' }) {
  const map = {
    upcoming: { label: '未開始', cls: 'bg-stone-100 border border-stone-300 text-stone-600' },
    open: { label: '簽到中', cls: 'bg-green-100 text-green-700' },
    closed: { label: '已結束', cls: 'bg-stone-100 border border-stone-300 text-stone-500' },
  }[status]
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${map.cls}`}>{map.label}</span>
}

export default function CheckinPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<CheckinEvent[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [recordsByEvent, setRecordsByEvent] = useState<Record<string, CheckinRecord[]>>({})
  const [pageLoading, setPageLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<CheckinEvent | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [rosterEvent, setRosterEvent] = useState<CheckinEvent | null>(null)
  const [manualPickId, setManualPickId] = useState('')
  const [manualSaving, setManualSaving] = useState(false)

  const instructorMap = useMemo(() => Object.fromEntries(instructors.map(i => [i.id, i])), [instructors])

  const fetchAll = async () => {
    const [{ data: ev }, { data: inst }, { data: recs }] = await Promise.all([
      supabase.from('checkin_events').select('*').order('checkin_start_at', { ascending: false }),
      supabase.from('instructors').select('id, name, avatar_url').order('name'),
      supabase.from('checkin_records').select('*'),
    ])
    setEvents(ev || [])
    setInstructors(inst || [])
    const grouped: Record<string, CheckinRecord[]> = {}
    for (const r of (recs || [])) {
      if (!grouped[r.event_id]) grouped[r.event_id] = []
      grouped[r.event_id].push(r)
    }
    setRecordsByEvent(grouped)
    setPageLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (ev: CheckinEvent) => {
    setEditTarget(ev)
    const start = splitDateTime(ev.checkin_start_at)
    const end = splitDateTime(ev.checkin_end_at)
    setForm({
      title: ev.title, description: ev.description || '',
      event_date: ev.event_date, start_time: start.time, end_time: end.time,
      location: ev.location || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.event_date || !form.start_time || !form.end_time) return
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      checkin_start_at: combineDateTime(form.event_date, form.start_time),
      checkin_end_at: combineDateTime(form.event_date, form.end_time),
      location: form.location || null,
    }
    if (editTarget) {
      await supabase.from('checkin_events').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('checkin_events').insert(payload)
    }
    setShowModal(false)
    await fetchAll()
    setSaving(false)
  }

  const handleDelete = async (ev: CheckinEvent) => {
    if (!confirm(`確定要刪除「${ev.title}」這場活動嗎？簽到紀錄也會一併刪除，此操作無法復原。`)) return
    await supabase.from('checkin_events').delete().eq('id', ev.id)
    await fetchAll()
  }

  const handleManualMark = async () => {
    if (!rosterEvent || !manualPickId) return
    setManualSaving(true)
    await supabase.from('checkin_records').insert({
      event_id: rosterEvent.id, instructor_id: manualPickId, method: 'manual', marked_by: '大後台',
    })
    setManualPickId('')
    await fetchAll()
    setManualSaving(false)
  }

  const handleRemoveRecord = async (recordId: string) => {
    if (!confirm('確定要移除這筆簽到紀錄嗎？')) return
    await supabase.from('checkin_records').delete().eq('id', recordId)
    await fetchAll()
  }

  const rosterRecords = rosterEvent ? (recordsByEvent[rosterEvent.id] || []).slice().sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()) : []
  const rosterCheckedInIds = new Set(rosterRecords.map(r => r.instructor_id))
  const rosterAvailable = instructors.filter(i => !rosterCheckedInIds.has(i.id))

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">活動簽到</h2>
          <p className="text-stone-400 mt-1 text-sm">種子戶共識會／活動打卡簽到管理</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <PlusIcon />新增活動
        </button>
      </div>

      <div className="space-y-4">
        {pageLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-stone-100 rounded-2xl p-5 h-24 shadow-sm animate-pulse" />
        ))}
        {!pageLoading && events.length === 0 && (
          <div className="bg-white border border-stone-100 rounded-2xl p-12 text-center text-stone-400"><p>尚未建立任何簽到活動</p></div>
        )}
        {events.map(ev => {
          const status = getStatus(ev)
          const count = (recordsByEvent[ev.id] || []).length
          return (
            <div key={ev.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-stone-800 font-bold text-base">{ev.title}</p>
                  <StatusBadge status={status} />
                </div>
                <p className="text-stone-500 text-sm mt-1">{formatRange(ev.checkin_start_at, ev.checkin_end_at)}{ev.location ? ` · ${ev.location}` : ''}</p>
                {ev.description && <p className="text-stone-400 text-xs mt-1 line-clamp-2">{ev.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setRosterEvent(ev)}
                  className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium px-3 py-2 rounded-md hover:bg-orange-100 transition-colors whitespace-nowrap">
                  <UsersIcon />簽到名單（{count}）
                </button>
                <button onClick={() => openEdit(ev)} aria-label="編輯活動"
                  className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-500 shrink-0">
                  <EditIcon />
                </button>
                <button onClick={() => handleDelete(ev)} aria-label="刪除活動"
                  className="w-8 h-8 flex items-center justify-center border border-stone-200 rounded-md hover:bg-rose-50 transition-colors text-rose-500 shrink-0">
                  <TrashIcon />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 新增／編輯活動 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <form onSubmit={handleSubmit} className="relative bg-white border border-stone-200 rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto flex flex-col gap-4 pt-8 pb-4 px-5">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-2.5 right-3 bg-white border border-stone-200 rounded-full p-1.5 hover:bg-stone-50 transition-colors" aria-label="關閉">
              <CloseIcon className="text-stone-600" />
            </button>
            <div className="border-b border-stone-100 pb-4 w-full flex flex-col items-center">
              <p className="font-medium text-lg leading-7 text-stone-600">{editTarget ? '編輯簽到活動' : '新增簽到活動'}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
                  <span className="text-red-500 text-xs leading-none">*</span>活動名稱
                </label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="例：7 月種子戶共識會"
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-600">活動說明</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="選填，例如議程或注意事項"
                  className="w-full h-16 bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
                  <span className="text-red-500 text-xs leading-none">*</span>活動日期
                </label>
                <input required type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-2">
                  <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
                    <span className="text-red-500 text-xs leading-none">*</span>簽到開始
                  </label>
                  <input required type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
                    <span className="text-red-500 text-xs leading-none">*</span>簽到結束
                  </label>
                  <input required type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-600">地點</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="例：社區活動中心"
                  className="w-full bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors mt-2">
              {saving ? '儲存中...' : editTarget ? '儲存活動' : '建立活動'}
            </button>
          </form>
        </div>
      )}

      {/* 簽到名單 Modal */}
      {rosterEvent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setRosterEvent(null) }}>
          <div className="relative bg-white border border-stone-200 rounded-2xl w-full max-w-[420px] max-h-[90vh] overflow-y-auto flex flex-col gap-4 pt-8 pb-4 px-5">
            <button type="button" onClick={() => setRosterEvent(null)} className="absolute top-2.5 right-3 bg-white border border-stone-200 rounded-full p-1.5 hover:bg-stone-50 transition-colors" aria-label="關閉">
              <CloseIcon className="text-stone-600" />
            </button>
            <div className="border-b border-stone-100 pb-4 w-full flex flex-col items-center">
              <p className="font-medium text-lg leading-7 text-stone-600">{rosterEvent.title}</p>
              <p className="text-xs text-stone-400 mt-1">{formatRange(rosterEvent.checkin_start_at, rosterEvent.checkin_end_at)}</p>
            </div>

            <div className="flex flex-col gap-2">
              {rosterRecords.length === 0 && (
                <p className="text-center text-stone-400 text-sm py-6">還沒有人簽到</p>
              )}
              {rosterRecords.map(r => {
                const inst = instructorMap[r.instructor_id]
                const t = new Date(r.checked_in_at)
                const pad = (n: number) => String(n).padStart(2, '0')
                return (
                  <div key={r.id} className="flex items-center gap-3 border border-stone-100 rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center overflow-hidden shrink-0">
                      {inst?.avatar_url ? <img src={inst.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-orange-600 font-bold text-sm">{inst?.name?.[0] || '?'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-700 truncate">{inst?.name || '（已刪除的講師）'}</p>
                      <p className="text-xs text-stone-400">{pad(t.getHours())}:{pad(t.getMinutes())} · {r.method === 'manual' ? '大後台手動標記' : '自行簽到'}</p>
                    </div>
                    <button onClick={() => handleRemoveRecord(r.id)} aria-label="移除紀錄" className="text-stone-300 hover:text-rose-500 transition-colors shrink-0">
                      <CloseIcon />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-stone-100 pt-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-stone-600">手動標記已出席</label>
              <div className="flex gap-2">
                <select value={manualPickId} onChange={e => setManualPickId(e.target.value)}
                  className="flex-1 min-w-0 bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200">
                  <option value="">選擇種子戶／講師</option>
                  {rosterAvailable.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <button onClick={handleManualMark} disabled={!manualPickId || manualSaving}
                  className="shrink-0 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                  {manualSaving ? '標記中...' : '標記'}
                </button>
              </div>
              <p className="text-xs text-stone-400">給現場沒帶手機、忘記自行簽到的種子戶事後補登用</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
