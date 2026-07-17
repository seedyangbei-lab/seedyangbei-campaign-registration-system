'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const MAX_SIGNIN_PHOTOS = 5
const MIN_SIGNIN_PHOTOS = 1
const MAX_RECORD_PHOTOS = 10
const MIN_RECORD_PHOTOS = 5
const DEFAULT_DEADLINE_DAYS = 7

function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function RemoveIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

// 簽到表／活動紀錄照片：直接上傳原圖，不強制裁切（跟課程照片走 CoursePhotoGrid 的裁切邏輯不一樣，
// 這裡是文件佐證用途，裁切會裁掉重要內容）
function PhotoUploadBlock({
  label, required, min, max, photos, onChange, folder,
}: {
  label: string; required?: boolean; min: number; max: number
  photos: string[]; onChange: (next: string[]) => void; folder: string
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const uploadFiles = async (files: File[]) => {
    const room = max - photos.length
    if (room <= 0 || files.length === 0) return
    const toUpload = files.slice(0, room)
    setUploading(true)
    for (const file of toUpload) {
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true, contentType: file.type || undefined })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
        onChange([...photos, urlData.publicUrl].slice(0, max))
      }
    }
    setUploading(false)
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    uploadFiles(files)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-stone-600">
          {required && <span className="text-red-500 text-xs mr-1">*</span>}{label}
        </label>
        <span className="text-xs text-stone-400">{photos.length}/{max}（最少 {min} 張）</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden border border-stone-300">
            <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-1 shadow drop-shadow-sm" aria-label="刪除照片">
              <RemoveIcon />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="aspect-square rounded-xl border border-dashed border-stone-300 hover:border-orange-400 flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-orange-500 transition-colors disabled:opacity-60">
            <PlusIcon />
            <span className="text-[10px]">{uploading ? '上傳中...' : '新增照片'}</span>
          </button>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
    </div>
  )
}

function ReportPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const courseId = searchParams.get('courseId')

  const [loading, setLoading] = useState(true)
  const [instructor, setInstructor] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [coInstructorNames, setCoInstructorNames] = useState<string[]>([])
  const [deadlineDays, setDeadlineDays] = useState(DEFAULT_DEADLINE_DAYS)
  const [existingReportId, setExistingReportId] = useState<string | null>(null)

  const [summary, setSummary] = useState('')
  const [participantCount, setParticipantCount] = useState<number | ''>('')
  const [signinPhotos, setSigninPhotos] = useState<string[]>([])
  const [reflection, setReflection] = useState('')
  const [recordPhotos, setRecordPhotos] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('instructor_line_user') : null
      if (!stored || !courseId) { router.replace('/instructor'); return }
      let lineUserId = ''
      try { lineUserId = JSON.parse(stored).lineUserId } catch { router.replace('/instructor'); return }

      const { data: instr } = await supabase.from('instructors').select('*').eq('line_user_id', lineUserId).maybeSingle()
      if (!instr) { router.replace('/instructor'); return }

      const { data: courseRow } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()
      if (!courseRow || !(courseRow.instructor_ids || []).includes(instr.id)) { router.replace('/instructor'); return }
      setInstructor(instr)
      setCourse(courseRow)

      const coIds = (courseRow.instructor_ids || []).filter((id: string) => id !== instr.id)
      if (coIds.length > 0) {
        const { data: coRows } = await supabase.from('instructors').select('name').in('id', coIds)
        setCoInstructorNames((coRows || []).map((r: any) => r.name).filter(Boolean))
      }

      const { data: settingRow } = await supabase.from('site_settings').select('value').eq('key', 'report_deadline_days').maybeSingle()
      if (settingRow?.value) setDeadlineDays(parseInt(settingRow.value) || DEFAULT_DEADLINE_DAYS)

      const { data: existing } = await supabase.from('course_reports').select('*').eq('course_id', courseId).maybeSingle()

      if (existing) {
        setExistingReportId(existing.id)
        setSummary(existing.summary || '')
        setParticipantCount(existing.participant_count ?? '')
        setSigninPhotos(existing.signin_photo_urls || [])
        setReflection(existing.reflection || '')
        setRecordPhotos(existing.photo_urls || [])
      } else {
        setSummary(courseRow.description || '')
        const { count } = await supabase.from('registrations').select('id', { count: 'exact', head: true })
          .eq('course_id', courseId).eq('status', 'attended')
        setParticipantCount(count ?? 0)
      }

      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const deadlineInfo = (() => {
    if (!course?.date) return null
    const end = new Date(`${course.date}T${(course.time_end || '23:59').slice(0, 5)}:00`)
    const deadline = new Date(end.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
    const now = new Date()
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return { deadline, overdue: daysLeft < 0, daysLeft }
  })()

  const canSubmit = reflection.trim().length > 0
    && signinPhotos.length >= MIN_SIGNIN_PHOTOS
    && recordPhotos.length >= MIN_RECORD_PHOTOS
    && !saving

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!course || !instructor) return
    if (reflection.trim().length === 0) { setError('請填寫心得感想'); return }
    if (signinPhotos.length < MIN_SIGNIN_PHOTOS) { setError(`請至少上傳 ${MIN_SIGNIN_PHOTOS} 張簽到表照片`); return }
    if (recordPhotos.length < MIN_RECORD_PHOTOS) { setError(`請至少上傳 ${MIN_RECORD_PHOTOS} 張活動紀錄照片`); return }
    setError('')
    setSaving(true)

    const payload = {
      course_id: course.id,
      instructor_id: instructor.id,
      summary: summary.trim() || null,
      participant_count: participantCount === '' ? null : participantCount,
      signin_photo_urls: signinPhotos,
      reflection: reflection.trim(),
      photo_urls: recordPhotos,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = existingReportId
      ? await supabase.from('course_reports').update(payload).eq('id', existingReportId)
      : await supabase.from('course_reports').insert(payload)

    setSaving(false)
    if (upsertError) { setError('儲存失敗：' + upsertError.message); return }
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
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">成果報告</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-5">
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-1.5">
          <p className="font-bold text-stone-800 text-base">{course?.title}</p>
          <p className="text-xs text-stone-500">{course?.date} · {(course?.time_start || '').slice(0, 5)}-{(course?.time_end || '').slice(0, 5)} · {course?.location}</p>
          {coInstructorNames.length > 0 && (
            <p className="text-xs text-stone-500">合作講師：{coInstructorNames.join('、')}</p>
          )}
          {deadlineInfo && (
            <p className={`text-xs font-medium mt-1 ${deadlineInfo.overdue ? 'text-red-500' : 'text-orange-500'}`}>
              {deadlineInfo.overdue ? `已逾期，請盡快補件（原期限 ${deadlineDays} 天內）` : `請於 ${deadlineInfo.daysLeft} 天內完成填寫（期限 ${deadlineDays} 天）`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-600">活動簡介</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3}
            className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-600">活動參與人數</label>
          <input type="number" min={0} value={participantCount}
            onChange={e => setParticipantCount(e.target.value === '' ? '' : parseInt(e.target.value))}
            className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <p className="text-xs text-stone-400">預設帶入你勾選的出席紀錄人數，若現場有未事先報名者，可自行修正</p>
        </div>

        <PhotoUploadBlock label="簽到表照片" required min={MIN_SIGNIN_PHOTOS} max={MAX_SIGNIN_PHOTOS}
          photos={signinPhotos} onChange={setSigninPhotos} folder="course-reports/signin" />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-600"><span className="text-red-500 text-xs mr-1">*</span>心得感想</label>
          <p className="text-xs text-stone-400">可包含：與居民互動後的感觸、發現的共同需求或關心議題、可發展的主題社團想法、其他回饋等</p>
          <textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={6}
            className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
        </div>

        <PhotoUploadBlock label="活動紀錄照片" required min={MIN_RECORD_PHOTOS} max={MAX_RECORD_PHOTOS}
          photos={recordPhotos} onChange={setRecordPhotos} folder="course-reports/record" />

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <div className="fixed bottom-0 inset-x-0 z-30 bg-white p-4 shadow-[0px_-3px_4px_0px_rgba(0,0,0,0.08)]">
          <button type="submit" disabled={!canSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-base transition-colors">
            {saving ? '儲存中...' : existingReportId ? '更新成果報告' : '送出成果報告'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <ReportPageInner />
    </Suspense>
  )
}
