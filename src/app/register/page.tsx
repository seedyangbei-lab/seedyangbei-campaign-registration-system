'use client'

import React, { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { logFunnelStep } from '@/lib/funnelLog'
import { getTutorialStep, setTutorialStep as saveTutorialStep, DEMO_COURSE_ID } from '@/lib/tutorial'
import { useTutorialRect } from '@/lib/useTutorialRect'
import TutorialMask from '@/components/TutorialMask'
import TutorialTooltip from '@/components/TutorialTooltip'
import TutorialSkipButton from '@/components/TutorialSkipButton'
import SiteNavbar from '@/components/SiteNavbar'
import Link from 'next/link'
import { BUILDINGS, UNIT_NUMBERS, FLOORS, SUB_UNITS } from '@/lib/address'

const DEMO_COURSE_DISPLAY = { id: DEMO_COURSE_ID, title: '範例課程（僅供教學示範）', date: new Date().toISOString().split('T')[0], time_start: '10:00', time_end: '12:00', location: '示範地點' }

// 報名記錄 icon（橘色按鈕內，白色）／返回 icon（白色按鈕內，灰色）：跟 register-success 頁同一份合併 SVG 裁切出來
function IconRegistrationList() {
  return (
    <div className="w-[18px] h-[18px] overflow-hidden relative flex-shrink-0">
      <svg width="34" height="76" viewBox="0 0 34 76" fill="none" className="absolute" style={{ left: '-2px', top: '-2px' }} aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M13.1973 2.25C13.7245 2.25 14.2483 2.56725 14.4292 3.13088L14.4805 3.29693L14.5338 3.48593L14.5878 3.69922L14.6398 3.93278L14.689 4.18658L14.712 4.32022L14.7532 4.6017C14.9084 5.80995 14.8591 7.45695 13.9958 9.12758L13.8885 9.32805C12.9826 10.9582 13.0481 12.5991 13.2526 13.6649L13.3026 13.9005L13.3282 14.0099L13.3802 14.2124L13.4322 14.3892C13.6171 14.9899 13.2175 15.6865 12.5365 15.7459L12.442 15.75H4.62479C4.09829 15.75 3.57382 15.4328 3.39292 14.8691L3.34229 14.7031L3.28829 14.5141L3.23429 14.3008L3.18232 14.0672L3.13304 13.8134C3.11684 13.7257 3.10199 13.635 3.08849 13.5414L3.05137 13.2512L3.02302 12.9447C2.93729 11.7945 3.06689 10.3426 3.82627 8.87243L3.93359 8.67195C4.83944 7.0425 4.77329 5.4009 4.56944 4.33575L4.52017 4.10018L4.49384 3.99083L4.44187 3.78832L4.38989 3.61148C4.20494 3.01073 4.60454 2.31412 5.28562 2.25472L5.38079 2.25H13.1973ZM8.91104 9H6.88604C6.70702 9 6.53533 9.07112 6.40874 9.1977C6.28216 9.32429 6.21104 9.49598 6.21104 9.675C6.21104 9.85402 6.28216 10.0257 6.40874 10.1523C6.53533 10.2789 6.70702 10.35 6.88604 10.35H8.91104C9.09006 10.35 9.26175 10.2789 9.38834 10.1523C9.51492 10.0257 9.58604 9.85402 9.58604 9.675C9.58604 9.49598 9.51492 9.32429 9.38834 9.1977C9.26175 9.07112 9.09006 9 8.91104 9ZM11.611 6.3H7.56104C7.389 6.30019 7.22352 6.36607 7.09842 6.48417C6.97331 6.60228 6.89803 6.76369 6.88795 6.93544C6.87787 7.10719 6.93375 7.27631 7.04417 7.40824C7.15459 7.54017 7.31123 7.62496 7.48207 7.64528L7.56104 7.65H11.611C11.7831 7.64981 11.9486 7.58393 12.0737 7.46583C12.1988 7.34772 12.274 7.18631 12.2841 7.01456C12.2942 6.84281 12.2383 6.67369 12.1279 6.54176C12.0175 6.40983 11.8609 6.32505 11.69 6.30473L11.611 6.3Z" fill="white"/>
      </svg>
    </div>
  )
}
function IconBack() {
  return (
    <div className="w-[18px] h-[18px] overflow-hidden relative flex-shrink-0">
      <svg width="34" height="76" viewBox="0 0 34 76" fill="none" className="absolute" style={{ left: '-17px', top: '-60px' }} aria-hidden="true">
        <path d="M20.8291 61.1241C21.0447 60.9393 21.3698 60.9642 21.5547 61.1797C21.7394 61.3953 21.7144 61.7195 21.499 61.9043L19.7539 63.4004H26.6484C29.2842 63.4007 31.5144 65.5451 31.6172 68.1797C31.726 70.9646 29.433 73.3425 26.6484 73.3428H20.8203C20.5365 73.3426 20.3066 73.1121 20.3066 72.8282C20.3069 72.5445 20.5366 72.3147 20.8203 72.3145H26.6484C28.8507 72.3142 30.6758 70.4198 30.5898 68.2198C30.5085 66.1373 28.7318 64.429 26.6484 64.4288H20.3486L21.5283 65.6075C21.7291 65.8082 21.7289 66.1341 21.5283 66.335C21.3275 66.5358 21.0016 66.5358 20.8008 66.335L18.8945 64.4288H18.7646C18.4806 64.4288 18.25 64.1981 18.25 63.9141C18.25 63.8533 18.2618 63.7954 18.2812 63.7413C18.2601 63.6809 18.2485 63.617 18.251 63.5518C18.2565 63.4088 18.321 63.2739 18.4297 63.1807L20.8291 61.1241Z" fill="#44403C"/>
      </svg>
    </div>
  )
}

const AGE_GROUPS = ['18歲以下','18~25歲','26~35歲','36~45歲','46~55歲','56~65歲','65歲以上']

function RegisterForm() {
  const router = useRouter()
  const supabase = createClient()

  const [initialized, setInitialized] = useState(false)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [courseIds, setCourseIds] = useState<string[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [lineUser, setLineUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [prefilling, setPrefilling] = useState(false)
  const [prefilled, setPrefilled] = useState(false)
  const [error, setError] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [isSocialHousing, setIsSocialHousing] = useState(true)
  const [building, setBuilding] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [subUnit, setSubUnit] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', age_group: '', other_community: '', questions: '' })

  // 首次登入教學導覽 step3：填寫報名資料
  const [tutorialStep, setTutorialStepState] = useState<string | null>(null)
  const tutorialTargetRef = useRef<HTMLDivElement>(null)
  const tutorialHole = useTutorialRect(tutorialTargetRef, tutorialStep === '3', 6, 20)

  useEffect(() => {
    if (getTutorialStep() === '3') setTutorialStepState('3')
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // 優先從 URL 讀，fallback 從 sessionStorage 讀（LINE 登入後回來的情況）
    const urlIds = params.get('courses')?.split(',').filter(Boolean) || []
    const sessionIds = sessionStorage.getItem('pending_courses')?.split(',').filter(Boolean) || []
    const ids = urlIds.length > 0 ? urlIds : sessionIds
    if (ids.length > 0) sessionStorage.removeItem('pending_courses')
    const lineUserParam = params.get('line_user')
    const errParam = params.get('error')

    console.log('[Register] URL:', window.location.href)
    console.log('[Register] ids:', ids)
    console.log('[Register] lineUserParam:', lineUserParam ? '有值' : '無')

    let user: any = null
    if (lineUserParam) {
      try {
        user = JSON.parse(decodeURIComponent(lineUserParam))
        localStorage.setItem('line_user', JSON.stringify(user))
      } catch {}
    }
    if (!user) {
      try {
        const stored = localStorage.getItem('line_user')
        if (stored) user = JSON.parse(stored)
      } catch {}
    }

   if (ids.length === 0) {
      logFunnelStep('register_guard_fail', undefined, { hadLineUserParam: !!lineUserParam, url: window.location.href })
      setShouldRedirect(true)
      setInitialized(true)
      return
    }

    setCourseIds(ids)
    logFunnelStep('line_callback', ids.join(','), { hasLineUser: !!user })

    if (user) {
      setLineUser(user)
      setForm(f => ({ ...f, name: user.displayName || '' }))
      prefillUserData(user.lineUserId)
    }

    if (errParam === 'line_denied') setError('LINE 登入已取消')
    if (errParam === 'line_failed') setError('LINE 登入失敗，請稍後再試')

    const realIds = ids.filter(id => id !== DEMO_COURSE_ID)
    const hasDemo = realIds.length !== ids.length
    if (realIds.length > 0) {
      supabase.from('courses')
        .select('id, title, date, time_start, time_end, location')
        .in('id', realIds)
        .then(({ data }) => setCourses([
          ...(hasDemo ? [DEMO_COURSE_DISPLAY] : []),
          ...(data || []),
        ]))
    } else if (hasDemo) {
      setCourses([DEMO_COURSE_DISPLAY])
    }

    setInitialized(true)
  }, [])

  useEffect(() => {
    if (shouldRedirect) router.push('/')
  }, [shouldRedirect])

  const prefillUserData = async (lineUserId: string) => {
    setPrefilling(true)
    const { data: user } = await supabase
      .from('users')
      .select('name, room_number, phone, age_group, other_community')
      .eq('line_id', lineUserId)
      .maybeSingle()

    if (user) {
      const roomRaw = user.room_number || ''
      let parsedBuilding = '', parsedUnit = '', parsedFloor = '', parsedSub = ''
      let isSocial = true

      if (roomRaw === '非社宅居民') {
        isSocial = false
      } else {
        const match = roomRaw.match(/^([A-Z]棟)\s+(\d+)-(\d+)F-(\d+)$/)
        const matchNoSub = !match && roomRaw.match(/^([A-Z]棟)\s+(\d+)-(\d+)F$/)
        if (match) {
          parsedBuilding = match[1]
          parsedUnit = match[2]
          parsedFloor = match[3]
          parsedSub = match[4]
        } else if (matchNoSub) {
          parsedBuilding = matchNoSub[1]
          parsedUnit = matchNoSub[2]
          parsedFloor = matchNoSub[3]
          parsedSub = 'none'
        }
      }

      setForm(f => ({
        ...f,
        name: user.name || f.name,
        phone: user.phone || f.phone,
        age_group: user.age_group || f.age_group,
        other_community: isSocial ? f.other_community : (user.other_community || f.other_community),
      }))
      setIsSocialHousing(isSocial)
      if (isSocial) {
        setBuilding(parsedBuilding)
        setUnitNumber(parsedUnit)
        setFloor(parsedFloor)
        setSubUnit(parsedSub)
      }
      setPrefilled(true)
    }
    setPrefilling(false)
  }

  const validatePhone = (p: string) => /^09\d{8}$/.test(p.replace(/-/g, ''))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lineUser) { setError('請先用 LINE 帳號登入'); return }
    if (!validatePhone(form.phone)) { setError('手機號碼格式錯誤，請填寫 09 開頭共 10 碼'); return }

    // 教學導覽的示範課程：不寫入任何真實資料，只是走一次流程給使用者看
    if (courseIds.includes(DEMO_COURSE_ID)) {
      setLoading(true); setError('')
      logFunnelStep('register_submit', courseIds.join(','))
      if (tutorialStep === '3') saveTutorialStep('4')
      setTimeout(() => router.push('/register-success'), 400)
      return
    }

    setLoading(true); setError('')
    logFunnelStep('register_submit', courseIds.join(','))

    const roomNumber = isSocialHousing
      ? (subUnit === 'none' ? `${building} ${unitNumber}-${floor}F` : `${building} ${unitNumber}-${floor}F-${subUnit}`)
      : '非社宅居民'
    const lineUserId = lineUser.lineUserId

    try {
      let userId: string
      const { data: existingByLine } = await supabase
        .from('users').select('id').eq('line_id', lineUserId).maybeSingle()

      if (existingByLine) {
        userId = existingByLine.id
        await supabase.from('users').update({
          name: form.name, room_number: roomNumber,
          phone: form.phone.replace(/-/g, ''), age_group: form.age_group,
          other_community: isSocialHousing ? null : form.other_community,
        }).eq('id', userId)
      } else {
        const { data: newUser, error: userErr } = await supabase.from('users').insert({
          name: form.name, room_number: roomNumber,
          phone: form.phone.replace(/-/g, ''),
          email: `${lineUserId}@line.user`,
          line_id: lineUserId, age_group: form.age_group,
          other_community: isSocialHousing ? null : form.other_community,
        }).select('id').single()
        if (userErr) throw userErr
        userId = newUser.id
      }

      for (const courseId of courseIds) {
        const { error: regErr } = await supabase.from('registrations').insert({
          user_id: userId, course_id: courseId,
          questions: form.questions || null,
          is_social_housing_resident: isSocialHousing,
          other_community: isSocialHousing ? null : form.other_community,
          status: 'confirmed',
        })
        if (regErr && regErr.code !== '23505') throw regErr
      }
     logFunnelStep('register_success', courseIds.join(','))
      if (tutorialStep === '3') {
        // 教學導覽走到這一步固定跳頁到 /register-success，才能接續教學的第 4 步
        saveTutorialStep('4')
        router.push('/register-success')
        return
      }
      // 電腦版：原地彈窗顯示成功訊息，不跳頁；手機版維持原本跳轉到 /register-success
      if (typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
        setShowSuccessModal(true)
      } else {
        router.push('/register-success')
      }
    } catch (err: any) {
      logFunnelStep('register_error', courseIds.join(','), { message: err.message })
      setError(err.message || '報名失敗，請稍後再試')
    } finally { setLoading(false) }
  }

  if (!initialized) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )

  if (shouldRedirect) return null

  return (
    <main className="min-h-screen bg-stone-50">
      <SiteNavbar variant="inner" />

      <div className="max-w-lg md:max-w-[800px] mx-auto px-4 md:px-6 py-6 md:py-10">
        <div className="mb-5 pb-4 border-b border-stone-200">
          <h1 className="text-xl font-bold text-stone-600">填寫報名資料</h1>
          <p className="text-stone-400 mt-1 text-sm">填寫一次即可同時報名以下課程</p>
        </div>

        <div ref={tutorialTargetRef}>
        {lineUser ? (
          <div className="bg-green-50 border border-stone-200 rounded-2xl p-2.5 mb-5 flex items-center gap-3">
            {lineUser.pictureUrl
              ? <img src={lineUser.pictureUrl} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
              : <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0"><span className="text-green-700 font-bold">{lineUser.displayName?.[0]}</span></div>}
            <div className="flex-1">
              <p className="text-sm font-bold text-green-700">已用 LINE 登入</p>
              <p className="text-xs text-green-700">{lineUser.displayName}</p>
            </div>
            {prefilled && (
              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200 font-medium flex-shrink-0">
                已帶入上次資料
              </span>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-amber-700">
            請返回首頁，選擇課程後系統會引導您用 LINE 登入。
          </div>
        )}

        {courses.length > 0 && (
          <div className="bg-orange-50 border border-stone-200 rounded-2xl p-2.5 mb-5">
            <p className="text-sm font-bold text-orange-600 mb-2">已選擇 {courses.length} 堂課程</p>
            {courses.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-orange-600 mt-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{c.date} · {c.title}</span>
              </div>
            ))}
          </div>
        )}

        {prefilling && (
          <div className="text-center py-4 text-stone-400 text-sm">讀取您的資料中...</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 md:p-[25px] space-y-5 md:space-y-4 shadow-sm">
          <div>
            <label className="block text-base md:text-lg font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>姓名</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="請輸入您的姓名"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <div>
            <label className="block text-base md:text-lg font-medium text-stone-700 mb-3"><span className="text-orange-500">* </span>居住身份</label>
            <div className="flex gap-3 md:gap-4">
              {[{v: true, l: '社宅居民'}, {v: false, l: '非社宅居民'}].map(opt => (
                <button key={String(opt.v)} type="button" onClick={() => setIsSocialHousing(opt.v)}
                  className={`flex-1 h-[50px] rounded-[10px] border text-base font-medium transition-colors ${isSocialHousing === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {isSocialHousing && (
            <div>
              <label className="block text-base md:text-lg font-medium text-stone-700 mb-3"><span className="text-orange-500">* </span>房號</label>

              <div className="flex flex-col gap-1 mb-4">
                <label className="text-sm text-stone-500">棟別</label>
                <div className="grid grid-cols-4 gap-2">
                  {BUILDINGS.map(b => (
                    <button key={b} type="button" onClick={() => setBuilding(b)}
                      className={`h-[50px] rounded-[10px] border text-base font-medium transition-colors ${building === b ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1 mb-4">
                <label className="text-sm text-stone-500">號數</label>
                <div className="grid grid-cols-4 gap-2">
                  {UNIT_NUMBERS.map(n => (
                    <button key={n} type="button" onClick={() => setUnitNumber(n)}
                      className={`h-[50px] rounded-[10px] border text-base font-medium transition-colors ${unitNumber === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                      {n}號
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <label className="text-sm text-stone-500">樓層</label>
                  <div className="relative">
                    <select required value={floor} onChange={e => setFloor(e.target.value)}
                      className="w-full appearance-none border border-stone-200 rounded-lg pl-4 pr-9 py-3 text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                      <option value="">請選擇樓層</option>
                      {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <label className="text-sm text-stone-500">之幾</label>
                  <div className="relative">
                    <select required value={subUnit} onChange={e => setSubUnit(e.target.value)}
                      className="w-full appearance-none border border-stone-200 rounded-lg pl-4 pr-9 py-3 text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                      <option value="">請選擇幾之幾</option>
                      <option value="none">無</option>
                      {SUB_UNITS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>

              {building && unitNumber && floor && subUnit && (
                <div className="mt-3 bg-stone-100 border border-stone-300 rounded-lg p-2.5">
                  <p className="text-sm text-stone-500">請確認您的房號為</p>
                  <p className="text-lg font-bold text-stone-800">
                    {building} {unitNumber}-{floor}F{subUnit !== 'none' ? `-${subUnit}` : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {!isSocialHousing && (
            <div>
              <label className="block text-base md:text-lg font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>請說明來自哪個社區</label>
              <input required type="text" value={form.other_community} onChange={e => setForm({...form, other_community: e.target.value})}
                placeholder="例：附近里民、其他社宅"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          )}

          <div>
            <label className="block text-base md:text-lg font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>手機號碼</label>
            <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="09XXXXXXXX（共 10 碼）" maxLength={10}
              className={`w-full border rounded-xl px-4 py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-orange-300 ${form.phone && !validatePhone(form.phone) ? 'border-red-400 bg-red-50' : 'border-stone-300'}`} />
            {form.phone && !validatePhone(form.phone) && (
              <p className="text-red-500 text-sm mt-1.5">請填寫 09 開頭共 10 碼的手機號碼</p>
            )}
          </div>

          <div>
            <label className="block text-base md:text-lg font-medium text-stone-700 mb-3"><span className="text-orange-500">* </span>年齡區間</label>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
              {AGE_GROUPS.map(age => (
                <button key={age} type="button" onClick={() => setForm({...form, age_group: age})}
                  className={`h-[50px] rounded-[10px] border text-base transition-colors font-medium ${form.age_group === age ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300 hover:border-orange-300'}`}>
                  {age}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base md:text-lg font-medium text-stone-700 mb-2">課前想說的話 <span className="text-stone-400 text-sm font-normal">（選填）</span></label>
            <textarea value={form.questions} onChange={e => setForm({...form, questions: e.target.value})}
              placeholder="有任何想法或問題都可以寫下來～" rows={3}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none md:h-[124px]" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

          <button type="submit"
            disabled={loading || !form.age_group || !lineUser || (isSocialHousing && (!building || !unitNumber || !floor || !subUnit))}
            className="w-full h-[50px] bg-orange-50 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed border border-orange-200 text-orange-600 font-medium rounded-[10px] text-base transition-colors">
            {loading ? '報名中...' : `確認報名 ${courseIds.length} 堂課程`}
          </button>
        </form>
        </div>
      </div>

      {tutorialStep === '3' && (
        <>
          <TutorialMask holes={[tutorialHole]} />
          <TutorialTooltip hole={tutorialHole} number={3} text="填寫報名資料，填完後點選確認報名" placement="above" widthClass="max-w-[220px]" />
          <TutorialSkipButton onSkip={() => setTutorialStepState(null)} />
        </>
      )}

      {/* 電腦版報名成功彈窗：原地顯示，不跳頁（比照 Figma popup）。只有電腦版會設成 true，手機版仍走 /register-success 跳頁 */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-[390px] bg-[#fafaf9] rounded-[24px] shadow-[0px_-4px_5px_0px_rgba(0,0,0,0.2)] p-6">
            <img
              src="/illustrations/Property%201=success.png"
              alt="報名成功"
              className="w-[200px] h-[200px] object-contain mx-auto mb-4"
            />
            <h1 className="text-xl font-bold text-stone-600 font-['GenSenRounded2TW']">報名成功！</h1>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed font-['GenSenRounded2TW']">
              感謝您的報名！<br />我們將透過 LINE 與您聯繫課程相關資訊。
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <a href="/profile"
                className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-base w-full">
                <IconRegistrationList />
                查看我的報名記錄
              </a>
              <Link href="/"
                className="inline-flex items-center justify-center gap-2 bg-white border border-stone-300 hover:bg-stone-50 text-stone-600 font-medium px-8 py-3.5 rounded-xl transition-colors text-base w-full">
                <IconBack />
                返回課程列表
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="w-10 h-10 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  )
}
