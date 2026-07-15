'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CourseEditFormFields, { LOCATIONS, type CourseForm } from '@/components/CourseEditFormFields'
import { AGE_OPTIONS } from '@/components/SuitableAgeSelector'

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

const emptyForm: CourseForm = {
  title: '', description: '', date: '', time_start: '', time_end: '',
  location: '', custom_location: '', notes: '', suitable_age: '全年齡', custom_age: '',
  photos: [], max_seats: 20, co_instructor_ids: [],
}

function buildForm(course: any, mode: 'edit' | 'copy', currentInstructorId: string): CourseForm {
  const agePreset = AGE_OPTIONS.slice(0, 4).includes(course.suitable_age) ? course.suitable_age : (course.suitable_age ? '其他' : '全年齡')
  return {
    title: course.title || '', description: course.description || '', date: mode === 'copy' ? '' : (course.date || ''),
    time_start: (course.time_start || '').slice(0, 5), time_end: (course.time_end || '').slice(0, 5),
    location: LOCATIONS.includes(course.location) ? course.location : '其他',
    custom_location: LOCATIONS.includes(course.location) ? '' : (course.location || ''),
    notes: course.notes || '', suitable_age: agePreset,
    custom_age: agePreset === '其他' ? (course.suitable_age || '') : '',
    photos: (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls : (course.poster_url ? [course.poster_url] : []),
    max_seats: course.max_seats || 20,
    co_instructor_ids: (course.instructor_ids || []).filter((id: string) => id !== currentInstructorId),
  }
}

// 手機版「編輯課程 / 複製課程」獨立頁面（對應 Figma node 350-6372）
// 桌機版維持彈窗（見 /instructor/page.tsx 的 showModal 區塊）
function EditCoursePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const courseId = searchParams.get('courseId')
  const mode = (searchParams.get('mode') === 'copy' ? 'copy' : 'edit') as 'edit' | 'copy'

  const [loading, setLoading] = useState(true)
  const [instructor, setInstructor] = useState<any>(null)
  const [courseRow, setCourseRow] = useState<any>(null)
  const [form, setForm] = useState<CourseForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [allInstructors, setAllInstructors] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    (async () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('instructor_line_user') : null
      if (!stored) { router.replace('/instructor'); return }
      let lineUserId = ''
      try { lineUserId = JSON.parse(stored).lineUserId } catch { router.replace('/instructor'); return }

      const { data: instr } = await supabase.from('instructors').select('*').eq('line_user_id', lineUserId).maybeSingle()
      if (!instr) { router.replace('/instructor'); return }
      setInstructor(instr)

      const { data: roster } = await supabase.from('instructors').select('id, name').eq('is_active', true).order('name')
      setAllInstructors(roster || [])

      if (courseId) {
        const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()
        if (course) {
          setCourseRow(course)
          setForm(buildForm(course, mode, instr.id))
        }
      }
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, mode])

  const uploadCoursePhoto = async (blob: Blob): Promise<string | null> => {
    const filename = `course-photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { data, error: uploadError } = await supabase.storage.from('images').upload(filename, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadError || !data) return null
    const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
    return urlData.publicUrl
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructor) return
    if (form.photos.length === 0) { setError('請至少上傳 1 張課程照片'); return }
    if (form.suitable_age === '其他' && !form.custom_age.trim()) { setError('請填寫適合年齡的說明'); return }
    setError('')
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

    if (mode === 'edit' && courseRow) {
      await supabase.from('course_edit_logs').insert({
        course_id: courseRow.id,
        instructor_id: instructor.id,
        before_data: courseRow,
        after_data: { ...courseRow, ...payload },
      })
      await supabase.from('courses').update(payload).eq('id', courseRow.id)
    } else {
      await supabase.from('courses').insert({
        ...payload,
        instructor_id: instructor.id,
        is_active: true,
      })
    }

    setSaving(false)
    router.push('/instructor')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-[100px]">
      <div className="sticky top-0 z-30 bg-white h-[52px] px-4 flex items-center shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
        <button onClick={() => router.push('/instructor')} aria-label="返回" className="w-6 h-6 flex items-center justify-center shrink-0 text-stone-600">
          <BackArrowIcon />
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">{mode === 'edit' ? '編輯課程' : '複製課程'}</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      <form onSubmit={handleSave} className="p-4">
        <CourseEditFormFields
          form={form} setForm={setForm} uploadCoursePhoto={uploadCoursePhoto}
          instructorOptions={allInstructors.filter(i => i.id !== instructor?.id)}
        />

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white p-4 shadow-[0px_-3px_4px_0px_rgba(0,0,0,0.08)]">
          <button type="submit" disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-base transition-colors">
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function EditCoursePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <EditCoursePageInner />
    </Suspense>
  )
}
