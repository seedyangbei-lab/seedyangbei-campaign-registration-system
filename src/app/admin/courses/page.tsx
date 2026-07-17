'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CourseScheduleExporter from '@/components/CourseScheduleExporter'
import WalkInRegistrationModal from '@/components/WalkInRegistrationModal'
import AttendeeCheckItem from '@/components/AttendeeCheckItem'
import { AGE_OPTIONS } from '@/components/SuitableAgeSelector'
import AdminCourseEditFormFields, {
  LOCATIONS, emptyAdminCourseForm, type AdminCourseForm, type AdminCategory,
} from '@/components/AdminCourseEditFormFields'
import type { ExportableReport } from '@/lib/exportCourseReport'

interface Instructor { id: string; name: string }
interface Category { id: string; name: string; color: string }

const isMobileViewport = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

const emptyForm: AdminCourseForm = emptyAdminCourseForm

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
  const [pageLoading, setPageLoading] = useState(true)
  const [attendanceModal, setAttendanceModal] = useState<any>(null)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(false)   
  const [attendanceSaving, setAttendanceSaving] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)
  const [reportViewCourse, setReportViewCourse] = useState<any>(null)
  const [deadlineModalCourse, setDeadlineModalCourse] = useState<any>(null)
  const [deadlineInput, setDeadlineInput] = useState('')
  const [deadlineSaving, setDeadlineSaving] = useState(false)
  const [reportDeadlineDays, setReportDeadlineDays] = useState(7)
  const [exportingReportId, setExportingReportId] = useState<string | null>(null)
  const [batchExporting, setBatchExporting] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const [scheduleExportSignal, setScheduleExportSignal] = useState(0)
  const [reportExportModalOpen, setReportExportModalOpen] = useState(false)
  const [reportExportMonth, setReportExportMonth] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const fetchAll = async () => {
    const [{ data: c }, { data: i }, { data: cat }, { data: siteSettings }, { data: reports }] = await Promise.all([
      supabase.from('courses').select('*, course_categories(name, color), instructor_ids').order('date', { ascending: false }),
      supabase.from('instructors').select('id, name').eq('is_active', true).order('created_at'),
      supabase.from('course_categories').select('*').order('created_at'),
      supabase.from('site_settings').select('key, value'),
      supabase.from('course_reports').select('*'),
    ])
    const instructorsData = i || []
    const coursesData = (c as any) || []
    const reportsData = reports || []
    const deadlineDays = parseInt((siteSettings || []).find((s: any) => s.key === 'report_deadline_days')?.value || '7') || 7
    setReportDeadlineDays(deadlineDays)
    const reportByCourseId = Object.fromEntries(reportsData.map((r: any) => [r.course_id, r]))
    const enriched = coursesData.map((course: any) => {
      const report = reportByCourseId[course.id]
      const end = new Date(`${course.date}T${course.time_end}`)
      const deadline = course.report_deadline_extended_to
        ? new Date(`${course.report_deadline_extended_to}T23:59:59`)
        : new Date(end.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
      const reportStatus = report ? 'submitted' : (end < new Date() && new Date() > deadline ? 'overdue' : 'due')
      return {
        ...course,
        instructor_names: (course.instructor_ids || [])
          .map((id: string) => instructorsData.find((inst: any) => inst.id === id)?.name)
          .filter(Boolean),
        report,
        report_status: reportStatus,
        report_deadline: deadline,
      }
    })
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

  // 24 小時制字串可以直接比大小，不需要再算上午/下午
  const timeError = form.time_start && form.time_end && form.time_end <= form.time_start ? '結束時間不能早於或等於開始時間' : ''

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true) }

  const openEdit = (course: any) => {
    if (isMobileViewport()) { router.push(`/admin/courses/edit?courseId=${course.id}&mode=edit`); return }
    setEditTarget(course)
    const agePreset = AGE_OPTIONS.slice(0, 4).includes(course.suitable_age) ? course.suitable_age : (course.suitable_age ? '其他' : '全年齡')
    setForm({
      title: course.title, description: course.description || '', date: course.date,
      time_start: (course.time_start || '').slice(0, 5), time_end: (course.time_end || '').slice(0, 5),
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : course.location,
      max_seats: course.max_seats,
      photo_urls: (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls : (course.poster_url ? [course.poster_url] : []),
      instructor_ids: course.instructor_ids || (course.instructor_id ? [course.instructor_id] : []),
      category_id: course.category_id || '',
      notes: course.notes || '', suitable_age: agePreset,
      custom_age: agePreset === '其他' ? (course.suitable_age || '') : '',
    })
    setShowModal(true)
  }

  const openCopy = (course: any) => {
    if (isMobileViewport()) { router.push(`/admin/courses/edit?courseId=${course.id}&mode=copy`); return }
    setEditTarget(null)
    const agePreset = AGE_OPTIONS.slice(0, 4).includes(course.suitable_age) ? course.suitable_age : (course.suitable_age ? '其他' : '全年齡')
    setForm({
      title: course.title, description: course.description || '', date: '',
      time_start: (course.time_start || '').slice(0, 5), time_end: (course.time_end || '').slice(0, 5),
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : course.location,
      max_seats: course.max_seats,
      photo_urls: (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls : (course.poster_url ? [course.poster_url] : []),
      instructor_ids: course.instructor_ids || (course.instructor_id ? [course.instructor_id] : []),
      category_id: course.category_id || '',
      notes: course.notes || '', suitable_age: agePreset,
      custom_age: agePreset === '其他' ? (course.suitable_age || '') : '',
    })
    setShowModal(true)
  }

  const openDeadlineModal = (course: any) => {
    setDeadlineModalCourse(course)
    setDeadlineInput(course.report_deadline_extended_to || '')
  }

  const saveDeadline = async () => {
    if (!deadlineModalCourse || !deadlineInput) return
    setDeadlineSaving(true)
    await supabase.from('courses').update({ report_deadline_extended_to: deadlineInput }).eq('id', deadlineModalCourse.id)
    setDeadlineSaving(false)
    setDeadlineModalCourse(null)
    fetchAll()
  }

  const clearDeadline = async () => {
    if (!deadlineModalCourse) return
    setDeadlineSaving(true)
    await supabase.from('courses').update({ report_deadline_extended_to: null }).eq('id', deadlineModalCourse.id)
    setDeadlineSaving(false)
    setDeadlineModalCourse(null)
    fetchAll()
  }

  const buildExportableReport = (course: any): ExportableReport | null => {
    if (!course.report) return null
    const instructorName = instructors.find((i: any) => i.id === course.report.instructor_id)?.name || '（講師資料已異動）'
    const coInstructorNames = (course.instructor_names || []).filter((name: string) => name !== instructorName)
    return {
      title: course.title, date: course.date, time_start: course.time_start, time_end: course.time_end, location: course.location,
      instructorName, coInstructorNames,
      summary: course.report.summary || '', participant_count: course.report.participant_count ?? '（未填寫）',
      reflection: course.report.reflection || '', submitted_at: (course.report.submitted_at || '').slice(0, 16).replace('T', ' '),
      signin_photo_urls: course.report.signin_photo_urls || [], photo_urls: course.report.photo_urls || [],
    }
  }

  const handleExportSingleReport = async (course: any) => {
    const exportable = buildExportableReport(course)
    if (!exportable) return
    setExportingReportId(course.id)
    try {
      const { exportSingleCourseReport } = await import('@/lib/exportCourseReport')
      const { failedPhotoCount } = await exportSingleCourseReport(exportable)
      if (failedPhotoCount > 0) alert(`匯出完成，但有 ${failedPhotoCount} 張照片下載失敗（可能是網路問題），可以到成果報告內容裡確認原始連結。`)
    } catch (e: any) {
      alert('匯出失敗：' + (e?.message || '請稍後再試'))
    } finally {
      setExportingReportId(null)
    }
  }

  const handleBatchExportReports = async (month: string) => {
    const target = endedCourses.filter((c: any) => (month ? c.date?.startsWith(month) : true) && c.report_status === 'submitted')
    if (target.length === 0) { alert('該範圍內沒有已提交的成果報告可以匯出'); return }
    setBatchExporting(true)
    try {
      const { exportBatchCourseReports } = await import('@/lib/exportCourseReport')
      const exportables = target.map(buildExportableReport).filter(Boolean) as ExportableReport[]
      const zipName = month ? `${month}成果報告` : '全部成果報告'
      const { failedPhotoCount } = await exportBatchCourseReports(exportables, zipName)
      alert(`已匯出 ${exportables.length} 堂課的成果報告${failedPhotoCount > 0 ? `，其中 ${failedPhotoCount} 張照片下載失敗（可能是網路問題）` : ''}`)
    } catch (e: any) {
      alert('匯出失敗：' + (e?.message || '請稍後再試'))
    } finally {
      setBatchExporting(false)
      setReportExportModalOpen(false)
    }
  }

  const uploadCoursePhoto = async (blob: Blob): Promise<string | null> => {
    const filename = `course-photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { data, error } = await supabase.storage.from('images').upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error || !data) return null
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
    return urlData.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (timeError) return
    if (form.photo_urls.length === 0) { alert('請至少上傳 1 張課程照片'); return }
    if (form.suitable_age === '其他' && !form.custom_age.trim()) { alert('請填寫適合年齡的說明'); return }
    setLoading(true)
    const location = form.location === '其他' ? form.custom_location : form.location
    const suitableAge = form.suitable_age === '其他' ? form.custom_age : form.suitable_age
    const payload = {
      title: form.title, description: form.description, date: form.date,
      time_start: form.time_start, time_end: form.time_end,
      location, max_seats: form.max_seats, photo_urls: form.photo_urls, poster_url: form.photo_urls[0] || null,
      instructor_id: form.instructor_ids[0] || null,
      instructor_ids: form.instructor_ids,
      category_id: form.category_id || null,
      notes: form.notes || null, suitable_age: suitableAge || '全年齡',
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
    await fetchAll()
  }

  const now = new Date()
  const isExpired = (course: any) => new Date(`${course.date}T${course.time_end}`) < now
  const endedCourses = courses.filter((c: any) => isExpired(c))
  const availableMonths = Array.from(new Set(endedCourses.map((c: any) => c.date?.slice(0, 7)).filter(Boolean))).sort().reverse() as string[]
  const displayCourses = courseTab === 'active'
    ? courses.filter((c: any) => c.is_active && !isExpired(c))
    : endedCourses.filter((c: any) => filterMonth ? c.date?.startsWith(filterMonth) : true)

  const primaryBtnCls = "bg-orange-500 hover:bg-orange-600 text-white p-2 md:px-4 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap"
  const secondaryBtnCls = "bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 p-2 md:px-4 md:py-2 rounded-md md:rounded-lg text-xs md:text-sm font-medium transition-colors whitespace-nowrap"
  const openAddCat = () => { setEditCat(null); setCatForm({ name: '', color: '#e11d48' }); setShowCatModal(true) }
  const headerActions = mainTab === 'courses' ? (
    <button onClick={openAdd} className={primaryBtnCls}>新增課程</button>
  ) : (
    <>
      <button onClick={() => setMainTab('courses')} className={secondaryBtnCls}>課程列表</button>
      <button onClick={openAddCat} className={primaryBtnCls}>新增類別</button>
    </>
  )
  const courseTabBar = (
    <div className="flex gap-1 p-1 bg-stone-50 border border-stone-200 rounded-lg w-fit">
      {([['active', '開放中'], ['ended', '已結束']] as const).map(([t, label]) => (
        <button key={t} onClick={() => { setCourseTab(t); setFilterMonth('') }}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${courseTab === t ? 'bg-white text-stone-800 border-stone-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-stone-400 hover:text-stone-600 border-transparent'}`}>
          {label}
          <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${courseTab === t ? 'bg-stone-100 text-stone-500' : 'bg-stone-100 text-stone-400'}`}>
            {t === 'active' ? courses.filter((c: any) => c.is_active && !isExpired(c)).length : endedCourses.length}
          </span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="p-6 md:p-8">
      {/* 標題 + 按鈕同一列，底部一條分隔線 */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-stone-200 gap-2">
        <h2 className="text-stone-600 text-xl md:text-[26px] leading-7 font-bold">課程管理</h2>
        <div className="flex items-center gap-2">
          {headerActions}
        </div>
      </div>

      {/* 課程列表 */}
      {mainTab === 'courses' && (
        <>
          {/* 開放中/已結束 Tab + 操作（桌機：課程類別 ghost 連結 + 匯出 dropdown；手機：⋮ 更多操作選單） */}
          <div className="flex items-center justify-between mb-4 gap-2">
            {courseTabBar}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setMainTab('categories')}
                  className="text-sm font-medium text-stone-600 hover:bg-stone-50 border border-stone-300 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                  編輯課程類別
                </button>
                <div className="relative">
                  <button onClick={() => setExportMenuOpen(o => !o)}
                    className="flex items-center gap-1.5 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 hover:bg-orange-100 px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                    匯出
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {exportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-20">
                        <button onClick={() => { setExportMenuOpen(false); setScheduleExportSignal(s => s + 1) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                          匯出課表
                        </button>
                        <button onClick={() => { setExportMenuOpen(false); setReportExportMonth(''); setReportExportModalOpen(true) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                          匯出成果報告
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="md:hidden relative">
                <button onClick={() => setMobileActionsOpen(o => !o)}
                  className="flex items-center justify-center bg-white border border-stone-200 rounded-lg p-2.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                </button>
                {mobileActionsOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMobileActionsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-20">
                      <button onClick={() => { setMobileActionsOpen(false); setScheduleExportSignal(s => s + 1) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                        匯出課表
                      </button>
                      <button onClick={() => { setMobileActionsOpen(false); setReportExportMonth(''); setReportExportModalOpen(true) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                        匯出成果報告
                      </button>
                      <button onClick={() => { setMobileActionsOpen(false); setMainTab('categories') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors">
                        課程類別管理
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <CourseScheduleExporter courses={courses} scheduleSettings={scheduleSettings} hideTrigger openSignal={scheduleExportSignal} />

          {courseTab === 'ended' && availableMonths.length > 0 && (
            <>
              {/* 桌機：月份篩選用按鈕列 */}
              <div className="hidden md:flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-xs text-stone-400 font-medium">篩選月份</span>
                <button onClick={() => setFilterMonth('')}
                  className={`px-3 py-2 rounded-md text-xs font-medium leading-4 transition-colors ${filterMonth === '' ? 'bg-orange-500 text-white' : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
                  全部
                </button>
                {availableMonths.map(m => {
                  const [y, mo] = m.split('-')
                  return (
                    <button key={m} onClick={() => setFilterMonth(m)}
                      className={`px-3 py-2 rounded-md text-xs font-medium leading-4 transition-colors ${filterMonth === m ? 'bg-orange-500 text-white' : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'}`}>
                      {y}/{parseInt(mo)}月
                    </button>
                  )
                })}
              </div>
              {/* 手機：月份篩選改用 Dropdown */}
              <div className="md:hidden relative mb-4">
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                  className="w-full appearance-none border border-stone-300 rounded-lg pl-4 pr-10 py-2.5 text-sm font-medium text-stone-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300">
                  <option value="">全部</option>
                  {availableMonths.map(m => {
                    const [y, mo] = m.split('-')
                    return <option key={m} value={m}>{y}/{parseInt(mo)}月</option>
                  })}
                </select>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </>
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
                <div key={course.id}>
                  {/* 手機版：直式卡片（< md） */}
                  <div className="md:hidden relative bg-white border border-stone-200 rounded-2xl p-5 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                    <span className={`absolute top-2 right-2 text-sm font-medium px-2 py-0.5 rounded-md ${expired ? 'bg-stone-100 text-stone-500 border border-stone-300' : 'bg-green-100 text-green-700'}`}>
                      {expired ? '已結束' : '開放報名'}
                    </span>

                    <div className="flex gap-4 items-center mb-3">
                      <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0 bg-stone-100">
                        {(course.photo_urls?.[0] || course.poster_url) && <img src={course.photo_urls?.[0] || course.poster_url} alt={course.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-stone-800 font-bold text-base leading-6 break-words">{course.title}</p>
                        {course.course_categories && (
                          <span className="inline-flex self-start text-sm px-2 py-0.5 rounded-md text-white font-medium" style={{ backgroundColor: course.course_categories.color }}>
                            {course.course_categories.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mb-3">
                      <div className="flex items-center gap-1.5 text-sm text-stone-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>
                        <span>{course.date} · {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-stone-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>{course.location}</span>
                      </div>
                      {displayInstructors && (
                        <div className="flex items-center gap-1.5 text-sm text-stone-400">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          <span>{displayInstructors}</span>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-stone-200 mb-3" />

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {!expired ? (
                          <>
                            <button onClick={() => openEdit(course)}
                              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors font-medium">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              編輯課程
                            </button>

                            <button onClick={() => toggleActive(course.id, course.is_active)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-auto ${course.is_active ? 'bg-orange-500' : 'bg-stone-200'}`}
                              title={course.is_active ? '關閉報名' : '開放報名'}>
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${course.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openAttendance(course)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-2 rounded-lg transition-colors font-medium">
                              出席紀錄
                            </button>
                            <button onClick={() => openCopy(course)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-3 py-2 rounded-lg transition-colors font-medium">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              複製課程
                            </button>
                          </>
                        )}
                      </div>
                      {expired && (
                        <button onClick={() => course.report_status === 'submitted' ? setReportViewCourse(course) : openDeadlineModal(course)}
                          className={`w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors font-medium ${
                            course.report_status === 'submitted' ? 'bg-white hover:bg-stone-50 border border-stone-300 text-stone-600'
                              : course.report_status === 'overdue' ? 'bg-red-50 border border-red-300 text-red-600'
                              : 'bg-stone-50 border border-stone-200 text-stone-500 hover:border-orange-300 hover:text-orange-600'
                          }`}>
                          {course.report_status === 'submitted' ? '查看成果報告' : course.report_status === 'overdue' ? '成果報告：已逾期未交（點此調整期限）' : '成果報告：尚未提交'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 桌機版：橫向 row（md 以上） */}
                  <div className="hidden md:flex items-center justify-between bg-white border border-stone-200 rounded-2xl p-[17px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] w-full">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-stone-100 -mb-2">
                          {(course.photo_urls?.[0] || course.poster_url) && <img src={course.photo_urls?.[0] || course.poster_url} alt={course.title} className="w-full h-full object-cover" />}
                        </div>
                        {course.course_categories && (
                          <span className="relative text-sm px-2 py-0.5 rounded-md text-white font-medium whitespace-nowrap" style={{ backgroundColor: course.course_categories.color }}>
                            {course.course_categories.name}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-stone-800 font-bold text-base truncate">{course.title}</p>
                          <span className={`shrink-0 text-sm font-medium px-2 py-0.5 rounded-md ${expired ? 'bg-stone-100 text-stone-500 border border-stone-300' : 'bg-green-100 text-green-700'}`}>
                            {expired ? '已結束' : '開放報名'}
                          </span>
                        </div>
                        <p className="text-stone-400 text-sm truncate">
                          {course.date} · {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)} · {course.location}
                          {displayInstructors && <span> · {displayInstructors}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
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
                          <button onClick={() => course.report_status === 'submitted' ? setReportViewCourse(course) : openDeadlineModal(course)}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium whitespace-nowrap ${
                              course.report_status === 'submitted' ? 'bg-white hover:bg-stone-50 border border-stone-300 text-stone-600'
                                : course.report_status === 'overdue' ? 'bg-red-50 border border-red-300 text-red-600'
                                : 'bg-stone-50 border border-stone-200 text-stone-500 hover:border-orange-300 hover:text-orange-600'
                            }`}>
                            {course.report_status === 'submitted' ? '查看成果報告' : course.report_status === 'overdue' ? '成果報告：已逾期' : '成果報告：未提交'}
                          </button>
                        </>
                      )}
                    </div>
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
                  <span className="text-sm px-2.5 py-1 rounded-md text-white font-medium" style={{ backgroundColor: cat.color }}>{cat.name}</span>
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
                  <span className="text-sm px-3 py-1.5 rounded-md text-white font-medium" style={{ backgroundColor: catForm.color }}>{catForm.name || '預覽'}</span>
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

      {/* 新增/編輯課程彈窗（桌機；手機版編輯/複製已改為獨立頁面 /admin/courses/edit，對照 Figma node 359-27297） */}
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
              <AdminCourseEditFormFields
                form={form}
                setForm={setForm}
                categories={categories}
                instructorOptions={instructors}
                timeError={timeError}
                showCalendar={showCalendar}
                setShowCalendar={setShowCalendar}
                uploadCoursePhoto={uploadCoursePhoto}
              />
              {/* 按鈕改上下排列：編輯時下方是「刪除課程」，新增/複製時下方是「取消」（對照 Figma node 359-27297） */}
              <div className="flex flex-col gap-3 pt-2">
                <button type="submit" disabled={loading || !form.date || !!timeError} className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? '儲存中...' : editTarget ? '更新課程' : '新增課程'}
                </button>
                {editTarget ? (
                  <button type="button" onClick={async () => {
                    if (!confirm('確定要刪除這個課程嗎？')) return
                    setShowModal(false)
                    await handleDelete(editTarget.id)
                  }} className="w-full border border-rose-600 text-rose-600 hover:bg-rose-50 font-medium py-3 rounded-xl text-sm transition-colors">
                    刪除課程
                  </button>
                ) : (
                  <button type="button" onClick={() => { setShowModal(false); setShowCalendar(false) }} className="w-full border border-stone-300 text-stone-600 hover:bg-stone-50 font-medium py-3 rounded-xl text-sm transition-colors">
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 成果報告查看彈窗（接案團隊用，唯讀） */}
      {reportViewCourse && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setReportViewCourse(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-800">{reportViewCourse.title}</h3>
                <p className="text-stone-400 text-xs mt-0.5">{reportViewCourse.date} · 成果報告</p>
              </div>
              <div className="flex items-center gap-1">
                {reportViewCourse.report_status === 'submitted' && (
                  <button onClick={() => handleExportSingleReport(reportViewCourse)} disabled={exportingReportId === reportViewCourse.id}
                    className="flex items-center gap-1.5 text-xs bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50 whitespace-nowrap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    {exportingReportId === reportViewCourse.id ? '匯出中...' : '匯出'}
                  </button>
                )}
                <button onClick={() => setReportViewCourse(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {reportViewCourse.report_status === 'submitted' && reportViewCourse.report ? (
                <>
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">提交講師</p>
                    <p className="text-sm text-stone-700">
                      {instructors.find(i => i.id === reportViewCourse.report.instructor_id)?.name || '（講師資料已異動）'}
                    </p>
                  </div>
                  {reportViewCourse.instructor_names?.length > 1 && (
                    <div>
                      <p className="text-xs font-medium text-stone-400 mb-1">合作講師</p>
                      <p className="text-sm text-stone-700">{reportViewCourse.instructor_names.join('、')}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">活動簡介</p>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{reportViewCourse.report.summary || '（未填寫）'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">活動參與人數</p>
                    <p className="text-sm text-stone-700">{reportViewCourse.report.participant_count ?? '（未填寫）'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">簽到表照片</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(reportViewCourse.report.signin_photo_urls || []).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-stone-200 block">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">心得感想</p>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{reportViewCourse.report.reflection}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-stone-400 mb-1">活動紀錄照片</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(reportViewCourse.report.photo_urls || []).map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-stone-200 block">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-300">
                    提交時間：{reportViewCourse.report.submitted_at?.slice(0, 16).replace('T', ' ')}
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-stone-400 text-sm">
                  {reportViewCourse.report_status === 'overdue' ? '講師尚未提交成果報告，已逾期' : '講師尚未提交成果報告'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deadlineModalCourse && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeadlineModalCourse(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div>
                <h3 className="font-bold text-stone-800">調整成果報告期限</h3>
                <p className="text-stone-400 text-xs mt-0.5">{deadlineModalCourse.title}</p>
              </div>
              <button onClick={() => setDeadlineModalCourse(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-stone-400">
                預設期限為課程結束後 {reportDeadlineDays} 天{deadlineModalCourse.report_deadline instanceof Date && !isNaN(deadlineModalCourse.report_deadline.getTime())
                  ? `（目前期限：${deadlineModalCourse.report_deadline.toISOString().slice(0, 10)}）` : ''}
                。設定下方日期可覆蓋單一課程的期限。
              </p>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1 block">新的繳交期限</label>
                <input type="date" value={deadlineInput} onChange={e => setDeadlineInput(e.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div className="flex gap-2 pt-1">
                {deadlineModalCourse.report_deadline_extended_to && (
                  <button onClick={clearDeadline} disabled={deadlineSaving}
                    className="flex-1 text-xs bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-500 px-3 py-2 rounded-lg transition-colors font-medium disabled:opacity-50">
                    清除延長，恢復預設
                  </button>
                )}
                <button onClick={saveDeadline} disabled={deadlineSaving || !deadlineInput}
                  className="flex-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-lg transition-colors font-medium disabled:opacity-50">
                  {deadlineSaving ? '儲存中...' : '儲存新期限'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportExportModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget && !batchExporting) setReportExportModalOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="font-bold text-stone-800">匯出成果報告</h3>
              <button onClick={() => setReportExportModalOpen(false)} disabled={batchExporting} className="p-2 hover:bg-stone-100 rounded-xl disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-stone-400">選擇月份，會把該月份內所有已提交報告的課程打包成一個 zip（每堂課一個子資料夾：成果報告.pdf＋簽到表照片＋花絮照片）。</p>
              <div>
                <label className="text-xs font-medium text-stone-500 mb-2 block">月份</label>
                {availableMonths.length === 0 ? <p className="text-stone-400 text-sm">目前無已結束課程</p> : (
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setReportExportMonth('')}
                      className={`py-2.5 rounded-lg border text-xs font-medium transition-colors ${reportExportMonth === '' ? 'bg-orange-500 text-white border-orange-500' : 'text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                      全部
                    </button>
                    {availableMonths.map(m => {
                      const [y, mo] = m.split('-')
                      return (
                        <button key={m} onClick={() => setReportExportMonth(m)}
                          className={`py-2.5 rounded-lg border text-xs font-medium transition-colors ${reportExportMonth === m ? 'bg-orange-500 text-white border-orange-500' : 'text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                          {y}/{parseInt(mo)}月
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => handleBatchExportReports(reportExportMonth)} disabled={batchExporting}
                className="w-full flex items-center justify-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                {batchExporting ? '匯出中...' : '開始匯出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
