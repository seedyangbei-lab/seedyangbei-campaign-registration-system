'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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
  poster_url: '', instructor_id: '', category_id: '',
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
      <select
        value={period}
        onChange={e => { const f = {...form, [`period_${prefix}`]: e.target.value}; setForm(f); validateTimes(f) }}
        className="w-full border border-stone-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
      >
        <option value="AM">上午</option>
        <option value="PM">下午</option>
      </select>
      <select
        value={hour}
        onChange={e => { const f = {...form, [`hour_${prefix}`]: e.target.value}; setForm(f); validateTimes(f) }}
        className="w-full border border-stone-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
      >
        {HOURS.map(h => <option key={h} value={h}>{h} 時</option>)}
      </select>
      <select
        value={min}
        onChange={e => { const f = {...form, [`min_${prefix}`]: e.target.value}; setForm(f); validateTimes(f) }}
        className="w-full border border-stone-300 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
      >
        {MINUTES.map(m => <option key={m} value={m}>{m} 分</option>)}
      </select>
    </div>
  )
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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
  const supabase = createClient()

  const fetchAll = async () => {
    const [{ data: c }, { data: i }, { data: cat }] = await Promise.all([
      supabase.from('courses').select('*, instructors(name), course_categories(name, color)').order('date', { ascending: false }),
      supabase.from('instructors').select('id, name').eq('is_active', true),
      supabase.from('course_categories').select('*').order('created_at'),
    ])
    setCourses((c as any) || []); setInstructors(i || []); setCategories(cat || [])
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
      instructor_id: course.instructor_id || '', category_id: course.category_id || '',
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
    const payload = {
      title: form.title, description: form.description, date: form.date,
      time_start: toTime(form.period_start, form.hour_start, form.min_start),
      time_end: toTime(form.period_end, form.hour_end, form.min_end),
      location, max_seats: form.max_seats, poster_url: form.poster_url || null,
      instructor_id: form.instructor_id || null, category_id: form.category_id || null,
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

  const now = new Date()
  const isExpired = (course: any) => new Date(`${course.date}T${course.time_end}`) < now

  const endedCourses = courses.filter((c: any) => isExpired(c))
  const availableMonths = Array.from(
    new Set(endedCourses.map((c: any) => c.date?.slice(0, 7)).filter(Boolean))
  ).sort().reverse() as string[]

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
          <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增課程
          </button>
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

      {/* 課程列表次級篩選 */}
      {mainTab === 'courses' && (
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
      )}
      
      {/* 已結束：月份篩選 */}
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
        {displayCourses.length === 0 && <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400"><p>尚無課程</p></div>}
        {displayCourses.map((course: any) => {
          const expired = isExpired(course)
          return (
            <div key={course.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              {course.poster_url && <img src={course.poster_url} alt={course.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {expired ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-500">已結束</span>
                    : <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{course.is_active ? '開放報名' : '已關閉'}</span>}
                  {course.course_categories && <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: course.course_categories.color }}>{course.course_categories.name}</span>}
                </div>
                <p className="text-stone-800 font-semibold truncate">{course.title}</p>
                <p className="text-stone-400 text-sm mt-0.5">{course.date} · {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)} · {course.location}{course.instructors && <span className="ml-2">· {course.instructors.name}</span>}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(course)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                {!expired && <button onClick={() => toggleActive(course.id, course.is_active)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${course.is_active ? 'bg-stone-100 hover:bg-stone-200 text-stone-600' : 'bg-green-50 hover:bg-green-100 text-green-700'}`}>{course.is_active ? '關閉' : '開放'}</button>}
                <button onClick={() => handleDelete(course.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-stone-400 hover:text-red-500">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {/* 課程類別 Tab 內容 */}
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
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setShowCalendar(false) }}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-200 sticky top-0 bg-white z-10">
              <h3 className="text-stone-800 font-bold text-lg">{editTarget ? '編輯課程' : '新增課程'}</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">講師</label>
                  <select value={form.instructor_id} onChange={e => setForm({...form, instructor_id: e.target.value})} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                    <option value="">選擇講師</option>
                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">課程類別</label>
                  <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                    <option value="">選擇類別</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
                    <TimePicker
                      period={form.period_start} hour={form.hour_start} min={form.min_start}
                      prefix="start" form={form} setForm={setForm} validateTimes={validateTimes}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-stone-400 mb-1.5">結束</p>
                    <TimePicker
                      period={form.period_end} hour={form.hour_end} min={form.min_end}
                      prefix="end" form={form} setForm={setForm} validateTimes={validateTimes}
                    />
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
                <input required type="number" min="1" value={form.max_seats} onChange={e => setForm({...form, max_seats: Number(e.target.value)})} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-stone-600 text-sm font-medium">
                    注意事項 <span className="text-stone-400 font-normal">（選填，最多顯示兩行）</span>
                  </label>
                  <span className={`text-xs font-medium tabular-nums ${notesOver ? 'text-red-500' : notesCount >= NOTES_MAX * 0.8 ? 'text-orange-500' : 'text-stone-400'}`}>
                    {notesCount} / {NOTES_MAX}
                  </span>
                </div>
                <textarea
                  value={form.notes}
                  onChange={e => {
                    const newVal = e.target.value
                    if (newVal.length <= NOTES_MAX || newVal.length < form.notes.length) {
                      setForm({...form, notes: newVal})
                    }
                  }}
                  rows={2}
                  placeholder="例：閱覽室內書籍僅供室內閱讀，不可私自帶離。"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${notesOver ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-stone-300 focus:ring-orange-300'}`}
                />
                {notesOver && (
                  <p className="text-red-500 text-xs mt-1">已達字數上限（{NOTES_MAX} 字），請刪減內容</p>
                )}
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
                    <img src={form.poster_url} alt="海報預覽" className="w-full h-32 object-cover rounded-xl" />
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
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
