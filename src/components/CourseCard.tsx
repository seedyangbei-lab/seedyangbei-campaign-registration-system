'use client'

import { useState, useEffect, useRef } from 'react'
import { logFunnelStep } from '@/lib/funnelLog'
import { getTutorialStep, setTutorialStep as saveTutorialStep, shouldAutoStartTutorial, DEMO_COURSE_ID } from '@/lib/tutorial'
import { useTutorialRect } from '@/lib/useTutorialRect'
import TutorialMask from '@/components/TutorialMask'
import TutorialTooltip from '@/components/TutorialTooltip'
import TutorialSkipButton from '@/components/TutorialSkipButton'

interface Category { id: string; name: string; color: string }
interface Course {
  id: string; title: string; description: string; date: string
  time_start: string; time_end: string; location: string; max_seats: number
  poster_url?: string; photo_urls?: string[]; notes?: string; suitable_age?: string
  line_group_url?: string
  instructors?: { id: string; name: string; phone?: string; line_id?: string } | null
  instructors_list?: { id: string; name: string }[]
  course_categories?: { id: string; name: string; color: string } | null
}

function getCoursePhotos(course: Course): string[] {
  if (course.photo_urls && course.photo_urls.length > 0) return course.photo_urls
  return course.poster_url ? [course.poster_url] : []
}

// 課程照片輪播（多張時比照 IG 概念，可滑動切換＋底部圓點指示器；
// 手機用原生 touch 滑動，桌機額外支援滑鼠拖曳與左右箭頭，圓點也可直接點擊切換）
function CoursePhotoCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startScrollLeft: number; moved: boolean } | null>(null)

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const scrollToIndex = (i: number) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  // 桌機滑鼠拖曳捲動（觸控裝置交給瀏覽器原生 overflow-scroll + snap 處理）
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return
    const el = scrollerRef.current
    if (!el) return
    dragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current
    const el = scrollerRef.current
    if (!drag || !el) return
    const dx = e.clientX - drag.startX
    if (Math.abs(dx) > 3) drag.moved = true
    el.scrollLeft = drag.startScrollLeft - dx
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <div className="absolute inset-0" onClick={e => { if (dragRef.current?.moved) { e.stopPropagation(); return } e.stopPropagation() }}>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', touchAction: 'pan-y' }}
      >
        {photos.map((url, i) => (
          <img key={i} src={url} alt={alt} draggable={false} className="w-full h-full object-cover flex-shrink-0 snap-center pointer-events-none" />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          {index > 0 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); scrollToIndex(index - 1) }}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              aria-label="上一張"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          {index < photos.length - 1 && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); scrollToIndex(index + 1) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              aria-label="下一張"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={e => { e.stopPropagation(); scrollToIndex(i) }}
                aria-label={`第 ${i + 1} 張照片`}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// 教學導覽用的示範課程：固定不過期、不會被標記已報名，確保教學時一定有東西可以聚光燈引導點選
function makeDemoCourse(): Course {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const dateStr = d.toISOString().split('T')[0]
  return {
    id: DEMO_COURSE_ID,
    title: '範例課程（僅供教學示範）',
    description: '',
    date: dateStr,
    time_start: '10:00',
    time_end: '12:00',
    location: '示範地點',
    max_seats: 10,
    suitable_age: '全年齡',
    instructors: { id: 'demo-instructor', name: '示範講師' },
    course_categories: { id: 'demo', name: '教學示範', color: '#8b5cf6' },
  }
}

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'

function getLineLoginUrl(courseIds: string) {
  const nonce = Math.random().toString(36).slice(2)
  const statePayload = JSON.stringify({ courses: courseIds, nonce })
  sessionStorage.setItem('line_state_nonce', nonce)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID,
    redirect_uri: LINE_CALLBACK_URL,
    state: statePayload,
    scope: 'profile openid email',
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`
}

function isExpired(c: Course) {
  return new Date(`${c.date}T${c.time_end}`) < new Date()
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-stone-500">
        {icon}
      </div>
      <span className="text-[17px] text-stone-600 leading-tight">{children}</span>
    </div>
  )
}

function InfoSpriteIcon({ y }: { y: number }) {
  return (
    <div className="w-6 h-6 overflow-hidden relative">
      <svg width="24" height="80" viewBox="0 0 24 80" fill="none" className="absolute left-0" style={{ top: `-${y}px` }}>
        <path d="M19.5 14.5C19.5 14.942 19.3244 15.366 19.0118 15.6785C18.6993 15.9911 18.2754 16.1667 17.8333 16.1667H7.83333L4.5 19.5V6.16667C4.5 5.72464 4.67559 5.30072 4.98816 4.98816C5.30072 4.67559 5.72464 4.5 6.16667 4.5H17.8333C18.2754 4.5 18.6993 4.67559 19.0118 4.98816C19.3244 5.30072 19.5 5.72464 19.5 6.16667V14.5Z" stroke="#F97316" strokeWidth="1.5"/>
        <path d="M12.0001 48.3334C16.6025 48.3334 20.3334 44.6025 20.3334 40.0001C20.3334 35.3977 16.6025 31.6667 12.0001 31.6667C7.39771 31.6667 3.66675 35.3977 3.66675 40.0001C3.66675 44.6025 7.39771 48.3334 12.0001 48.3334Z" stroke="#F97316" strokeWidth="1.5"/>
        <path d="M12 35V40L15.3333 41.6667" stroke="#F97316" strokeWidth="1.5"/>
        <g clipPath="url(#courseInfoIconClip)">
          <path d="M19.5 66.3333C19.5 72.1666 12 77.1666 12 77.1666C12 77.1666 4.5 72.1666 4.5 66.3333C4.5 64.3441 5.29018 62.4365 6.6967 61.03C8.10322 59.6234 10.0109 58.8333 12 58.8333C13.9891 58.8333 15.8968 59.6234 17.3033 61.03C18.7098 62.4365 19.5 64.3441 19.5 66.3333Z" stroke="#F97316" strokeWidth="1.5"/>
          <path d="M12 68.8333C13.3807 68.8333 14.5 67.714 14.5 66.3333C14.5 64.9525 13.3807 63.8333 12 63.8333C10.6193 63.8333 9.5 64.9525 9.5 66.3333C9.5 67.714 10.6193 68.8333 12 68.8333Z" stroke="#F97316" strokeWidth="1.5"/>
        </g>
        <defs>
          <clipPath id="courseInfoIconClip">
            <rect width="20" height="20" fill="white" transform="translate(2 58)"/>
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}
const IconPerson = () => <InfoSpriteIcon y={0} />
const IconClock = () => <InfoSpriteIcon y={28} />
const IconPin = () => <InfoSpriteIcon y={56} />

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
    <path d="M16.3505 7.50018C16.693 9.18115 16.4489 10.9287 15.6588 12.4515C14.8688 13.9743 13.5806 15.1802 12.0091 15.8682C10.4376 16.5561 8.67768 16.6845 7.02293 16.232C5.36819 15.7794 3.9186 14.7732 2.91592 13.3812C1.91323 11.9893 1.41805 10.2956 1.51296 8.58271C1.60786 6.86983 2.28712 5.24124 3.43745 3.96855C4.58778 2.69586 6.13964 1.856 7.83426 1.58902C9.52887 1.32203 11.2638 1.64407 12.7497 2.50143M6.75 8.24982L9 10.4998L16.5 2.99982" />
  </svg>
)

const IconLINE = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="white" style={{ display: 'block' }}>
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
)

export default function CourseCard({ courses, categories }: {
  courses: Course[]
  categories: Category[]
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [qrTarget, setQrTarget] = useState<string | null>(null)
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // 首次登入教學導覽（step 1：篩選+選課程 / step 2：前往報名）
  const [tutorialStep, setTutorialStepState] = useState<string | null>(null)
  const filterRowRef = useRef<HTMLDivElement>(null)
  const firstCardRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  // 防止「前往報名」被連續點擊多次：手機上頁面跳轉前有短暫延遲，若使用者心急連點，
  // 會對 LINE 連續發出多次授權請求，前一個請求的 code 還沒交換就被新請求頂掉，
  // 造成登入失敗、選課資訊遺失（詳見 register_guard_fail 事件）
  const proceedingRef = useRef(false)
  const [proceeding, setProceeding] = useState(false)

  const startTutorialStep1 = () => {
    saveTutorialStep('1')
    setTutorialStepState('1')
    // 手機版 Hero 現在是 scroll-driven 影片（VH_MULTIPLIER=2.2，將近 2.2 倍螢幕高），
    // 畫面在捲動途中大部分還是暗色。如果用平滑捲動，會變成教學一開始長達一兩秒
    // 卡在黑畫面慢慢往下滑，容易讓使用者誤會系統卡住、不知道要往下滑。
    // 改成直接「跳」到課程區塊、不要捲動動畫——html 上有全域 scroll-behavior: smooth
    // （見 globals.css，給 CTA 錨點連結用），這裡用 inline style 暫時蓋掉再還原，
    // 才不會影響其他地方原本的平滑捲動效果
    setTimeout(() => {
      const html = document.documentElement
      const prevScrollBehavior = html.style.scrollBehavior
      html.style.scrollBehavior = 'auto'
      document.getElementById('courses')?.scrollIntoView({ behavior: 'auto', block: 'start' })
      html.style.scrollBehavior = prevScrollBehavior
    }, 300)
  }

  useEffect(() => {
    // 開發／預覽用：網址加上 ?tutorial=1 可強制從頭看一次教學，不受「已看過」狀態影響
    if (new URLSearchParams(window.location.search).get('tutorial') === '1') {
      startTutorialStep1()
      return
    }
    let step = getTutorialStep()
    if (!step && shouldAutoStartTutorial()) {
      startTutorialStep1()
      return
    }
    if (step === '1' || step === '2') setTutorialStepState(step)
  }, [])

  const advanceTutorial = (step: string) => {
    saveTutorialStep(step)
    setTutorialStepState(step)
  }
  // 跳過時把示範課程從已選清單移除，避免回到首頁後 CTA 誤以為選了真實課程
  const skipTutorial = () => {
    setTutorialStepState(null)
    setSelected(prev => prev.filter(id => id !== DEMO_COURSE_ID))
  }

  const firstCardHoleStep1 = useTutorialRect(firstCardRef, tutorialStep === '1', 4, 16)
  const firstCardHoleStep2 = useTutorialRect(firstCardRef, tutorialStep === '2', 4, 16)
  const ctaHole = useTutorialRect(ctaRef, tutorialStep === '2', 4, 16)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) setSortMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const fetchRegistered = async () => {
      try {
        const stored = localStorage.getItem('line_user')
        if (!stored) return
        const lineUser = JSON.parse(stored)
        const lineUserId: string = lineUser.lineUserId || lineUser.userId || lineUser.sub || lineUser.id
        console.log('[my-reg] lineUser object:', JSON.stringify(lineUser))
        console.log('[my-reg] lineUserId:', lineUserId)
        if (!lineUserId) return

        const res = await fetch(`/api/my-registrations?line_user_id=${encodeURIComponent(lineUserId)}`)
        console.log('[my-reg] API status:', res.status)
        if (!res.ok) return
        const data: { course_id: string }[] = await res.json()
        console.log('[my-reg] API result:', data)
        setRegisteredIds(new Set(data.map(r => r.course_id)))
      } catch {}
    }
    fetchRegistered()
  }, [])

  const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const toggle = (id: string) => setSelected(prev => {
    const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    if (tutorialStep === '1' && next.length > 0) advanceTutorial('2')
    // 取消勾選回到 0 堂課程時，CTA 按鈕本身會整個消失，教學也退回 step1（重新引導選課）
    else if (tutorialStep === '2' && next.length === 0) advanceTutorial('1')
    return next
  })

  const filtered = (activeCategory === 'all' ? courses : courses.filter(c => c.course_categories?.id === activeCategory))
    .slice()
    .sort((a, b) => {
      // 已報名的課程一律排到最下面，其餘依開課日期排序
      const aRegistered = registeredIds.has(a.id)
      const bRegistered = registeredIds.has(b.id)
      if (aRegistered !== bRegistered) return aRegistered ? 1 : -1
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })

  // 教學導覽時，把示範課程釘在最前面，確保聚光燈一定指向一張「可以點」的卡片，
  // 不會剛好對到已報名或已截止的真實課程
  const displayList = (tutorialStep === '1' || tutorialStep === '2')
    ? [makeDemoCourse(), ...filtered]
    : filtered

  const handleProceed = () => {
    if (proceedingRef.current) return
    proceedingRef.current = true
    setProceeding(true)
    if (tutorialStep === '2') saveTutorialStep('3')
    const ids = selected.join(',')
    logFunnelStep('select_course', ids)
    // 額外寫進 localStorage（不只 sessionStorage）—— 觀察到 funnel_logs 有多筆
    // 「已成功走完 LINE 登入、進到報名頁，幾秒到一分鐘後卻又空手 reload 回 /register」
    // 的案例（register_guard_fail），研判是 LINE App 內建瀏覽器的重新整理／返回行為
    // 有機率把網址列的 query string 清掉。localStorage 不綁定單次 history entry，
    // 重新整理後還在，可以當作最後一層救援，避免使用者被硬彈回首頁、選課記錄整個消失
    localStorage.setItem('pending_courses', ids)
    try {
      const stored = localStorage.getItem('line_user')
      if (stored) {
        const user = JSON.parse(stored)
        window.location.href = `/register?courses=${ids}&line_user=${encodeURIComponent(JSON.stringify(user))}`
        return
      }
    } catch {}
    // 課程 id 直接寫進回跳網址（不只靠 sessionStorage）—— LINE App 內建瀏覽器在授權跳轉時
    // 常會清空或切換 sessionStorage，造成選課記錄遺失，這裡當作雙保險
   sessionStorage.setItem('pending_courses', ids)
    logFunnelStep('line_redirect', ids)
    window.location.href = getLineLoginUrl(ids)
  }
  
  const getLineUrl = (lineId?: string) => {
    if (!lineId) return null
    if (lineId.startsWith('http')) {
      // 補上 /R/ 確保正確跳轉（line.me/ti/ → line.me/R/ti/）
      return lineId.replace('line.me/ti/', 'line.me/R/ti/')
    }
    const cleanId = lineId.replace(/^@/, '')
    return `https://line.me/R/ti/p/~${cleanId}`
  }

  const SORT_OPTIONS: { value: 'asc' | 'desc'; label: string }[] = [
    { value: 'asc', label: '即將開課優先' },
    { value: 'desc', label: '較晚開課優先' },
  ]

  return (
    <div>
      {/* 類別篩選（Dropdown）+ 排序（Icon 點擊選單） */}
      <div ref={filterRowRef} className="flex items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-0">
          <select
            value={activeCategory}
            onChange={e => setActiveCategory(e.target.value)}
            className="w-full appearance-none border border-stone-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
          >
            <option value="all">全部課程</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <div className="relative flex-shrink-0" ref={sortMenuRef}>
          <button
            type="button"
            onClick={() => setSortMenuOpen(v => !v)}
            aria-label="排序方式"
            aria-expanded={sortMenuOpen}
            className={`flex items-center justify-center w-[42px] h-[42px] rounded-xl border transition-colors ${sortMenuOpen ? 'border-orange-300 bg-orange-50 text-orange-500' : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'}`}
          >
            <svg width="18" height="18" viewBox="0 0 30 30" fill="none">
              <path d="M18.7502 22.814C19.268 22.814 19.6877 23.2337 19.6877 23.7515C19.6875 24.269 19.2679 24.689 18.7502 24.689H11.2502C10.7326 24.689 10.313 24.269 10.3127 23.7515C10.3127 23.2337 10.7325 22.814 11.2502 22.814H18.7502ZM22.5002 14.0627C23.018 14.0627 23.4377 14.4825 23.4377 15.0002C23.4376 15.5179 23.0179 15.9377 22.5002 15.9377H7.49902C6.98151 15.9375 6.56164 15.5178 6.56152 15.0002C6.56152 14.4826 6.98144 14.063 7.49902 14.0627H22.5002ZM27.5015 5.31152C28.019 5.31176 28.439 5.7314 28.439 6.24902C28.439 6.76664 28.019 7.18629 27.5015 7.18652H2.49902C1.98126 7.18652 1.56152 6.76679 1.56152 6.24902C1.56152 5.73126 1.98126 5.31152 2.49902 5.31152H27.5015Z" fill="currentColor"/>
            </svg>
          </button>
          {sortMenuOpen && (
            <div className="absolute right-0 top-full mt-2 z-20 w-40 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 overflow-hidden">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setSortOrder(opt.value); setSortMenuOpen(false) }}
                  className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${sortOrder === opt.value ? 'text-orange-500 font-medium bg-orange-50' : 'text-stone-600 hover:bg-stone-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {displayList.length === 0 && (
        <div className="text-center py-16 text-stone-400"><p>此類別目前沒有開放中的課程</p></div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {displayList.map((course, courseIdx) => {
          const d = new Date(course.date + 'T00:00:00')
          const weekdays = ['日','一','二','三','四','五','六']
          const dateStr = `${d.getMonth()+1}/${d.getDate()}（${weekdays[d.getDay()]}）`
          const isSelected = selected.includes(course.id)
          const expired = isExpired(course)
          const alreadyRegistered = registeredIds.has(course.id)
          // 教學導覽 step1/2 時，只有示範課程可以點選，其餘卡片鎖住不能互動
          const tutorialLocked = (tutorialStep === '1' || tutorialStep === '2') && course.id !== DEMO_COURSE_ID
          const isDisabled = expired || alreadyRegistered || tutorialLocked
          const photos = getCoursePhotos(course)
          const lineUrl = course.line_group_url || getLineUrl(course.instructors?.line_id)

          return (
            <div key={course.id}
             ref={courseIdx === 0 ? firstCardRef : undefined}
             onClick={() => !isDisabled && toggle(course.id)}
              className={`relative rounded-2xl border transition-all overflow-hidden ${
                alreadyRegistered ? 'opacity-70 cursor-not-allowed border-green-200 bg-green-50/30'
                : expired ? 'opacity-60 cursor-not-allowed border-stone-200 bg-white'
                : tutorialLocked ? 'cursor-not-allowed border-stone-200 bg-white'
                : isSelected ? 'border-orange-400 shadow-lg shadow-orange-100 cursor-pointer bg-gradient-to-t from-orange-50/60 to-white'
                : 'border-stone-200 hover:shadow-md cursor-pointer bg-gradient-to-t from-orange-50/60 to-white'
              }`}
              style={!isSelected ? { boxShadow: '0px 4px 12px 0px rgba(0,0,0,0.1)' } : undefined}>

              <div className="flex flex-col gap-4 py-4">
                <div className="px-4">
                  <div className="flex h-[156px] md:h-[172px] border border-stone-200 rounded-xl overflow-hidden">
                    <div className="relative w-[156px] md:w-[172px] flex-shrink-0">
                      {photos.length > 0 ? (
                        <CoursePhotoCarousel photos={photos} alt={course.title} />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1c0a8" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        </div>
                      )}
                      {course.course_categories && (
                        <span className="absolute top-2 left-2 text-sm font-medium text-white px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: course.course_categories.color }}>
                          {course.course_categories.name}
                        </span>
                      )}
                      {alreadyRegistered && (
                        <>
                          <div className="absolute inset-0 bg-black/50" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-green-200 rounded-lg px-2.5 py-2 flex items-center justify-center">
                            <span className="text-white text-base font-bold whitespace-nowrap">已報名</span>
                          </div>
                        </>
                      )}
                      {!alreadyRegistered && expired && (
                        <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">報名截止</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 bg-white border-l border-stone-200 h-full flex flex-col justify-end gap-2 p-2 md:p-3">
                      <div className="flex-1 flex flex-col justify-center md:justify-end w-full">
                        <p className="font-bold text-xl md:text-[20px] md:leading-[28px] text-stone-800 leading-snug line-clamp-3 md:line-clamp-2 min-h-[3.6em] md:min-h-0">{course.title}</p>
                      </div>
                      {/* 電腦版：meta 移進圖片右側欄位，順序改為 時間→地點→年齡（比照 Figma List Row） */}
                      <div className="hidden md:flex md:flex-col md:gap-1.5">
                        <InfoRow icon={<IconClock />}>{dateStr} {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)}</InfoRow>
                        <InfoRow icon={<IconPin />}>{course.location}</InfoRow>
                        <InfoRow icon={<IconPerson />}>{course.suitable_age || '全年齡'}</InfoRow>
                      </div>
                      {(course.instructors_list && course.instructors_list.length > 0 ? course.instructors_list : (course.instructors ? [course.instructors] : [])).length > 0 && (
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="bg-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded flex-shrink-0">講師</span>
                          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                            {(course.instructors_list && course.instructors_list.length > 0 ? course.instructors_list : (course.instructors ? [course.instructors] : [])).map((inst, idx, arr) => (
                              <span key={inst.id} className="flex items-center gap-1 shrink-0">
                                <span className="text-sm font-medium text-stone-800 whitespace-nowrap">{inst.name}</span>
                                {idx < arr.length - 1 && <span className="text-sm font-medium text-stone-400">/</span>}
                              </span>
                            ))}
                          </div>
                          {lineUrl && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                if (isMobile()) {
                                  window.open(lineUrl, '_blank')
                                } else {
                                  setQrTarget(lineUrl)
                                }
                              }}
                              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: '#06C755' }}
                              title="加入 LINE 群組/好友"
                            >
                              <IconLINE />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 px-4 md:hidden">
                  <InfoRow icon={<IconPerson />}>{course.suitable_age || '全年齡'}</InfoRow>
                  <InfoRow icon={<IconClock />}>{dateStr} {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)}</InfoRow>
                  <InfoRow icon={<IconPin />}>{course.location}</InfoRow>
                </div>

              </div>

              {course.description && (
                <div className="bg-stone-100 md:bg-[#fafaf9] px-4 py-4">
                  <p
                    className="text-sm md:text-base text-stone-600 leading-relaxed"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {course.description}
                  </p>
                </div>
              )}

              {alreadyRegistered ? (
                <div className="absolute top-[19px] right-[19px] md:top-[25px] md:right-[23px] w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <IconCheck />
                </div>
              ) : !expired && (
                <div className={`absolute top-[19px] right-[19px] md:top-[25px] md:right-[23px] w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-stone-300 bg-stone-100'}`}>
                  {isSelected && <IconCheck />}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <button ref={ctaRef} onClick={handleProceed} disabled={proceeding}
            style={{ boxShadow: '0px -1px 2px rgba(0,0,0,0.16)' }}
            className="w-full flex items-center justify-between bg-stone-50 border border-stone-300 px-4 py-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">{selected.length}</div>
              <div className="text-left">
                <p className="text-base font-bold text-orange-600">前往報名</p>
                <p className="text-sm text-stone-600">已選 {selected.length} 堂課程</p>
              </div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      )}
    {/* QR Code 彈窗（電腦版用手機掃描加入 LINE） */}
      {qrTarget && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setQrTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#06C755' }}>
                <IconLINE />
              </div>
              <p className="font-bold text-stone-800 text-sm">用手機掃描加入</p>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTarget)}`}
              alt="LINE QR Code"
              className="w-48 h-48 rounded-xl"
            />
            <p className="text-xs text-stone-400 text-center">開啟手機 LINE → 掃一掃 → 掃描此 QR Code</p>
            <button
              onClick={() => setQrTarget(null)}
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* 首次登入教學：step1 選課程（只框課程卡片，不框上方篩選列，避免被 sticky 3步驟列擋住）/ step2 前往報名 */}
      {tutorialStep === '1' && (
        <>
          <TutorialMask holes={[firstCardHoleStep1]} />
          <TutorialTooltip hole={firstCardHoleStep1} number={1} text="點選您有興趣的活動課程" placement="above" />
          <TutorialSkipButton onSkip={skipTutorial} />
        </>
      )}
      {tutorialStep === '2' && (
        <>
          {/* CTA 按鈕只用動態脈動的框強調，不再額外放文字泡泡，避免跟按鈕本身文字重複、也不會被切到畫面外 */}
          <TutorialMask holes={[firstCardHoleStep2, ctaHole]} pulse={[false, true]} />
          <TutorialTooltip hole={firstCardHoleStep2} number={2} text="已選好課程後，點選前往報名" placement="above" />
          <TutorialSkipButton onSkip={skipTutorial} />
        </>
      )}
    </div>
  )
}
