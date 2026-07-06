'use client'

import React, { useEffect, useState } from 'react'
  import { createClient } from '@/lib/supabase'
import CourseScheduleExporter from '@/components/CourseScheduleExporter'
import CoursePosterEditor from '@/components/CoursePosterEditor'

interface Instructor { id: string; name: string }
interface Category { id: string; name: string; color: string }

const LOCATIONS = ['C 小客廳', 'D 小客廳', '閱覽室 1', '閱覽室 2', '其他']
const HOURS = Array.from({length: 12}, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']
const NOTES_MAX = 40

const emptyForm = {
  title: '', description: '', date: '',
  period_start: 'AM', hour_start: '09', min_start: '00',
  period_end: 'AM', hour_end: '10', min_end: '00',
  location: '', custom_location: '', max_seats: 20,
  poster_url: '', instructor_id: '', instructor_ids: [] as string[], category_id: '',
  notes: '', suitable_age: '全年齡',
}

function toTime(period: string, hour: string, min: string) {
  let h = parseInt(hour)
  if (period === 'AM' && h === 12) h = 0
  if (period === 'PM' && h !== 12) h += 12
  return `${String(h).padStart(2,'0')}:${min}`
}
function fromTime(time: string) {
  if (!time) return { period: 'AM', hour: '09', min: '00' }
  const [hStr, minStr] = time.split(':')
  let h = parseInt(hStr); const min = minStr || '00'
  const period = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12; else if (h > 12) h -= 12
  return { period, hour: String(h).padStart(2,'0'), min }
}

function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('-')[1]) - 1 : today.getMonth())
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const weeks: (number|null)[][] = []
  let week: (number|null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = [] } }
  if (week.length) weeks.push([...week, ...Array(7-week.length).fill(null)])
  const selDay = value ? parseInt(value.split('-')[2]) : null
  const selMon = value ? parseInt(value.split('-')[1]) - 1 : null
  const selYear = value ? parseInt(value.split('-')[0]) : null
  const isPast = (d: number) => { const date = new Date(viewYear, viewMonth, d); const t = new Date(); t.setHours(0,0,0,0); return date < t }
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-lg w-72 z-50">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y=>y-1) } else setViewMonth(m=>m-1) }} className="p-1 hover:bg-stone-100 rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="text-sm font-semibold text-stone-700">{viewYear} 年 {monthNames[viewMonth]}</span>
        <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y=>y+1) } else setViewMonth(m=>m+1) }} className="p-1 hover:bg-stone-100 rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">{['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}</div>
      {weeks.map((wk, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {wk.map((d, di) => {
            const isSel = d && selDay === d && selMon === viewMonth && selYear === viewYear
            const isToday = d && today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear
            const past = d && isPast(d)
            return <button key={di} type="button" disabled={!!past} onClick={() => d && !past && onChange(`${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)}
              className={`text-center text-sm py-1.5 rounded-lg transition-colors ${!d ? '' : past ? 'text-stone-300 cursor-not-allowed' : isSel ? 'bg-orange-500 text-white' : isToday ? 'bg-orange-50 text-orange-600' : 'hover:bg-stone-100 text-stone-700'}`}>{d || ''}</button>
          })}
        </div>
      ))}
      <p className="text-xs text-stone-400 text-center mt-2">灰色為過去日期，無法選擇</p>
    </div>
  )
}

function TimePicker({
  period, hour, min, prefix, form, setForm, validateTimes,
}: {
  period: string; hour: string; min: string; prefix: 'start' | 'end'
  form: typeof emptyForm; setForm: (f: typeof emptyForm) => void; validateTimes: (f: typeof emptyForm) => boolean
}) {
  return (
    <div className="grid grid-cols-[72px_1fr_1fr] gap-1.5 w-full">
      <select value={period} onChange={e => { const f = {...form, [`period_${prefix}`]: e.target.value}; setForm(f); validateTimes(f) }} className="w-full border border-stone-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
        <option value="AM">上午</option>
        <option value="PM">下午</option>
      </select>
      <select value={hour} onChange={e => { const f = {...form, [`hour_${prefix}`]: e.target.value}; setForm(f); validateTimes(f) }} className="w-full border border-stone-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
        {HOURS.map(h => <option key={h} value={h}>{h} 時</option>)}
      </select>
      <select value={min} onChange={e => { const f = {...form, [`min_${prefix}`]: e.target.value}; setForm(f); validateTimes(f) }} className="w-full border border-stone-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
        {MINUTES.map(m => <option key={m} value={m}>{m} 分</option>)}
      </select>
    </div>
  )
}

function InstructorDropdown({ instructors, selectedIds, onChange }: {
  instructors: Instructor[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedNames = instructors.filter(i => selectedIds.includes(i.id)).map(i => i.name)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
        <span className={selectedIds.length ? 'text-stone-800' : 'text-stone-400'}>
          {selectedIds.length ? selectedNames.join('、') : '選擇講師'}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-stone-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
          {instructors.map(inst => {
            const checked = selectedIds.includes(inst.id)
            return (
              <label key={inst.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 cursor-pointer transition-colors">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-orange-500 border-orange-500' : 'border-stone-300'}`}>
                  {checked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="text-sm text-stone-700">{inst.name}</span>
                <input type="checkbox" className="hidden" checked={checked} onChange={() => {
                  const next = checked ? selectedIds.filter(id => id !== inst.id) : [...selectedIds, inst.id]
                  onChange(next)
                }} />
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [scheduleSettings, setScheduleSettings] = useState<any>({})
  const [showCatModal, setShowCatModal] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState({ name: '', color: '#e11d48' })
  const [catLoading, setCatLoading] = useState(false)
  const PRESET_COLORS = ['#e11d48','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#2563eb','#0d9488']
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [mainTab, setMainTab] = useState<'courses' | 'categories'>('courses')
  const [courseTab, setCourseTab] = useState<'active' | 'ended'>('active')
  const [filterMonth, setFilterMonth] = useState('')
  const [uploading, setUploading] = useState(false)
  const [timeError, setTimeError] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [attendanceModal, setAttendanceModal] = useState<any>(null)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)   const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [posterEditorCourse, setPosterEditorCourse] = useState<any>(null)
  const [posterInitialImage, setPosterInitialImage] = useState<string | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  const fetchAll = async () => {
    const [{ data: c }, { data: i }, { data: cat }, { data: siteSettings }] = await Promise.all([
      supabase.from('courses').select('*, course_categories(name, color), instructor_ids').order('date', { ascending: false }),
      supabase.from('instructors').select('id, name').eq('is_active', true).order('created_at'),
      supabase.from('course_categories').select('*').order('created_at'),
      supabase.from('site_settings').select('key, value'),
    ])
    const instructorsData = i || []
    const coursesData = (c as any) || []
    const enriched = coursesData.map((course: any) => ({
      ...course,
      instructor_names: (course.instructor_ids || [])
        .map((id: string) => instructorsData.find((inst: any) => inst.id === id)?.name)
        .filter(Boolean),
    }))
    setCourses(enriched)
    setInstructors(instructorsData)
    setCategories(cat || [])
    if (siteSettings) {
      const map = Object.fromEntries(siteSettings.map((s: any) => [s.key, s.value || '']))
      setScheduleSettings(map)
    }
    setPageLoading(false)
  }
  useEffect(() => { fetchAll() }, [])

  const validateTimes = (f: typeof emptyForm) => {
    const start = toTime(f.period_start, f.hour_start, f.min_start)
    const end = toTime(f.period_end, f.hour_end, f.min_end)
    if (end <= start) { setTimeError('結束時間不能早於或等於開始時間'); return false }
    setTimeError(''); return true
  }

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setTimeError(''); setShowModal(true) }

  const openEdit = (course: any) => {
    setEditTarget(course)
    const s = fromTime(course.time_start); const e = fromTime(course.time_end)
    setForm({
      title: course.title, description: course.description || '', date: course.date,
      period_start: s.period, hour_start: s.hour, min_start: s.min,
      period_end: e.period, hour_end: e.hour, min_end: e.min,
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : course.location,
      max_seats: course.max_seats, poster_url: course.poster_url || '',
      instructor_id: course.instructor_id || '',
      instructor_ids: course.instructor_ids || (course.instructor_id ? [course.instructor_id] : []),
      category_id: course.category_id || '',
      notes: course.notes || '', suitable_age: course.suitable_age || '全年齡',
    })
    setTimeError(''); setShowModal(true)
  }

  const openCopy = (course: any) => {
    const tS = fromTime(course.time_start); const tE = fromTime(course.time_end)
    setEditTarget(null)
    setForm({
      title: course.title, description: course.description || '', date: '',
      period_start: tS.period, hour_start: tS.hour, min_start: tS.min,
      period_end: tE.period, hour_end: tE.hour, min_end: tE.min,
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : course.location,
      max_seats: course.max_seats, poster_url: course.poster_url || '',
      instructor_id: course.instructor_id || '',
      instructor_ids: course.instructor_ids || (course.instructor_id ? [course.instructor_id] : []),
      category_id: course.category_id || '',
      notes: course.notes || '', suitable_age: course.suitable_age || '全年齡',
    })
    setTimeError(''); setShowModal(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true)
    const filename = `posters/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true })
    if (!error && data) { const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename); setForm(f => ({ ...f, poster_url: urlData.publicUrl })) }
    setUploading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!validateTimes(form)) return; setLoading(true)
    const location = form.location === '其他' ? form.custom_location : form.location
    const resolvedInstructorIds = form.instructor_ids.length > 0 ? form.instructor_ids : (form.instructor_id ? [form.instructor_id] : [])
    const payload = {
      title: form.title, description: form.description, date: form.date,
      time_start: toTime(form.period_start, form.hour_start, form.min_start),
      time_end: toTime(form.period_end, form.hour_end, form.min_end),
      location, max_seats: form.max_seats, poster_url: form.poster_url || null,
      instructor_id: resolvedInstructorIds[0] || null,
      instructor_ids: resolvedInstructorIds,
      category_id: form.category_id || null,
      notes: form.notes || null, suitable_age: form.suitable_age || '全年齡',
    }
    if (editTarget) {
      const { error } = await supabase.from('courses').update(payload).eq('id', editTarget.id)
      if (error) { alert('更新失敗：' + error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('courses').insert({ ...payload, is_active: true })
      if (error) { alert('新增失敗：' + error.message); setLoading(false); return }
    }
    setShowModal(false); await fetchAll(); setLoading(false)
  }

  const toggleActive = async (id: string, current: boolean) => { await supabase.from('courses').update({ is_active: !current }).eq('id', id); fetchAll() }
  const handleDelete = async (id: string) => { if (!confirm('確定要刪除這個課程嗎？')) return; await supabase.from('courses').delete().eq('id', id); fetchAll() }

  const openAttendance = async (course: any) => {
    setAttendanceModal(course)
    setAttendanceLoading(true)
    setCheckedIds(new Set())
    const { data: regs } = await supabase
      .from('registrations')
      .select('id, status, users(id, name, room_number, line_id)')
      .eq('course_id', course.id)
      .in('status', ['confirmed', 'attended'])
      .order('registered_at')
    setAttendanceList(regs || [])
    const attended = new Set((regs || []).filter((r: any) => r.status === 'attended').map((r: any) => r.id))
    setCheckedIds(attended)
    setAttendanceLoading(false)
  }

  const saveAttendance = async () => {
    setAttendanceSaving(true)
    for (const reg of attendanceList) {
      const shouldAttend = checkedIds.has(reg.id)
      const isAttended = reg.status === 'attended'
      if (shouldAttend && !isAttended) {
        await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: attendanceModal.title, lineUserId: reg.users?.line_id || '', action: 'attend' }) })
      } else if (!shouldAttend && isAttended) {
        await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: attendanceModal.title, lineUserId: reg.users?.line_id || '', action: 'unattend' }) })
      }
    }
    setAttendanceSaving(false)
    setAttendanceModal(null)
    await fetchAll()
  }

  const now = new Date()
  const isExpired = (course: any) => new Date(`${course.date}T${course.time_end}`) < now
  const endedCourses = courses.filter((c: any) => isExpired(c))
  const availableMonths = Array.from(new Set(endedCourses.map((c: any) => c.date?.slice(0, 7)).filter(Boolean))).sort().reverse() as string[]
  const displayCourses = courseTab === 'active'
    ? courses.filter((c: any) => c.is_active && !isExpired(c))
    : endedCourses.filter((c: any) => filterMonth ? c.date?.startsWith(filterMonth) : true)
  const notesCount = form.notes.length
  const notesOver = notesCount > NOTES_MAX

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-stone-800 text-2xl font-bold">課程管理</h2>
        {mainTab === 'courses' ? (
          <div className="flex items-center gap-2">
            <CourseScheduleExporter courses={courses} scheduleSettings={scheduleSettings} />
            <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              新增課程
            </button>
          </div>
        ) : (
          <button onClick={() => { setEditCat(null); setCatForm({ name: '', color: '#e11d48' }); setShowCatModal(true) }}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增類別
          </button>
        )}
      </div>

      {/* 主 Tab */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-4 w-fit">
        {([['courses', '課程列表'], ['categories', '課程類別']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mainTab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 課程列表 */}
      {mainTab === 'courses' && (
        <>
          <div className="flex gap-1 p-1 bg-stone-50 border border-stone-200 rounded-lg mb-4 w-fit">
            {([['active', '開放中'], ['ended', '已結束']] as const).map(([t, label]) => (
              <button key={t} onClick={() => { setCourseTab(t); setFilterMonth('') }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${courseTab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                {label}
                <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${courseTab === t ? 'bg-stone-100 text-stone-500' : 'bg-stone-100 text-stone-400'}`}>
                  {t === 'active' ? courses.filter((c: any) => c.is_active && !isExpired(c)).length : endedCourses.length}
                </span>
              </button>
            ))}
          </div>

          {courseTab === 'ended' && availableMonths.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-stone-400 font-medium">篩選月份</span>
              <button onClick={() => setFilterMonth('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterMonth === '' ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                全部
              </button>
              {availableMonths.map(m => {
                const [y, mo] = m.split('-')
                return (
                  <button key={m} onClick={() => setFilterMonth(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterMonth === m ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                    {y}/{parseInt(mo)}月
                  </button>
                )
              })}
            </div>
          )}

          <div className="space-y-3">
            {pageLoading && Array.from({length: 3}).map((_, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-stone-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-stone-100 rounded w-1/4" />
                  <div className="h-4 bg-stone-100 rounded w-1/2" />
                  <div className="h-3 bg-stone-100 rounded w-2/3" />
                </div>
              </div>
            ))}
            {!pageLoading && displayCourses.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400"><p>尚無課程</p></div>
            )}
            {displayCourses.map((course: any) => {
              const expired = isExpired(course)
              const displayInstructors = course.instructor_names?.length > 0
                ? course.instructor_names.join('、')
                : course.instructors?.name || ''
              return (
                <div key={course.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                  {course.poster_url && <img src={course.poster_url} alt={course.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {expired
                        ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-500">已結束</span>
                        : <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{course.is_active ? '開放報名' : '已關閉'}</span>}
                      {course.course_categories && <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: course.course_categories.color }}>{course.course_categories.name}</span>}
                    </div>
                    <p className="text-stone-800 font-semibold truncate">{course.title}</p>
                    <p className="text-stone-400 text-sm mt-0.5">
                      {course.date} · {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)} · {course.location}
                      {displayInstructors && <span className="ml-2">· {displayInstructors}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!expired ? (
                      <>
                        <button onClick={() => openEdit(course)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors font-medium">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          編輯課程
                        </button>
                    
                        <button onClick={() => toggleActive(course.id, course.is_active)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${course.is_active ? 'bg-orange-500' : 'bg-stone-200'}`}
                          title={course.is_active ? '關閉報名' : '開放報名'}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${course.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <button onClick={() => handleDelete(course.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-400 hover:text-red-600">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => openAttendance(course)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                          出席紀錄
                        </button>
                        <button onClick={() => openCopy(course)}
                          className="flex items-center gap-1.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg transition-colors font-medium">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          複製課程
                        </button>
                  
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* 課程類別 Tab */}
      {mainTab === 'categories' && (
        <div>
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            {categories.length === 0 && <div className="p-12 text-center text-stone-400">尚無類別</div>}
            {categories.map((cat, i) => (
              <div key={cat.id} className={`flex items-center justify-between px-5 py-4 ${i < categories.length - 1 ? 'border-b border-stone-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-stone-700 font-medium">{cat.name}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{ backgroundColor: cat.color }}>{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditCat(cat); setCatForm({ name: cat.name, color: cat.color }); setShowCatModal(true) }}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={async () => { if (!confirm('確定要刪除這個類別嗎？')) return; await supabase.from('course_categories').delete().eq('id', cat.id); fetchAll() }}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors text-stone-400 hover:text-red-500">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 課程類別彈窗 */}
      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowCatModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="text-stone-800 font-bold">{editCat ? '編輯類別' : '新增類別'}</h3>
              <button onClick={() => setShowCatModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">類別名稱 *</label>
                <input required value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})}
                  placeholder="例：AI 學習相關"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-2">標籤顏色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setCatForm({...catForm, color})}
                      className={`w-8 h-8 rounded-full transition-transform ${catForm.color === color ? 'scale-125 ring-2 ring-offset-2 ring-stone-400' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: catForm.color }} />
                  <span className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ backgroundColor: catForm.color }}>{catForm.name || '預覽'}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button disabled={catLoading || !catForm.name} onClick={async () => {
                  setCatLoading(true)
                  if (editCat) await supabase.from('course_categories').update({ name: catForm.name, color: catForm.color }).eq('id', editCat.id)
                  else await supabase.from('course_categories').insert({ name: catForm.name, color: catForm.color })
                  setShowCatModal(false); await fetchAll(); setCatLoading(false)
                }} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {catLoading ? '儲存中...' : '儲存'}
                </button>
                <button onClick={() => setShowCatModal(false)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 出席紀錄彈窗 */}
      {attendanceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setAttendanceModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-800">{attendanceModal.title}</h3>
                <p className="text-stone-400 text-xs mt-0.5">{attendanceModal.date} · 出席紀錄</p>
              </div>
              <button onClick={() => setAttendanceModal(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {attendanceLoading ? (
                <div className="text-center py-8 text-stone-400 text-sm">載入中...</div>
              ) : attendanceList.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">此課程尚無報名者</div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-stone-400 mb-4">勾選代表已出席，取消勾選代表撤銷出席（點數同步調整）</p>
                  {attendanceList.map((reg: any) => (
                    <label key={reg.id} className="flex items-center gap-3 bg-stone-50 rounded-xl px-4 py-3 border border-stone-100 cursor-pointer hover:bg-orange-50 hover:border-orange-200 transition-colors">
                      <input type="checkbox" checked={checkedIds.has(reg.id)}
                        onChange={e => { const next = new Set(checkedIds); e.target.checked ? next.add(reg.id) : next.delete(reg.id); setCheckedIds(next) }}
                        className="w-4 h-4 accent-orange-500 cursor-pointer" />
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-700 text-sm font-medium">{reg.users?.name}</p>
                        <p className="text-stone-400 text-xs">{reg.users?.room_number}</p>
                      </div>
                      {checkedIds.has(reg.id) && (
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          出席
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
              <p className="text-xs text-stone-400">已勾選 {checkedIds.size} / {attendanceList.length} 人</p>
              <div className="flex gap-2">
                <button onClick={() => setAttendanceModal(null)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm rounded-xl transition-colors">取消</button>
                <button onClick={saveAttendance} disabled={attendanceSaving} className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white text-sm font-medium rounded-xl transition-colors">
                  {attendanceSaving ? '儲存中...' : '儲存出席紀錄'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯課程彈窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setShowCalendar(false) }}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-200 sticky top-0 bg-white z-10">
              <h3 className="text-stone-800 font-bold text-lg">
                {editTarget ? '編輯課程' : form.title ? `複製課程` : '新增課程'}
              </h3>
              <button onClick={() => { setShowModal(false); setShowCalendar(false) }} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程名稱 *</label>
                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程說明</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">
                    講師 <span className="text-stone-400 font-normal">（可多選）</span>
                  </label>
                <InstructorDropdown
                  instructors={instructors}
                  selectedIds={form.instructor_ids}
                  onChange={ids => setForm({...form, instructor_ids: ids, instructor_id: ids[0] || ''})}
                />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程類別</label>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => setForm({...form, category_id: ''})}
                    className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${!form.category_id ? 'bg-stone-700 text-white border-stone-700' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}>
                    不分類
                  </button>
                  {categories.map(c => {
                    const selected = form.category_id === c.id
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setForm({...form, category_id: selected ? '' : c.id})}
                        className="px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors"
                        style={selected
                          ? { backgroundColor: c.color, borderColor: c.color, color: 'white' }
                          : { backgroundColor: 'white', borderColor: '#d6d3d1', color: '#57534e' }}>
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
                    
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">適合年齡</label>
                <input value={form.suitable_age} onChange={e => setForm({...form, suitable_age: e.target.value})}
                  placeholder="例：全年齡、18歲以上、親子（6歲以上）"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="relative">
                <label className="block text-stone-600 text-sm font-medium mb-1.5">活動日期 *</label>
                <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <span className={form.date ? 'text-stone-800' : 'text-stone-400'}>{form.date || '選擇日期'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </button>
                {showCalendar && <div className="absolute top-full left-0 mt-1 z-20"><CalendarPicker value={form.date} onChange={v => { setForm({...form, date: v}); setShowCalendar(false) }} /></div>}
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-2">時間 *</label>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-400 mb-1.5">開始</p>
                    <TimePicker period={form.period_start} hour={form.hour_start} min={form.min_start} prefix="start" form={form} setForm={setForm} validateTimes={validateTimes} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-stone-400 mb-1.5">結束</p>
                    <TimePicker period={form.period_end} hour={form.hour_end} min={form.min_end} prefix="end" form={form} setForm={setForm} validateTimes={validateTimes} />
                  </div>
                </div>
                {timeError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{timeError}</p>}
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">地點 *</label>
                <select required value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                  <option value="">選擇地點</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              {form.location === '其他' && <input required value={form.custom_location} onChange={e => setForm({...form, custom_location: e.target.value})} placeholder="請填寫實際地點" className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />}
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">名額上限 *</label>
                <input required type="number" min="1"
                  value={form.max_seats === 0 ? '' : form.max_seats}
                  onChange={e => { const val = e.target.value; setForm({...form, max_seats: val === '' ? 0 : Math.max(1, parseInt(val) || 0)}) }}
                  onBlur={e => { if (!e.target.value || parseInt(e.target.value) < 1) setForm({...form, max_seats: 1}) }}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-stone-600 text-sm font-medium">注意事項 <span className="text-stone-400 font-normal">（選填，最多顯示兩行）</span></label>
                  <span className={`text-xs font-medium tabular-nums ${notesOver ? 'text-red-500' : notesCount >= NOTES_MAX * 0.8 ? 'text-orange-500' : 'text-stone-400'}`}>{notesCount} / {NOTES_MAX}</span>
                </div>
                <textarea value={form.notes}
                  onChange={e => { const newVal = e.target.value; if (newVal.length <= NOTES_MAX || newVal.length < form.notes.length) setForm({...form, notes: newVal}) }}
                  rows={2} placeholder="例：閱覽室內書籍僅供室內閱讀，不可私自帶離。"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${notesOver ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-stone-300 focus:ring-orange-300'}`} />
                {notesOver && <p className="text-red-500 text-xs mt-1">已達字數上限（{NOTES_MAX} 字），請刪減內容</p>}
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程海報</label>
                <p className="text-stone-400 text-xs mb-2">建議尺寸：A4 比例（595 × 842px），小於 2MB，JPG / PNG</p>
                <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-stone-300 hover:border-orange-300 rounded-xl py-4 cursor-pointer transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span className="text-sm text-stone-500">{uploading ? '上傳中...' : '點擊上傳海報圖片'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                {form.poster_url && (
                  <div className="mt-2 relative">
                    <img src={form.poster_url} alt="海報預覽" className="w-full rounded-xl object-contain" style={{ maxHeight: '480px' }} />
                    <button type="button" onClick={() => setForm({...form, poster_url: ''})} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading || !form.date || !!timeError || notesOver} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? '儲存中...' : editTarget ? '更新課程' : '新增課程'}
                </button>
                <button type="button" onClick={() => { setShowModal(false); setShowCalendar(false) }} className="px-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">取消</button>
              </div>
              <button type="button" onClick={() => {
                setShowModal(false)
                setPosterEditorCourse(editTarget || { title: form.title, time_start: toTime(form.period_start, form.hour_start, form.min_start), time_end: toTime(form.period_end, form.hour_end, form.min_end), location: form.location === '其他' ? form.custom_location : form.location, suitable_age: form.suitable_age, notes: form.notes, instructor_names: form.instructor_ids.map((id: string) => instructors.find((i: any) => i.id === id)?.name).filter(Boolean) })
                setPosterInitialImage(form.poster_url || null)
              }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-stone-300 hover:border-orange-400 text-stone-500 hover:text-orange-500 text-sm transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                製作課程海報
              </button>
              {editTarget && (
                <button type="button" onClick={async () => {
                  if (!confirm('確定要刪除這個課程嗎？')) return
                  setShowModal(false)
                  await handleDelete(editTarget.id)
                }} className="w-full text-center text-xs text-red-400 hover:text-red-600 transition-colors pt-1">
                  刪除此課程
                </button>
              )}
            </form>
          </div>
        </div>
      )}
   {posterEditorCourse && (
        <CoursePosterEditor
          course={{
            title: posterEditorCourse.title,
            instructor: posterEditorCourse.instructor_names?.join('、') || posterEditorCourse.instructors?.name || '',
            date: posterEditorCourse.date,
            timeStart: posterEditorCourse.time_start?.slice(0, 5),
            timeEnd: posterEditorCourse.time_end?.slice(0, 5),
            location: posterEditorCourse.location,
            suitableAge: posterEditorCourse.suitable_age,
            notes: posterEditorCourse.notes,
          }}
          initialImage={posterInitialImage}
          onClose={() => {
            setPosterEditorCourse(null)
            setPosterInitialImage(null)
            if (editTarget) openEdit(editTarget)
          }}
        />
      )}


    </div>
  )
}
