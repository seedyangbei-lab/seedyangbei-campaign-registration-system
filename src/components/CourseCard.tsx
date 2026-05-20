'use client'

import { useState } from 'react'

interface Category { id: string; name: string; color: string }
interface Course {
  id: string; title: string; description: string; date: string
  time_start: string; time_end: string; location: string; max_seats: number
  poster_url?: string; notes?: string; suitable_age?: string
  line_group_url?: string
  instructors?: { id: string; name: string; phone?: string; line_id?: string } | null
  course_categories?: { id: string; name: string; color: string } | null
}

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'

function getLineLoginUrl(returnUrl: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID,
    redirect_uri: LINE_CALLBACK_URL,
    state: encodeURIComponent(returnUrl),
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
      <div className="w-5 h-5 rounded-full bg-[#fa7315] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-sm font-bold text-black leading-tight">{children}</span>
    </div>
  )
}

const IconPerson = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)
const IconClock = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconPin = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconNotice = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fa7315" strokeWidth="2" className="flex-shrink-0">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

const IconLINE = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="white" style={{ display: 'block' }}>
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
  </svg>
)

export default function CourseCard({ courses, categories, lineCommunityUrl }: {
  courses: Course[]
  categories: Category[]
  lineCommunityUrl?: string
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [qrTarget, setQrTarget] = useState<string | null>(null)

  const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const toggle = (id: string) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  )

  const filtered = (activeCategory === 'all' ? courses : courses.filter(c => c.course_categories?.id === activeCategory))
    .slice()
    .sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })

  const handleProceed = () => {
    const ids = selected.join(',')
    try {
      const stored = localStorage.getItem('line_user')
      if (stored) {
        const user = JSON.parse(stored)
        window.location.href = `/register?courses=${ids}&line_user=${encodeURIComponent(JSON.stringify(user))}`
        return
      }
    } catch {}
    const registerUrl = `${window.location.origin}/register?courses=${ids}`
    window.location.href = getLineLoginUrl(registerUrl)
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

  return (
    <div>
      {/* 類別篩選 + 排序 */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
            全部課程
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors border"
              style={activeCategory === cat.id
                ? { backgroundColor: cat.color, borderColor: cat.color, color: 'white' }
                : { borderColor: '#e7e5e4', backgroundColor: 'white', color: '#57534e' }}>
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer"
          >
            <option value="asc">即將開課優先</option>
            <option value="desc">較晚開課優先</option>
          </select>

          {lineCommunityUrl && (
            <a
              href={lineCommunityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80 flex-shrink-0"
              style={{ backgroundColor: '#06C755' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              <span className="hidden md:inline">加入央北社區大學社群</span>
              <span className="md:hidden">加入課程社群</span>
            </a>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-stone-400"><p>此類別目前沒有開放中的課程</p></div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(course => {
          const d = new Date(course.date + 'T00:00:00')
          const weekdays = ['日','一','二','三','四','五','六']
          const dateStr = `${d.getMonth()+1}/${d.getDate()}（${weekdays[d.getDay()]}）`
          const isSelected = selected.includes(course.id)
          const expired = isExpired(course)
          const lineUrl = course.line_group_url || getLineUrl(course.instructors?.line_id)
      
          return (
            <div key={course.id}
              onClick={() => !expired && toggle(course.id)}
              className={`relative bg-white rounded-2xl border-2 transition-all overflow-hidden flex flex-col ${
                expired ? 'opacity-60 cursor-not-allowed border-[#dbdbdb]'
                : isSelected ? 'border-orange-400 shadow-lg shadow-orange-100 cursor-pointer'
                : 'border-[#dbdbdb] hover:border-stone-300 hover:shadow-md cursor-pointer'
              }`}>

              <div className="flex p-2 gap-2">
                <div className="w-[141px] flex-shrink-0 relative self-stretch rounded-[10px] overflow-hidden">
                  {course.poster_url ? (
                    <img src={course.poster_url} alt={course.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-stone-100 flex items-center justify-center min-h-[199px]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d1c0a8" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                  )}
                  {expired && (
                    <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">報名截止</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-2 py-2 min-w-0" style={{ minHeight: '199px' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-base text-black leading-snug">{course.title}</p>
                    {!expired && (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-stone-300 bg-white'}`}>
                        {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    )}
                  </div>

                  {course.instructors && (
                    <div className="flex items-center gap-1.5">
                      <div className="bg-[#fff7ed] px-1.5 rounded-sm flex-shrink-0 flex items-center self-stretch">
                        <span className="text-[#ee7235] text-xs font-bold leading-none">講師</span>
                      </div>
                      <span className="text-sm font-bold text-black leading-none">{course.instructors.name}</span>
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
                          title={course.course_line_group_url ? '加入課程 LINE 群組' : '加講師 LINE 好友'}
                        >
                          <IconLINE />
                        </button>
                      )}
                    </div>
                  )}

                  <InfoRow icon={<IconPerson />}>{course.suitable_age || '全年齡'}</InfoRow>
                  <InfoRow icon={<IconClock />}>{dateStr} {course.time_start?.slice(0,5)}–{course.time_end?.slice(0,5)}</InfoRow>
                  <InfoRow icon={<IconPin />}>{course.location}</InfoRow>

                  <div className="mt-auto">
                    <div className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 border ${course.notes ? 'border-[#fa7315]' : 'border-transparent'}`}>
                      {course.notes ? (
                        <>
                          <IconNotice />
                          <p className="text-xs font-bold text-[#252525] line-clamp-2 flex-1">{course.notes}</p>
                        </>
                      ) : (
                        <div className="h-8" aria-hidden />
                      )}
                    </div>
                  </div>
                </div>
              </div>

            <div
                className="relative border-t border-dashed border-[#dbdbdb] px-4 py-4 flex-1 flex items-center justify-center min-h-[80px]"
                style={{ background: 'linear-gradient(to bottom, white 0%, white 26%, #ffefe4 100%)' }}
              >
                {course.description ? (
                  <>
                    <span className="absolute top-2 left-2 text-orange-300 text-lg leading-none font-serif select-none">"</span>
                    <span className="absolute top-2 right-2 text-orange-300 text-lg leading-none font-serif select-none rotate-180 inline-block">"</span>
                    <p
                      className="text-xs text-[#524e4e] text-center leading-[1.6] px-3"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {course.description}
                    </p>
                  </>
                ) : null}
              </div>

              {course.course_categories && (
                <div className="absolute top-3 left-3">
                  <span className="text-xs font-bold px-2 py-1 rounded-lg text-white shadow-sm"
                    style={{ backgroundColor: course.course_categories.color }}>
                    {course.course_categories.name}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <button onClick={handleProceed}
            className="w-full flex items-center justify-between bg-stone-900 hover:bg-stone-800 text-white px-5 py-4 rounded-2xl shadow-2xl transition-all active:scale-95">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">{selected.length}</div>
              <div className="text-left">
                <p className="text-sm font-semibold">前往報名</p>
                <p className="text-xs text-stone-400">已選 {selected.length} 堂課程</p>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
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
    </div>
  )
}
