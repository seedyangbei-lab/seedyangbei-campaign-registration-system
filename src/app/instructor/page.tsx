'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CoursePosterEditor from '@/components/CoursePosterEditor'
import WalkInRegistrationModal from '@/components/WalkInRegistrationModal'
import AttendeeCheckItem from '@/components/AttendeeCheckItem'
import {
  InstructorNavbar, InstructorProfileCard, InstructorTitle, InstructorTabBar,
  InstructorCourseCard, InstructorMonthFilter, InstructorProfileEditModal,
  CloseIcon, IssueReportFab, CheckSquareIcon,
} from '@/components/InstructorMobileUI'
import IssueReportModal from '@/components/IssueReportModal'
import { MobileRegistrationCard, MobilePagination } from '@/components/AdminMobileUI'
import CourseEditFormFields, { LOCATIONS, DESCRIPTION_MAX } from '@/components/CourseEditFormFields'
import { AGE_OPTIONS } from '@/components/SuitableAgeSelector'

const ROSTER_PAGE_SIZE = 10

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'
const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

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
  photos: [] as string[], max_seats: 20, co_instructor_ids: [] as string[],
}

const emptyProfileForm = { name: '', bio: '', avatar_url: '', phone: '', line_id: '' }

function InstructorPortal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [status, setStatus] = useState<'checking' | 'not_bound' | 'ready'>('checking')
  const [instructor, setInstructor] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [reportStatuses, setReportStatuses] = useState<Record<string, 'due' | 'submitted' | 'overdue'>>({})
  const [reportDeadlineDays, setReportDeadlineDays] = useState(7)
  const [openCheckinEvents, setOpenCheckinEvents] = useState<{ id: string; title: string }[]>([])
  const [openCheckinCheckedIds, setOpenCheckinCheckedIds] = useState<Set<string>>(new Set())
  const [quickCheckinLoading, setQuickCheckinLoading] = useState(false)

  const [courseTab, setCourseTab] = useState<'active' | 'ended'>('active')
  const [filterMonth, setFilterMonth] = useState('')
  const [endedSortOrder, setEndedSortOrder] = useState<'asc' | 'desc'>('desc')

  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [profileSaving, setProfileSaving] = useState(false)
  const [toast, setToast] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [createMode, setCreateMode] = useState<'copy' | 'create'>('create')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [allInstructors, setAllInstructors] = useState<{ id: string; name: string }[]>([])

  const [posterEditorCourse, setPosterEditorCourse] = useState<any>(null)
  const [posterInitialImage, setPosterInitialImage] = useState<string | null>(null)
  const [posterPhotos, setPosterPhotos] = useState<string[]>([])

  const [attendanceModal, setAttendanceModal] = useState<any>(null)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)

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
    // 邀請連結綁定成功時 callback 會帶 claimed=1 回來，這裡明確跳提示告訴講師「已經綁好了」——
    // 之前沒有這個提示，講師常常不確定第一次點有沒有生效，會回去 LINE 對話再點一次同一個邀請連結，
    // 但這時 claim_token 已經被第一次綁定清掉了，第二次就會被判定「邀請連結已失效」
    // （後台系統健康頁 line_login_fail / claim_token_not_found 常出現的原因之一）
    const justClaimed = searchParams.get('claimed') === '1'

    if (notFound) { setStatus('not_bound'); return }

    if (lineUserParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(lineUserParam))
        localStorage.setItem('instructor_line_user', JSON.stringify(parsed))
        lookupInstructor(parsed.lineUserId)
        if (justClaimed) setToast('已成功綁定講師身份，之後可以直接用這個 LINE 帳號登入')
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
      setProfileForm({ name: data.name || '', bio: data.bio || '', avatar_url: data.avatar_url || '', phone: data.phone || '', line_id: data.line_id || '' })
      setStatus('ready')
      fetchCourses(data.id)
      fetchOpenCheckinEvents(data.id)
      const { data: roster } = await supabase.from('instructors').select('id, name').eq('is_active', true).order('name')
      setAllInstructors(roster || [])
    } else {
      setStatus('not_bound')
    }
  }

  // 活動簽到入口用：抓現在正處於簽到期間內的活動，顯示在首頁的入口卡片上。
  // 只抓「開放中」的活動（不含未開始／已結束），剛好只有一場時可以直接在首頁一鍵簽到，
  // 不用多跳一頁——這是用量最高的情境（同時間通常只有一場共識會），優先做順手
  const fetchOpenCheckinEvents = async (instructorId: string) => {
    const nowIso = new Date().toISOString()
    const { data: ev } = await supabase.from('checkin_events').select('id, title')
      .lte('checkin_start_at', nowIso).gte('checkin_end_at', nowIso)
    const list = ev || []
    setOpenCheckinEvents(list)
    if (list.length > 0) {
      const { data: recs } = await supabase.from('checkin_records').select('event_id')
        .eq('instructor_id', instructorId).in('event_id', list.map(e => e.id))
      setOpenCheckinCheckedIds(new Set((recs || []).map((r: any) => r.event_id)))
    } else {
      setOpenCheckinCheckedIds(new Set())
    }
  }

  const handleQuickCheckin = async (eventId: string) => {
    if (!instructor || quickCheckinLoading) return
    setQuickCheckinLoading(true)
    const { error } = await supabase.from('checkin_records').insert({
      event_id: eventId, instructor_id: instructor.id, method: 'self',
    })
    // 23505 = unique constraint violation，代表已經簽到過（例如連點兩下），不算真的失敗
    if (!error || error.code === '23505') {
      setOpenCheckinCheckedIds(prev => new Set(prev).add(eventId))
    }
    setQuickCheckinLoading(false)
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
        .in('status', ['confirmed', 'attended', 'absent'])
      const counts: Record<string, number> = {}
      ;(regs || []).forEach((r: any) => { counts[r.course_id] = (counts[r.course_id] || 0) + 1 })
      setRegCounts(counts)

      // 成果報告狀態：已提交／未提交待補（依期限判斷是否已逾期）
      const { data: settingRow } = await supabase.from('site_settings').select('value').eq('key', 'report_deadline_days').maybeSingle()
      const deadlineDays = parseInt(settingRow?.value || '7') || 7
      setReportDeadlineDays(deadlineDays)

      const { data: reports } = await supabase.from('course_reports').select('course_id').in('course_id', ids)
      const submittedIds = new Set((reports || []).map((r: any) => r.course_id))
      const statuses: Record<string, 'due' | 'submitted' | 'overdue'> = {}
      list.forEach((c: any) => {
        if (submittedIds.has(c.id)) { statuses[c.id] = 'submitted'; return }
        const end = new Date(`${c.date}T${c.time_end}`)
        const deadline = c.report_deadline_extended_to
          ? new Date(`${c.report_deadline_extended_to}T23:59:59`)
          : new Date(end.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
        statuses[c.id] = new Date() > deadline ? 'overdue' : 'due'
      })
      setReportStatuses(statuses)
    } else {
      setRegCounts({})
      setReportStatuses({})
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
    : endedCourses
        .filter(c => filterMonth ? c.date?.startsWith(filterMonth) : true)
        .slice()
        .sort((a, b) => endedSortOrder === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))

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
    const trimmedName = profileForm.name.trim()
    if (!trimmedName) { setToast('姓名不能是空白'); return }
    setProfileSaving(true)
    await supabase.from('instructors').update({
      name: trimmedName,
      bio: profileForm.bio,
      avatar_url: profileForm.avatar_url || null,
      phone: profileForm.phone || null,
      line_id: profileForm.line_id || null,
    }).eq('id', instructor.id)
    setInstructor({ ...instructor, ...profileForm, name: trimmedName })
    setProfileSaving(false)
    setShowProfileModal(false)
    setToast('個人資料已儲存')
  }

  const handleLogout = () => {
    localStorage.removeItem('instructor_line_user')
    setShowProfileModal(false)
    setInstructor(null)
    setStatus('not_bound')
  }

  /* ---------- 課程編輯／複製 ---------- */

  const openEdit = (course: any) => {
    if (isMobileViewport()) { router.push(`/instructor/edit-course?courseId=${course.id}&mode=edit`); return }
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
      co_instructor_ids: (course.instructor_ids || []).filter((id: string) => id !== instructor?.id),
    })
    setShowModal(true)
  }

  const openCopy = (course: any) => {
    if (isMobileViewport()) { router.push(`/instructor/edit-course?courseId=${course.id}&mode=copy`); return }
    setEditTarget(null)
    setCreateMode('copy')
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
      co_instructor_ids: (course.instructor_ids || []).filter((id: string) => id !== instructor?.id),
    })
    setShowModal(true)
  }

  const openAdd = () => {
    if (isMobileViewport()) { router.push('/instructor/edit-course?mode=create'); return }
    setEditTarget(null)
    setCreateMode('create')
    setForm(emptyForm)
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
    const coInstructorIds = form.co_instructor_ids.filter(id => id && id !== instructor.id)
    const instructorIds = Array.from(new Set([instructor.id, ...coInstructorIds]))
    const payload = {
      title: form.title, description: form.description, date: form.date,
      time_start: form.time_start, time_end: form.time_end,
      location, notes: form.notes, suitable_age: suitableAge,
      photo_urls: form.photos, poster_url: form.photos[0] || null, max_seats: form.max_seats,
      instructor_ids: instructorIds,
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
        is_active: true,
      })
    }

    setShowModal(false)
    setSaving(false)
    fetchCourses(instructor.id)
  }

  const openPosterFromCard = (course: any) => {
    // 手機版改為獨立頁面（非彈窗），桌機版維持彈窗
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      router.push(`/instructor/poster-editor?courseId=${course.id}`)
      return
    }
    setPosterEditorCourse({
      id: course.id, title: course.title, instructor: instructor?.name, date: course.date,
      timeStart: (course.time_start || '').slice(0, 5), timeEnd: (course.time_end || '').slice(0, 5),
      location: course.location, suitableAge: course.suitable_age, notes: course.notes,
    })
    const photoList = (course.photo_urls && course.photo_urls.length) ? course.photo_urls : (course.poster_url ? [course.poster_url] : [])
    setPosterPhotos(photoList)
    setPosterInitialImage(photoList[0] || null)
  }

  /* ---------- 出席紀錄 ---------- */

  const openAttendance = async (course: any) => {
    if (isMobileViewport()) { router.push(`/instructor/attendance?courseId=${course.id}`); return }
    setAttendanceModal(course)
    setAttendanceLoading(true)
    setCheckedIds(new Set())
    setWalkInModalOpen(false)
    const { data: regs, error } = await supabase
      .from('registrations')
      .select('id, status, is_walk_in, users(id, name, room_number, line_id)')
      .eq('course_id', course.id)
      .in('status', ['confirmed', 'attended', 'absent'])
      .order('registered_at')
    if (error) {
      console.error('attendance fetch error:', error)
      alert('讀取報名名單失敗：' + error.message + (error.message.includes('is_walk_in') ? '\n\nsql/2026-07-16_registrations_walk_in.sql 這份遷移可能還沒在 Supabase SQL Editor 執行過。' : ''))
    }
    setAttendanceList(regs || [])
    const attended = new Set((regs || []).filter((r: any) => r.status === 'attended').map((r: any) => r.id))
    setCheckedIds(attended)
    setAttendanceLoading(false)
  }

  const saveAttendance = async () => {
    setAttendanceSaving(true)
    // 平行送出所有變更，而非一筆一筆等待，避免多人異動時儲存時間疊加
    // 三種情況：勾選出席／原本已出席被取消（撤銷＋收回點數）／原本未確認且這次審核後仍未勾選（標記未出席，不動點數）
    await Promise.all(attendanceList.map((reg: any) => {
      const shouldAttend = checkedIds.has(reg.id)
      const isAttended = reg.status === 'attended'
      const isAbsent = reg.status === 'absent'
      if (shouldAttend && !isAttended) {
        return fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: attendanceModal.title, lineUserId: reg.users?.line_id || '', action: 'attend' }) })
      } else if (!shouldAttend && isAttended) {
        return fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: attendanceModal.title, lineUserId: reg.users?.line_id || '', action: 'unattend' }) })
      } else if (!shouldAttend && !isAttended && !isAbsent) {
        return fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registrationId: reg.id, courseTitle: attendanceModal.title, lineUserId: reg.users?.line_id || '', action: 'mark_absent' }) })
      }
      return Promise.resolve()
    }))
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
    <div className="min-h-screen bg-stone-50 md:bg-[#fff8f3] pb-10 md:pb-[60px]">
      <InstructorNavbar name={instructor?.name} avatarUrl={instructor?.avatar_url} onLogout={handleLogout} />

      <div className="max-w-md mx-auto md:max-w-[800px] md:pt-10">
        <InstructorProfileCard
          name={instructor?.name}
          avatarUrl={instructor?.avatar_url}
          courseCount={courses.length}
          onEdit={() => setShowProfileModal(true)}
        />

        {/* 活動簽到入口：種子戶共識會／活動打卡簽到。
            剛好只有一場開放中且還沒簽到時，右側直接放「簽到」按鈕，點了立刻簽到、不跳頁；
            點卡片本身（除了簽到按鈕以外的地方）還是會進活動簽到頁，可以看其他場次。
            同時有兩場以上開放中時無法用一顆按鈕代表，維持跳頁讓使用者自己選 */}
        <div className="px-4 pt-4 md:px-0 md:pt-6">
          {(() => {
            const singleOpen = openCheckinEvents.length === 1 ? openCheckinEvents[0] : null
            const singleChecked = singleOpen ? openCheckinCheckedIds.has(singleOpen.id) : false
            return (
              <div
                onClick={() => router.push('/instructor/checkin')}
                role="button"
                tabIndex={0}
                className="w-full flex items-center justify-between gap-3 bg-white border border-stone-200 rounded-2xl px-4 py-3.5 hover:border-orange-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                    <CheckSquareIcon className="text-orange-500" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-stone-700">活動簽到</p>
                    <p className="text-xs text-stone-400 truncate">
                      {singleOpen
                        ? (singleChecked ? `已簽到「${singleOpen.title}」` : `${singleOpen.title}．開放簽到中`)
                        : openCheckinEvents.length > 1
                          ? `現在有 ${openCheckinEvents.length} 場活動開放簽到`
                          : '共識會／活動打卡簽到'}
                    </p>
                  </div>
                </div>
                {singleOpen ? (
                  singleChecked ? (
                    <span className="shrink-0 flex items-center gap-1 text-green-600 text-xs font-medium whitespace-nowrap">
                      <CheckSquareIcon className="text-green-600" />已簽到
                    </span>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); handleQuickCheckin(singleOpen.id) }}
                      disabled={quickCheckinLoading}
                      className="shrink-0 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {quickCheckinLoading ? '簽到中...' : '簽到'}
                    </button>
                  )
                ) : openCheckinEvents.length > 1 ? (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold">{openCheckinEvents.length}</span>
                ) : null}
              </div>
            )
          })()}
        </div>

        <div className="px-4 pt-6 md:px-0 md:pt-6 flex flex-col gap-4 md:gap-6">
          <InstructorTitle
            action={
              <button
                onClick={openAdd}
                className="shrink-0 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium p-2 rounded-md transition-colors whitespace-nowrap"
              >
                新增課程
              </button>
            }
          >
            我的課程
          </InstructorTitle>
          <InstructorTabBar
            tab={courseTab}
            onChange={t => { setCourseTab(t); setFilterMonth('') }}
            activeCount={activeCourses.length}
            endedCount={endedCourses.length}
          />

          {courseTab === 'ended' && availableMonths.length > 0 && (
            <InstructorMonthFilter
              months={availableMonths} value={filterMonth} onChange={setFilterMonth}
              sortOrder={endedSortOrder} onToggleSort={() => setEndedSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            />
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
                onReport={isExpired(c) ? () => router.push(`/instructor/report?courseId=${c.id}`) : undefined}
                reportStatus={reportStatuses[c.id]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 問題通報浮動按鈕：僅「我的課程」頁面顯示，海報編輯器開啟時隱藏（對應 Figma node 358:26876 / 14:39466 / 352:26326） */}
      {!posterEditorCourse && <IssueReportFab onClick={() => setShowIssueModal(true)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg z-[60]">
          {toast}
        </div>
      )}

      {showIssueModal && instructor && (
        <IssueReportModal
          instructorId={instructor.id}
          onClose={() => setShowIssueModal(false)}
          onSuccess={() => setToast('已送出回報，感謝！')}
        />
      )}

      {showProfileModal && (
        <InstructorProfileEditModal
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-[10px] right-[13px] z-10 bg-white border border-stone-200 rounded-full p-1.5 hover:bg-stone-50 transition-colors"
              aria-label="關閉"
            >
              <CloseIcon className="text-stone-600" />
            </button>
            <div className="p-6 border-b border-stone-200">
              <h3 className="text-stone-800 font-bold text-lg">{editTarget ? '編輯課程' : createMode === 'copy' ? '複製課程' : '新增課程'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <CourseEditFormFields
                form={form} setForm={setForm} uploadCoursePhoto={uploadCoursePhoto}
                instructorOptions={allInstructors.filter(i => i.id !== instructor?.id)}
              />

              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {saving ? '儲存中...' : editTarget ? '儲存變更' : '建立課程'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">
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
              ) : (
                <>
                  {/* 現場報到：不管名單是否為空都能新增，供無網路報名的居民現場登記 */}
                  <div className="mb-4">
                    <button type="button" onClick={() => setWalkInModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-orange-600 border border-dashed border-orange-300 rounded-xl py-2.5 hover:bg-orange-50 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                      現場新增報到
                    </button>
                  </div>

                  {attendanceList.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-sm">此課程尚無報名者</div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-stone-400 mb-4">勾選代表已出席，取消勾選代表撤銷出席（點數同步調整）</p>
                      {attendanceList.map((reg: any) => (
                        <AttendeeCheckItem
                          key={reg.id}
                          checked={checkedIds.has(reg.id)}
                          name={reg.users?.name}
                          roomNumber={reg.users?.room_number}
                          badge={reg.is_walk_in ? '現場報到' : undefined}
                          onToggle={() => { const next = new Set(checkedIds); checkedIds.has(reg.id) ? next.delete(reg.id) : next.add(reg.id); setCheckedIds(next) }}
                        />
                      ))}
                    </div>
                  )}
                </>
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

      {walkInModalOpen && attendanceModal && (
        <WalkInRegistrationModal
          courseId={attendanceModal.id}
          courseTitle={attendanceModal.title}
          existingUserIds={attendanceList.map((r: any) => r.users?.id).filter(Boolean)}
          onClose={() => setWalkInModalOpen(false)}
          onConfirmed={(regs) => {
            setAttendanceList(list => [...list, ...regs])
            setCheckedIds(prev => {
              const next = new Set(prev)
              regs.forEach(r => next.add(r.id))
              return next
            })
            setWalkInModalOpen(false)
          }}
        />
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
          instructorId={instructor?.id || ''}
          initialImage={posterInitialImage}
          photos={posterPhotos}
          onClose={() => {
            setPosterEditorCourse(null)
            setPosterInitialImage(null)
            setPosterPhotos([])
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
