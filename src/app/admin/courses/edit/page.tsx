'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AdminCourseEditFormFields, {
  LOCATIONS, emptyAdminCourseForm, type AdminCourseForm, type AdminCategory,
} from '@/components/AdminCourseEditFormFields'
import { AGE_OPTIONS } from '@/components/SuitableAgeSelector'

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function buildForm(course: any, mode: 'edit' | 'copy'): AdminCourseForm {
  const agePreset = AGE_OPTIONS.slice(0, 4).includes(course.suitable_age) ? course.suitable_age : (course.suitable_age ? '其他' : '全年齡')
  return {
    title: course.title || '', description: course.description || '', date: mode === 'copy' ? '' : (course.date || ''),
    time_start: (course.time_start || '').slice(0, 5), time_end: (course.time_end || '').slice(0, 5),
    location: LOCATIONS.includes(course.location) ? course.location : '其他',
    custom_location: LOCATIONS.includes(course.location) ? '' : (course.location || ''),
    max_seats: course.max_seats || 20,
    photo_urls: (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls : (course.poster_url ? [course.poster_url] : []),
    instructor_ids: course.instructor_ids || (course.instructor_id ? [course.instructor_id] : []),
    category_id: course.category_id || '',
    notes: course.notes || '', suitable_age: agePreset,
    custom_age: agePreset === '其他' ? (course.suitable_age || '') : '',
  }
}

// 後台課程管理「編輯課程／複製課程」手機獨立頁面（對應 Figma node 432-9979）
// 桌機版維持彈窗（見 /admin/courses/page.tsx 的 showModal 區塊）
function EditCoursePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const courseId = searchParams.get('courseId')
  const mode = (searchParams.get('mode') === 'copy' ? 'copy' : 'edit') as 'edit' | 'copy'

  const [loading, setLoading] = useState(true)
  const [courseRow, setCourseRow] = useState<any>(null)
  const [form, setForm] = useState<AdminCourseForm>(emptyAdminCourseForm)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([])
  const [showCalendar, setShowCalendar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const [{ data: cat }, { data: instr }] = await Promise.all([
        supabase.from('course_categories').select('*').order('created_at'),
        supabase.from('instructors').select('id, name').eq('is_active', true).order('created_at'),
      ])
      setCategories(cat || [])
      setInstructors(instr || [])

      if (courseId) {
        const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()
        if (course) {
          setCourseRow(course)
          setForm(buildForm(course, mode))
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

  const timeError = form.time_start && form.time_end && form.time_end <= form.time_start ? '結束時間不能早於或等於開始時間' : ''

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (timeError) return
    if (form.photo_urls.length === 0) { setError('請至少上傳 1 張課程照片'); return }
    if (!form.category_id) { setError('請選擇課程類別'); return }
    if (form.suitable_age === '其他' && !form.custom_age.trim()) { setError('請填寫適合年齡的說明'); return }
    setError('')
    setSaving(true)

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

    if (mode === 'edit' && courseRow) {
      const { error: updateError } = await supabase.from('courses').update(payload).eq('id', courseRow.id)
      if (updateError) { setError('更新失敗：' + updateError.message); setSaving(false); return }
    } else {
      const { error: insertError } = await supabase.from('courses').insert({ ...payload, is_active: true })
      if (insertError) { setError('新增失敗：' + insertError.message); setSaving(false); return }
    }

    setSaving(false)
    router.push('/admin/courses')
  }

  const handleDelete = async () => {
    if (!courseRow) return
    if (!confirm('確定要刪除這個課程嗎？')) return
    setSaving(true)
    await supabase.from('courses').delete().eq('id', courseRow.id)
    setSaving(false)
    router.push('/admin/courses')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-[100px]">
      <div className="sticky top-0 z-30 bg-white h-[52px] px-4 flex items-center shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
        <button onClick={() => router.push('/admin/courses')} aria-label="返回" className="w-6 h-6 flex items-center justify-center shrink-0 text-stone-600">
          <BackArrowIcon />
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">{mode === 'edit' ? '編輯課程' : '複製課程'}</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      <form onSubmit={handleSave} className="p-4">
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

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        {/* 刪除課程／更新課程 左右並排（對應 Figma node 432-9979；新增/複製時沒有課程可刪，只顯示單一送出按鈕） */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white p-4 shadow-[0px_-3px_4px_0px_rgba(0,0,0,0.08)] flex gap-3">
          {mode === 'edit' && courseRow && (
            <button type="button" onClick={handleDelete} disabled={saving}
              className="flex-1 border border-rose-600 text-rose-600 hover:bg-rose-50 disabled:opacity-50 font-medium py-3 rounded-xl text-sm transition-colors">
              刪除課程
            </button>
          )}
          <button type="submit" disabled={saving || !!timeError}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
            {saving ? '儲存中...' : mode === 'edit' ? '更新課程' : '新增課程'}
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
