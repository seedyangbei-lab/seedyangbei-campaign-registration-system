'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CoursePosterEditor from '@/components/CoursePosterEditor'
import {
  InstructorNavbar, InstructorProfileCard, InstructorTitle, InstructorTabBar,
  InstructorCourseCard, InstructorMonthFilter, InstructorProfileEditModal,
  CloseIcon, PosterIcon,
} from '@/components/InstructorMobileUI'
import { MobileRegistrationCard, MobilePagination } from '@/components/AdminMobileUI'
import CoursePhotoGrid from '@/components/CoursePhotoGrid'
import SuitableAgeSelector, { AGE_OPTIONS } from '@/components/SuitableAgeSelector'

const ROSTER_PAGE_SIZE = 10
const DESCRIPTION_MAX = 100

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'
const LOCATIONS = ['C 小客廳', 'D 小客廳', '閱覽室 1', '閱覽室 2', '其他']

function getLineLoginUrl() {
  const nonce = Math.random().toString(36).slice(2)
  const statePayload = JSON.stringify({ instructorLogin: true, nonce })
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID,
    redirect_uri: LINE_CALLBACK_URL,
    state: statePayload,
    scope: 'profile openid',
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`
}

const emptyForm = {
  title: '', description: '', date: '', time_start: '', time_end: '',
  location: '', custom_location: '', notes: '', suitable_age: '全年齡', custom_age: '',
  photos: [] as string[], max_seats: 20,
}

const emptyProfileForm = { bio: '', avatar_url: '', phone: '', line_id: '' }

function InstructorPortal() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [status, setStatus] = useState<'checking' | 'not_bound' | 'ready'>('checking')
  const [instructor, setInstructor] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [coursesLoading, setCoursesLoading] = useState(true)

  const [courseTab, setCourseTab] = useState<'active' | 'ended'>('active')
  const [filterMonth, setFilterMonth] = useState('')

  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [profileSaving, setProfileSaving] = useState(false)
  const [toast, setToast] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [posterEditorCourse, setPosterEditorCourse] = useState<any>(null)
  const [posterInitialImage, setPosterInitialImage] = useState<string | null>(null)
  const [posterReturnToEdit, setPosterReturnToEdit] = useState(false)

  const [attendanceModal, setAttendanceModal] = useState<any>(null)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  const [rosterModal, setRosterModal] = useState<any>(null)
  const [rosterList, setRosterList] = useState<any[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterPage, setRosterPage] = useState(1)
  const [rosterConfirmCancelId, setRosterConfirmCancelId] = useState<string | null>(null)
  const [rosterConfirmPermanent, setRosterConfirmPermanent] = useState<string | null>(null)
  const [rosterDeleting, setRosterDeleting] = useState(false)

  useEffect(() => {
    const lineUserParam = searchParams.get('line_user')
    const notFound = searchParams.get('error') === 'not_instructor'

    if (notFound) { setStatus('not_bound'); return }

    if (lineUserParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(lineUserParam))
        localStorage.setItem('instructor_line_user', JSON.stringify(parsed))
        lookupInstructor(parsed.lineUserId)
      } catch { setStatus('not_bound') }
      return
    }

    const stored = localStorage.getItem('instructor_line_user')
    if (stored) {
      try { lookupInstructor(JSON.parse(stored).lineUserId) }
      catch { setStatus('not_bound') }
    } else {
      setStatus('not_bound')
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const lookupInstructor = async (lineUserId: string) => {
    const { data } = await supabase.from('instructors').select('*').eq('line_user_id', lineUserId).maybeSingle()
    if (data) {
      setInstructor(data)
      setProfileForm({ bio: data.bio || '', avatar_url: data.avatar_url || '', phone: data.phone || '', line_id: data.line_id || '' })
      setStatus('ready')
      fetchCourses(data.id)
    } else {
      setStatus('not_bound')
    }
  }

  const fetchCourses = async (instructorId: string) => {
    setCoursesLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('*')
      .contains('instructor_ids', [instructorId])
      .order('date', { ascending: false })
    const list = data || []
    setCourses(list)

    const ids = list.map((c: any) => c.id)
    if (ids.length) {
      const { data: regs } = await supabase
        .from('registrations')
        .select('course_id, status')
        .in('course_id', ids)
        .in('status', ['confirmed', 'attended'])
      const counts: Record<string, number> = {}
      ;(regs || []).forEach((r: any) => { counts[r.course_id] = (counts[r.course_id] || 0) + 1 })
      setRegCounts(counts)
    } else {
      setRegCounts({})
    }
    setCoursesLoading(false)
  }

  const isExpired = (course: any) => new Date(`${course.date}T${course.time_end}`) < new Date()
  const endedCourses = useMemo(() => courses.filter(isExpired), [courses])
  const activeCourses = useMemo(() => courses.filter(c => !isExpired(c)), [courses])
  const availableMonths = useMemo(
    () => Array.from(new Set(endedCourses.map(c => c.date?.slice(0, 7)).filter(Boolean))).sort().reverse() as string[],
    [endedCourses]
  )
  const displayCourses = courseTab === 'active'
    ? activeCourses
    : endedCourses.filter(c => filterMonth ? c.date?.startsWith(filterMonth) : true)

  /* ---------- 個人資料 ---------- */

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const filename = `avatars/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
      setProfileForm(f => ({ ...f, avatar_url: urlData.publicUrl }))
    }
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructor) return
    setProfileSaving(true)
    await supabase.from('instructors').update({
      bio: profileForm.bio,
      avatar_url: profileForm.avatar_url || null,
      phone: profileForm.phone || null,
      line_id: profileForm.line_id || null,
    }).eq('id', instructor.id)
    setInstructor({ ...instructor, ...profileForm })
    setProfileSaving(false)
    setShowProfileModal(false)
    setToast('個人資料已儲存')
  }

  /* ---------- 課程編輯／複製 ---------- */

  const openEdit = (course: any) => {
    setEditTarget(course)
    const agePreset = AGE_OPTIONS.slice(0, 4).includes(course.suitable_age) ? course.suitable_age : (course.suitable_age ? '其他' : '全年齡')
    setForm({
      title: course.title || '', description: course.description || '', date: course.date || '',
      time_start: (course.time_start || '').slice(0, 5), time_end: (course.time_end || '').slice(0, 5),
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : (course.location || ''),
      notes: course.notes || '', suitable_age: agePreset,
      custom_age: agePreset === '其他' ? (course.suitable_age || '') : '',
      photos: (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls : (course.poster_url ? [course.poster_url] : []),
      max_seats: course.max_seats || 20,
    })
    setShowModal(true)
  }

  const openCopy = (course: any) => {
    setEditTarget(null)
    const agePreset = AGE_OPTIONS.slice(0, 4).includes(course.suitable_age) ? course.suitable_age : (course.suitable_age ? '其他' : '全年齡')
    setForm({
      title: course.title || '', description: course.description || '', date: '',
      time_start: (course.time_start || '').slice(0, 5), time_end: (course.time_end || '').slice(0, 5),
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : (course.location || ''),
      notes: course.notes || '', suitable_age: agePreset,
      custom_age: agePreset === '其他' ? (course.suitable_age || '') : '',
      photos: (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls : (course.poster_url ? [course.poster_url] : []),
      max_seats: course.max_seats || 20,
    })
    setShowModal(true)
  }

  const uploadCoursePhoto = async (blob: Blob): Promise<string | null> => {
    const filename = `course-photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { data, error } = await supabase.storage.from('images').upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error || !data) return null
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
    return urlData.publicUrl
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructor) return
    if (form.photos.length === 0) { alert('請至少上傳 1 張課程照片'); return }
    if (form.suitable_age === '其他' && !form.custom_age.trim()) { alert('請填寫適合年齡的說明'); return }
    setSaving(true)

    const location = form.location === '其他' ? form.custom_location : form.location
    const suitableAge = form.suitable_age === '其他' ? form.custom_age : form.suitable_age
    const payload = {
      title: form.title, description: form.description, date: form.date,
      time_start: form.time_start, time_end: form.time_end,
      location, notes: form.notes, suitable_age: suitableAge,
      photo_urls: form.photos, poster_url: form.photos[0] || null, max_seats: form.max_seats,
    }

    if (editTarget) {
      await supabase.from('course_edit_logs').insert({
        course_id: editTarget.id,
        instructor_id: instructor.id,
        before_data: editTarget,
        after_data: { ...editTarget, ...payload },
      })
      await supabase.from('courses').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('courses').insert({
        ...payload,
        instructor_id: instructor.id,
        instructor_ids: [instructor.id],
        is_active: true,
      })
    }

    setShowModal(false)
    setSaving(false)
    fetchCourses(instructor.id)
  }

  const openPosterFromCard = (course: any) => {
    setPosterReturnToEdit(false)
    setPosterEditorCourse({
      title: course.title, instructor: instructor?.name, date: course.date,
      timeStart: (course.time_start || '').slice(0, 5), timeEnd: (course.time_end || '').slice(0, 5),
      location: course.location, suitableAge: course.suitable_age, notes: course.notes,
    })
    setPosterInitialImage((course.photo_urls && course.photo_urls[0]) || course.poster_url || null)
  }

  const openPosterFromForm = () => {
    setPosterReturnToEdit(true)
    setPosterEditorCourse({
      title: form.title, instructor: instructor?.name, date: form.date,
      timeStart: form.time_start, timeEnd: form.time_end,
      location: form.location === '其他' ? form.custom_location : form.location,
      suitableAge: form.suitable_age === '其他' ? form.custom_age : form.suitable_age, notes: form.notes,
    })
    setPosterInitialImage(form.photos[0] || null)
  }

  /* ---------- 出席紀錄 ---------- */

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
    if (instructor) await fetchCourses(instructor.id)
  }

  /* ---------- 報名紀錄（單一課程的名單，複用大後台 AdminMobileUI 元件） ---------- */

  const getInitials = (name?: string) => (name || '?').slice(0, 2).toUpperCase()

  const formatDT = (ts: string) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const openRoster = async (course: any) => {
    setRosterModal(course)
    setRosterPage(1)
    setRosterLoading(true)
    const { data } = await supabase
      .from('registrations')
      .select('*, users(name, room_number, phone, age_group, line_id), courses(id, title, date)')
      .eq('course_id', course.id)
      .in('status', ['confirmed', 'attended', 'cancelled'])
      .order('registered_at', { ascending: false })
    setRosterList(data || [])
    setRosterLoading(false)
  }

  const rosterTotalPages = Math.ceil(rosterList.length / ROSTER_PAGE_SIZE) || 1
  const rosterPaginated = rosterList.slice((rosterPage - 1) * ROSTER_PAGE_SIZE, rosterPage * ROSTER_PAGE_SIZE)

  const handleRosterCancel = async () => {
    if (!rosterConfirmCancelId) return
    setRosterDeleting(true)
    await supabase.from('registrations').update({ status: 'cancelled' }).eq('id', rosterConfirmCancelId)
    setRosterConfirmCancelId(null)
    if (rosterModal) await openRoster(rosterModal)
    setRosterDeleting(false)
  }

  const handleRosterPermanentDelete = async () => {
    if (!rosterConfirmPermanent) return
    setRosterDeleting(true)
    await supabase.from('registrations').delete().eq('id', rosterConfirmPermanent)
    setRosterConfirmPermanent(null)
    if (rosterModal) await openRoster(rosterModal)
    setRosterDeleting(false)
  }

  if (status === 'checking') {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">確認講師身份中…</div>
  }

  if (status === 'not_bound') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-stone-800 font-semibold mb-2">尚未綁定講師身份</p>
          <p className="text-stone-400 text-sm mb-6">請使用負責人提供的邀請連結完成綁定，或以講師本人的 LINE 帳號登入。</p>
          <a href={getLineLoginUrl()} className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors">
            用 LINE 登入
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-10">
      <InstructorNavbar name={instructor?.name} avatarUrl={instructor?.avatar_url} />

      <div className="max-w-md mx-auto">
        <InstructorProfileCard
          name={instructor?.name}
          avatarUrl={instructor?.avatar_url}
          courseCount={courses.length}
          onEdit={() => setShowProfileModal(true)}
        />

        <div className="px-4 pt-6 flex flex-col gap-4">
          <InstructorTitle>我的課程</InstructorTitle>
          <InstructorTabBar
            tab={courseTab}
            onChange={t => { setCourseTab(t); setFilterMonth('') }}
            activeCount={activeCourses.length}
            endedCount={endedCourses.length}
          />

          {courseTab === 'ended' && availableMonths.length > 0 && (
            <InstructorMonthFilter months={availableMonths} value={filterMonth} onChange={setFilterMonth} />
          )}

          {coursesLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-xl h-40 animate-pulse" />
              ))}
            </div>
          )}

          {!coursesLoading && displayCourses.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-10 text-center text-stone-400 text-sm">
              {courseTab === 'active' ? '目前沒有掛在你名下的開課中課程' : '目前沒有已結束的課程'}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {displayCourses.map(c => (
              <InstructorCourseCard
                key={c.id}
                title={c.title}
                date={c.date}
                timeStart={c.time_start?.slice(0, 5)}
                timeEnd={c.time_end?.slice(0, 5)}
                location={c.location}
                ended={isExpired(c)}
                registered={regCounts[c.id] || 0}
                maxSeats={c.max_seats}
                onEdit={() => openEdit(c)}
                onRoster={() => openRoster(c)}
                onPoster={() => openPosterFromCard(c)}
                onAttendance={() => openAttendance(c)}
                onCopy={() => openCopy(c)}
              />
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-[60]">
          {toast}
        </div>
      )}

      {showProfileModal && (
        <InstructorProfileEditModal
          name={instructor?.name}
          form={profileForm}
          saving={profileSaving}
          onChange={setProfileForm}
          onUpload={handleProfileUpload}
          onSubmit={handleProfileSave}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="text-stone-800 font-bold text-lg">{editTarget ? '編輯課程' : '複製課程'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <CloseIcon className="text-stone-600" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
                  <span className="text-red-500 text-xs leading-none">*</span>課程標題
                </label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程簡介</label>
                <textarea value={form.description} maxLength={DESCRIPTION_MAX} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                <p className="text-right text-stone-400 text-xs mt-1">{form.description.length}/{DESCRIPTION_MAX}</p>
              </div>
              <div>
                <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
                  <span className="text-red-500 text-xs leading-none">*</span>上課時間
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  <input type="time" value={form.time_start} onChange={e => setForm({ ...form, time_start: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  <input type="time" value={form.time_end} onChange={e => setForm({ ...form, time_end: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
                    <span className="text-red-500 text-xs leading-none">*</span>上課地點
                  </label>
                  <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="">請選擇</option>
                    {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">名額上限</label>
                  <input type="number" min={1} value={form.max_seats}
                    onChange={e => setForm({ ...form, max_seats: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              {form.location === '其他' && (
                <input value={form.custom_location} onChange={e => setForm({ ...form, custom_location: e.target.value })}
                  placeholder="輸入地點" className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              )}
              <div>
                <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
                  <span className="text-red-500 text-xs leading-none">*</span>適合年齡
                </label>
                <SuitableAgeSelector
                  value={form.suitable_age}
                  customValue={form.custom_age}
                  onChange={v => setForm({ ...form, suitable_age: v })}
                  onCustomChange={v => setForm({ ...form, custom_age: v })}
                />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">注意事項</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
              </div>

              <CoursePhotoGrid
                photos={form.photos}
                onChange={photos => setForm({ ...form, photos })}
                uploadImage={uploadCoursePhoto}
              />

              <div>
                <button type="button" onClick={openPosterFromForm}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-stone-300 hover:border-orange-400 text-stone-500 hover:text-orange-500 text-sm transition-colors">
                  <PosterIcon />
                  製作課程海報
                </button>
                <p className="text-stone-400 text-xs mt-1.5">設計完成後會下載成圖片，再用上方「課程照片」上傳放進課程。</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {saving ? '儲存中...' : editTarget ? '儲存變更' : '建立課程'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendanceModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setAttendanceModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-800">{attendanceModal.title}</h3>
                <p className="text-stone-400 text-xs mt-0.5">{attendanceModal.date} · 出席紀錄</p>
              </div>
              <button onClick={() => setAttendanceModal(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <CloseIcon className="text-stone-600" />
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

      {rosterModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setRosterModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-800">{rosterModal.title}</h3>
                <p className="text-stone-400 text-xs mt-0.5">{rosterModal.date} · 報名紀錄</p>
              </div>
              <button onClick={() => setRosterModal(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <CloseIcon className="text-stone-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {rosterLoading ? (
                <div className="text-center py-8 text-stone-400 text-sm">載入中...</div>
              ) : rosterList.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">此課程尚無報名者</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {rosterPaginated.map(reg => (
                    <MobileRegistrationCard
                      key={reg.id}
                      reg={reg}
                      getInitials={getInitials}
                      formatDT={formatDT}
                      onCancel={() => setRosterConfirmCancelId(reg.id)}
                      onDelete={() => setRosterConfirmPermanent(reg.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            {rosterTotalPages > 1 && (
              <div className="px-4 pb-4 pt-2 border-t border-stone-100">
                <MobilePagination currentPage={rosterPage} totalPages={rosterTotalPages} onChange={setRosterPage} />
              </div>
            )}
          </div>
        </div>
      )}

      {rosterConfirmCancelId && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-800">確認取消報名？</h3>
                <p className="text-stone-400 text-xs mt-0.5">取消後可在「已取消」狀態中查看，此動作可再復原</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRosterCancel} disabled={rosterDeleting} className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg text-sm transition-colors">
                {rosterDeleting ? '處理中...' : '確認取消報名'}
              </button>
              <button onClick={() => setRosterConfirmCancelId(null)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-lg text-sm transition-colors">返回</button>
            </div>
          </div>
        </div>
      )}

      {rosterConfirmPermanent && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-800">永久刪除此筆紀錄？</h3>
                <p className="text-stone-400 text-xs mt-0.5">此操作無法復原，資料將從資料庫中永久移除</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRosterPermanentDelete} disabled={rosterDeleting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg text-sm transition-colors">
                {rosterDeleting ? '刪除中...' : '永久刪除'}
              </button>
              <button onClick={() => setRosterConfirmPermanent(null)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-lg text-sm transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}

      {posterEditorCourse && (
        <CoursePosterEditor
          course={posterEditorCourse}
          initialImage={posterInitialImage}
          onClose={() => {
            setPosterEditorCourse(null)
            setPosterInitialImage(null)
            if (posterReturnToEdit) setShowModal(true)
          }}
        />
      )}
    </div>
  )
}

export default function InstructorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <InstructorPortal />
    </Suspense>
  )
}
