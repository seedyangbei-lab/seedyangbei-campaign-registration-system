'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CoursePosterEditor from '@/components/CoursePosterEditor'

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
  location: '', custom_location: '', notes: '', suitable_age: '全年齡', poster_url: '',
}

const emptyProfileForm = { bio: '', avatar_url: '', phone: '', line_id: '' }
function InstructorPortal() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [status, setStatus] = useState<'checking' | 'not_bound' | 'ready'>('checking')
  const [instructor, setInstructor] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [tab, setTab] = useState<'courses' | 'profile'>('courses')
  const [profileForm, setProfileForm] = useState(emptyProfileForm)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [posterEditorCourse, setPosterEditorCourse] = useState<any>(null)
  const [posterInitialImage, setPosterInitialImage] = useState<string | null>(null)

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
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }
  const fetchCourses = async (instructorId: string) => {
    setCoursesLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('*')
      .contains('instructor_ids', [instructorId])
      .order('date', { ascending: false })
    setCourses(data || [])
    setCoursesLoading(false)
  }

  const openEdit = (course: any) => {
    setEditTarget(course)
    setForm({
      title: course.title || '',
      description: course.description || '',
      date: course.date || '',
      time_start: (course.time_start || '').slice(0, 5),
      time_end: (course.time_end || '').slice(0, 5),
      location: LOCATIONS.includes(course.location) ? course.location : '其他',
      custom_location: LOCATIONS.includes(course.location) ? '' : (course.location || ''),
      notes: course.notes || '',
      suitable_age: course.suitable_age || '全年齡',
      poster_url: course.poster_url || '',
    })
    setShowModal(true)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const filename = `posters/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
      setForm(f => ({ ...f, poster_url: urlData.publicUrl }))
    }
    setUploading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget || !instructor) return
    setSaving(true)

    const location = form.location === '其他' ? form.custom_location : form.location
    const afterData = {
      title: form.title,
      description: form.description,
      date: form.date,
      time_start: form.time_start,
      time_end: form.time_end,
      location,
      notes: form.notes,
      suitable_age: form.suitable_age,
      poster_url: form.poster_url || null,
    }

    await supabase.from('course_edit_logs').insert({
      course_id: editTarget.id,
      instructor_id: instructor.id,
      before_data: editTarget,
      after_data: { ...editTarget, ...afterData },
    })

    await supabase.from('courses').update(afterData).eq('id', editTarget.id)

    setShowModal(false)
    setSaving(false)
    fetchCourses(instructor.id)
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
          <a href={getLineLoginUrl()} className="inline-block bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors">
            用 LINE 登入
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-stone-400 text-xs tracking-widest uppercase mb-1">講師中台</p>
        <h1 className="text-stone-800 text-2xl font-bold mb-4">{instructor?.name}</h1>

        <div className="flex gap-2 mb-6 border-b border-stone-200">
          <button onClick={() => setTab('courses')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'courses' ? 'border-rose-500 text-rose-600' : 'border-transparent text-stone-400'}`}>
            我的課程
          </button>
          <button onClick={() => setTab('profile')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'profile' ? 'border-rose-500 text-rose-600' : 'border-transparent text-stone-400'}`}>
            個人資料
          </button>
        </div>

        {tab === 'profile' && (
          <form onSubmit={handleProfileSave} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              {profileForm.avatar_url ? (
                <img src={profileForm.avatar_url} alt="大頭照" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-rose-600 font-bold text-xl">{instructor?.name?.[0]}</span>
                </div>
              )}
              <label className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-lg transition-colors cursor-pointer">
                更換大頭照
                <input type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
              </label>
            </div>
            <div>
              <label className="block text-stone-600 text-sm font-medium mb-1.5">簡介</label>
              <textarea value={profileForm.bio} onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                rows={3} placeholder="簡短介紹自己" className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
            </div>
            <div>
              <label className="block text-stone-600 text-sm font-medium mb-1.5">聯絡電話</label>
              <input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="例：0912345678" className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <div>
              <label className="block text-stone-600 text-sm font-medium mb-1.5">LINE ID 或課程群組連結</label>
              <input value={profileForm.line_id} onChange={e => setProfileForm({ ...profileForm, line_id: e.target.value })}
                placeholder="例：@abc1234 或 https://line.me/R/ti/g/xxxxxxxx" className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <button type="submit" disabled={profileSaving}
              className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
              {profileSaving ? '儲存中...' : profileSaved ? '已儲存 ✓' : '儲存個人資料'}
            </button>
          </form>
        )}

        {tab === 'courses' && (<>
        {coursesLoading && (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 h-20 animate-pulse" />
            ))}
          </div>
        )}

        {!coursesLoading && courses.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-400 text-sm">
            目前沒有掛在你名下的課程
          </div>
        )}

        <div className="space-y-3">
          {courses.map(c => (
            <div key={c.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center gap-4">
              {c.poster_url && (
                <img src={c.poster_url} alt={c.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-stone-800 font-semibold truncate">{c.title}</p>
                <p className="text-stone-400 text-xs mt-0.5">{c.date} · {c.time_start?.slice(0, 5)}–{c.time_end?.slice(0, 5)} · {c.location}</p>
              </div>
              <button onClick={() => openEdit(c)} className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                編輯
              </button>
            </div>
          ))}
        </div>
        </>)}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="text-stone-800 font-bold text-lg">編輯課程</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程標題 *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程簡介</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">日期 *</label>
                  <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">開始</label>
                  <input type="time" value={form.time_start} onChange={e => setForm({ ...form, time_start: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">結束</label>
                  <input type="time" value={form.time_end} onChange={e => setForm({ ...form, time_end: e.target.value })}
                    className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">上課地點</label>
                <select value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                  <option value="">請選擇</option>
                  {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                {form.location === '其他' && (
                  <input value={form.custom_location} onChange={e => setForm({ ...form, custom_location: e.target.value })}
                    placeholder="輸入地點" className="w-full mt-2 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                )}
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">適合年齡</label>
                <input value={form.suitable_age} onChange={e => setForm({ ...form, suitable_age: e.target.value })}
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">注意事項</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
              </div>

              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">課程海報</label>
                {form.poster_url && (
                  <div className="relative mb-2">
                    <img src={form.poster_url} alt="海報預覽" className="w-full rounded-xl object-contain" style={{ maxHeight: 320 }} />
                    <button type="button" onClick={() => setForm({ ...form, poster_url: '' })}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
                <label className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-stone-300 hover:border-rose-400 text-stone-500 hover:text-rose-500 text-sm transition-colors cursor-pointer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                  {uploading ? '上傳中...' : '上傳海報圖片'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
                <button type="button" onClick={() => {
                  setPosterEditorCourse({
                    title: form.title,
                    instructor: instructor?.name,
                    date: form.date,
                    timeStart: form.time_start,
                    timeEnd: form.time_end,
                    location: form.location === '其他' ? form.custom_location : form.location,
                    suitableAge: form.suitable_age,
                    notes: form.notes,
                  })
                  setPosterInitialImage(form.poster_url || null)
                }}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-stone-300 hover:border-rose-400 text-stone-500 hover:text-rose-500 text-sm transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  製作課程海報
                </button>
                <p className="text-stone-400 text-xs mt-1.5">設計完成後會下載成圖片，再用上方「上傳海報圖片」放進課程。</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {saving ? '儲存中...' : '儲存變更'}
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

      {posterEditorCourse && (
        <CoursePosterEditor
          course={posterEditorCourse}
          initialImage={posterInitialImage}
          onClose={() => {
            setPosterEditorCourse(null)
            setPosterInitialImage(null)
            setShowModal(true)
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
