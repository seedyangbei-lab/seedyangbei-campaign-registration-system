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

const DEMO_COURSE_DISPLAY = { id: DEMO_COURSE_ID, title: '範例課程（僅供教學示範）', date: new Date().toISOString().split('T')[0], time_start: '10:00', time_end: '12:00', location: '示範地點' }

const AGE_GROUPS = ['18歲以下','18~25歲','26~35歲','36~45歲','46~55歲','56~65歲','65歲以上']
const BUILDINGS = ['A棟','B棟','C棟','D棟']
const UNIT_NUMBERS = ['398','400','135','137']
const FLOORS = Array.from({ length: 17 }, (_, i) => String(i + 2)) // 2 ~ 18
const SUB_UNITS = Array.from({ length: 9 }, (_, i) => String(i + 1)) // 1 ~ 9

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
      .select('name, room_number, phone, age_group')
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
        }).eq('id', userId)
      } else {
        const { data: newUser, error: userErr } = await supabase.from('users').insert({
          name: form.name, room_number: roomNumber,
          phone: form.phone.replace(/-/g, ''),
          email: `${lineUserId}@line.user`,
          line_id: lineUserId, age_group: form.age_group,
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
      if (tutorialStep === '3') saveTutorialStep('4')
      router.push('/register-success')
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
      <div className="sticky top-0 z-30 bg-white shadow-[0px_4px_2px_rgba(0,0,0,0.03)] h-[52px] flex items-center justify-between px-4">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-stone-800 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回首頁
        </button>
        {lineUser && (
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)] px-2 py-2">
            {lineUser.pictureUrl
              ? <img src={lineUser.pictureUrl} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
              : <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0"><span className="text-green-700 text-[10px] font-bold">{lineUser.displayName?.[0]}</span></div>}
            <span className="text-xs font-medium text-stone-700 max-w-[80px] truncate">{lineUser.displayName}</span>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
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

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5 shadow-sm">
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>姓名</label>
            <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="請輸入您的姓名"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-300" />
          </div>

          <div>
            <label className="block text-base font-medium text-stone-700 mb-3"><span className="text-orange-500">* </span>居住身份</label>
            <div className="flex gap-3">
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
              <label className="block text-base font-medium text-stone-700 mb-3"><span className="text-orange-500">* </span>房號</label>

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
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
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
                    <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
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
              <label className="block text-base font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>請說明來自哪個社區</label>
              <input required type="text" value={form.other_community} onChange={e => setForm({...form, other_community: e.target.value})}
                placeholder="例：附近里民、其他社宅"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          )}

          <div>
            <label className="block text-base font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>手機號碼</label>
            <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              placeholder="09XXXXXXXX（共 10 碼）" maxLength={10}
              className={`w-full border rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-300 ${form.phone && !validatePhone(form.phone) ? 'border-red-400 bg-red-50' : 'border-stone-300'}`} />
            {form.phone && !validatePhone(form.phone) && (
              <p className="text-red-500 text-sm mt-1.5">請填寫 09 開頭共 10 碼的手機號碼</p>
            )}
          </div>

          <div>
            <label className="block text-base font-medium text-stone-700 mb-3"><span className="text-orange-500">* </span>年齡區間</label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {AGE_GROUPS.map(age => (
                <button key={age} type="button" onClick={() => setForm({...form, age_group: age})}
                  className={`h-[50px] rounded-[10px] border text-base transition-colors font-medium ${form.age_group === age ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300 hover:border-orange-300'}`}>
                  {age}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">課前想說的話 <span className="text-stone-400 text-sm font-normal">（選填）</span></label>
            <textarea value={form.questions} onChange={e => setForm({...form, questions: e.target.value})}
              placeholder="有任何想法或問題都可以寫下來～" rows={3}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
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
