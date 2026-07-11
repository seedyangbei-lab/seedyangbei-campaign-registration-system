'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import StampCard from '@/components/StampCard'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

function getParticipationTag(count: number) {
  if (count === 0) return { label: '尚未參與', color: '#9ca3af', bg: '#f3f4f6' }
  if (count === 1) return { label: '初次體驗', color: '#3b82f6', bg: '#eff6ff' }
  if (count <= 4) return { label: '偶爾參與', color: '#d97706', bg: '#fffbeb' }
  if (count <= 9) return { label: '常常參與', color: '#f97316', bg: '#fff7ed' }
  return { label: '積極參與', color: '#16a34a', bg: '#f0fdf4' }
}

// 報名記錄 list row 用的三個小 icon：時間／地點／講師，統一 stone-400、跟文字對齊用 flex-shrink-0
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-stone-400" aria-hidden="true">
    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
  </svg>
)
const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-stone-400" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
)
const IconPerson = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-stone-400" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
)

function ProfileContent() {
  const router = useRouter()
  const [lineUser, setLineUser] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReg, setSelectedReg] = useState<any>(null)
  const [cancelTarget, setCancelTarget] = useState<any>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelSuccess, setCancelSuccess] = useState(false)
  const [regTab, setRegTab] = useState<'upcoming' | 'past'>('upcoming')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [memberPoints, setMemberPoints] = useState<number | null>(null)
  const [rewardItems, setRewardItems] = useState<any[]>([])
  const [myRedemptions, setMyRedemptions] = useState<any[]>([])
  const [pointLogs, setPointLogs] = useState<any[]>([])
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [selectedReward, setSelectedReward] = useState<any>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  const [pointsEnabled, setPointsEnabled] = useState(true)
  const supabase = createClient()

  // 任一彈窗開著時鎖住背景頁面捲動（取消報名確認／課程詳情／兌換確認）。
  // 這行要放在 return null 的 early return 之前，維持 hooks 呼叫順序穩定。
  useBodyScrollLock(!!cancelTarget || !!selectedReg || showRedeemModal)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('line_user')
      if (!stored) { router.push('/'); return }
      const user = JSON.parse(stored)
      setLineUser(user)
      fetchHistory(user.lineUserId)
    } catch {
      router.push('/')
    }
    supabase.from('site_settings').select('value').eq('key', 'points_enabled').maybeSingle()
      .then(({ data }) => { if (data && data.value === 'false') setPointsEnabled(false) })
  }, [])

  const fetchHistory = async (lineUserId: string) => {
    setLoading(true)
    const { data: user } = await supabase
      .from('users')
      .select('id, name, room_number, email, age_group')
      .eq('line_id', lineUserId)
      .maybeSingle()

    if (user) {
      const { data: regs } = await supabase
        .from('registrations')
        .select('*, courses(title, date, time_start, time_end, location, instructors(name))')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .order('registered_at', { ascending: false })
      setRegistrations(regs || [])
    }

    const memberRes = await fetch(`/api/member-points?line_user_id=${encodeURIComponent(lineUserId)}`)
    const member = memberRes.ok ? await memberRes.json() : null

    console.log('[profile] lineUserId:', lineUserId, 'member:', member, 'points:', member?.points)
    if (member) {
      setMemberPoints(member.points ?? 0)
      console.log('[profile] setMemberPoints:', member.points ?? 0)
      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('*, reward_items(name, points_required)')
        .eq('line_member_id', member.id)
        .order('requested_at', { ascending: false })
      setMyRedemptions(redemptions || [])

     const { data: logs } = await supabase
        .from('point_logs')
        .select('id, delta, reason, created_at')
        .eq('line_member_id', member.id)
        .gt('delta', 0)
        .order('created_at', { ascending: false })
      setPointLogs(logs || [])
    }

    const { data: rewards } = await supabase
      .from('reward_items')
      .select('*')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('points_required')
    setRewardItems(rewards || [])

    setLoading(false)
  }

  const handleRedeem = async (reward: any) => {
    if (!lineUser) return
    setRedeeming(true)
    const { data: member } = await supabase
      .from('line_members')
      .select('id, points')
      .eq('line_user_id', lineUser.lineUserId)
      .maybeSingle()
    if (!member || member.points < reward.points_required) {
      alert('點數不足，無法兌換')
      setRedeeming(false)
      return
    }
    await supabase.from('redemptions').insert({
      line_member_id: member.id,
      reward_item_id: reward.id,
      status: 'pending',
    })
    setRedeemSuccess(true)
    setShowRedeemModal(false)
    await fetchHistory(lineUser.lineUserId)
    setRedeeming(false)
    setTimeout(() => setRedeemSuccess(false), 3000)
  }


  const handleCancel = async () => {
    if (!cancelTarget || !lineUser) return
    setCancelling(true)
    const res = await fetch('/api/cancel-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationId: cancelTarget.id, lineUserId: lineUser.lineUserId }),
    })
    setCancelling(false)
    if (res.ok) {
      setCancelTarget(null)
      setCancelSuccess(true)
      setTimeout(() => setCancelSuccess(false), 3000)
      fetchHistory(lineUser.lineUserId)
    } else {
      const err = await res.json()
      if (err.error === 'course_started') alert('課程已開始，無法取消報名')
      else alert('取消失敗，請稍後再試')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('line_user')
    router.push('/')
  }

  if (!lineUser) return null

  const tag = getParticipationTag(registrations.length)

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header：手機版右側多一個大頭貼＋名字，電腦版只有返回／登出 */}
      <div className="bg-white border-b border-stone-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-1.5 text-stone-500 hover:text-stone-700 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 md:hidden">
            {lineUser.pictureUrl ? (
              <img src={lineUser.pictureUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">{lineUser.displayName?.[0]}</span>
              </div>
            )}
            <span className="text-sm font-medium text-stone-700 max-w-[100px] truncate">{lineUser.displayName}</span>
          </div>
          <button onClick={handleLogout} className="text-sm text-stone-400 hover:text-red-500 transition-colors">登出</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 pb-28 md:pb-8">

        {/* 個人資料卡：手機版橫式排版＋左右漸層，電腦版直式置中＋上下漸層 */}
        <div className="rounded-2xl overflow-hidden shadow-sm border" style={{ borderColor: '#f2d8c4' }}>
          {/* 手機版 */}
          <div className="md:hidden flex items-center gap-4 p-[17px] bg-gradient-to-r from-white via-orange-50 to-orange-100">
            {lineUser.pictureUrl ? (
              <img src={lineUser.pictureUrl} alt="" className="w-[50px] h-[50px] rounded-full flex-shrink-0" />
            ) : (
              <div className="w-[50px] h-[50px] rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 text-xl font-bold">{lineUser.displayName?.[0]}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-stone-800 truncate">{lineUser.displayName}</h1>
                <span className="text-sm font-medium px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{ color: tag.color, backgroundColor: tag.bg }}>
                  {tag.label}
                </span>
              </div>
              <p className="text-stone-400 text-sm">共參與 {registrations.length} 堂課程</p>
            </div>
          </div>
          {/* 電腦版 */}
          <div className="hidden md:flex flex-col items-center gap-2 px-8 py-4 bg-gradient-to-b from-orange-100 via-orange-50 to-white">
            {lineUser.pictureUrl ? (
              <img src={lineUser.pictureUrl} alt="" className="w-[100px] h-[100px] rounded-full" />
            ) : (
              <div className="w-[100px] h-[100px] rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-4xl font-bold">{lineUser.displayName?.[0]}</span>
              </div>
            )}
            <div className="border-t border-stone-100 w-full pt-2 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-800">{lineUser.displayName}</h1>
                <span className="text-sm font-medium px-2 py-0.5 rounded-md"
                  style={{ color: tag.color, backgroundColor: tag.bg }}>
                  {tag.label}
                </span>
              </div>
              <p className="text-stone-400 text-sm">共參與 {registrations.length} 堂課程</p>
            </div>
          </div>
        </div>

         {/* 點數卡 */}
        {pointsEnabled && memberPoints !== null && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <StampCard logs={pointLogs} totalPoints={memberPoints} />
            <div className="mt-4">
            {redeemSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                兌換申請已送出，等待管理員審核
              </div>
            )}
            {rewardItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">可兌換獎勵</p>
                <div className="space-y-2">
                  {rewardItems.map(reward => {
                    const canRedeem = memberPoints >= reward.points_required
                    const alreadyPending = myRedemptions.some(r => r.reward_items?.name === reward.name && r.status === 'pending')
                    return (
                      <div key={reward.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
                        <div>
                          <p className="text-stone-700 text-sm font-medium">{reward.name}</p>
                          {reward.description && <p className="text-stone-400 text-xs mt-0.5">{reward.description}</p>}
                          <span className="text-xs text-orange-600 font-bold">{reward.points_required} 點</span>
                        </div>
                        {alreadyPending ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg font-medium">審核中</span>
                        ) : (
                          <button
                            onClick={() => { setSelectedReward(reward); setShowRedeemModal(true) }}
                            disabled={!canRedeem}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${canRedeem ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-stone-100 text-stone-400 cursor-not-allowed'}`}>
                            {canRedeem ? '兌換' : '點數不足'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            </div>
            {myRedemptions.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">兌換記錄</p>
                <div className="space-y-2">
                  {myRedemptions.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">{r.reward_items?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.status === 'approved' ? 'bg-green-100 text-green-700'
                        : r.status === 'rejected' ? 'bg-stone-100 text-stone-500'
                        : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status === 'approved' ? '已核發' : r.status === 'rejected' ? '已拒絕' : '審核中'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 報名記錄 */}
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 pt-4 pb-4 border-b border-stone-200 flex items-center justify-center">
            <h2 className="text-xl font-bold text-stone-600">我的報名記錄</h2>
          </div>

          {cancelSuccess && (
            <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              已成功取消報名
            </div>
          )}

          {loading ? (
            <div className="px-6 py-12 text-center text-stone-400 text-sm">載入中...</div>
          ) : registrations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-stone-300">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <p className="text-stone-400 text-sm">尚無報名記錄</p>
              <Link href="/" className="inline-block mt-3 text-orange-500 text-sm hover:underline">去看看課程</Link>
            </div>
          ) : (() => {
            const now = new Date()
            const upcoming = registrations.filter((r: any) =>
              new Date(r.courses?.date + 'T' + (r.courses?.time_end || '23:59')) >= now
            ).sort((a: any, b: any) => new Date(a.courses?.date).getTime() - new Date(b.courses?.date).getTime())

            const past = registrations.filter((r: any) =>
              new Date(r.courses?.date + 'T' + (r.courses?.time_end || '23:59')) < now
            ).sort((a: any, b: any) => new Date(b.courses?.date).getTime() - new Date(a.courses?.date).getTime())

            // 建立 Dropdown 選項：當年細分月份，去年以前歸年份
            const currentYear = now.getFullYear()
            const periodMap = new Map<string, { label: string; year: number; month?: number }>()
            past.forEach((r: any) => {
              const d = new Date(r.courses?.date)
              const y = d.getFullYear()
              const m = d.getMonth() + 1
              if (y === currentYear) {
                const key = `${y}-${String(m).padStart(2,'0')}`
                if (!periodMap.has(key)) periodMap.set(key, { label: `${m} 月`, year: y, month: m })
              } else {
                const key = `${y}`
                if (!periodMap.has(key)) periodMap.set(key, { label: `${y} 年`, year: y })
              }
            })
            const periodOptions = Array.from(periodMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))

            const filteredPast = filterPeriod === 'all' ? past : past.filter((r: any) => {
              const d = new Date(r.courses?.date)
              const y = d.getFullYear()
              const m = d.getMonth() + 1
              if (filterPeriod.includes('-')) {
                return `${y}-${String(m).padStart(2,'0')}` === filterPeriod
              }
              return String(y) === filterPeriod
            })

            const displayList = regTab === 'upcoming' ? upcoming : filteredPast

            return (
              <>
                {/* Tab */}
                <div className="flex gap-1 p-1 mx-6 mt-4 bg-stone-100 rounded-xl w-fit">
                  {([['upcoming', '即將開課', upcoming.length], ['past', '已結束', past.length]] as const).map(([t, label, count]) => (
                    <button key={t} onClick={() => setRegTab(t)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${regTab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                      {label}
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${regTab === t ? 'bg-orange-100 text-orange-600' : 'bg-stone-200 text-stone-500'}`}>
                        {count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* 已結束：月份/年份篩選 */}
                {regTab === 'past' && periodOptions.length > 0 && (
                  <div className="px-6 mt-3">
                    <select
                      value={filterPeriod}
                      onChange={e => setFilterPeriod(e.target.value)}
                      className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 w-full"
                    >
                      <option value="all">全部紀錄</option>
                      {(() => {
                        const thisYearOptions = periodOptions.filter(([, v]) => v.month !== undefined)
                        const otherYearOptions = periodOptions.filter(([, v]) => v.month === undefined)
                        return (
                          <>
                            {thisYearOptions.length > 0 && (
                              <optgroup label={`${currentYear} 年`}>
                                {thisYearOptions.map(([key, v]) => (
                                  <option key={key} value={key}>{v.label}</option>
                                ))}
                              </optgroup>
                            )}
                            {otherYearOptions.length > 0 && (
                              <optgroup label="過去年份">
                                {otherYearOptions.map(([key, v]) => (
                                  <option key={key} value={key}>{v.label}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        )
                      })()}
                    </select>
                  </div>
                )}

                {/* 列表：固定高度＋內部捲動，避免清單一長頁面就一直往下延伸 */}
                <div className="mt-3 max-h-[420px] md:max-h-[400px] overflow-y-auto px-6 pb-6">
                  {displayList.length === 0 ? (
                    <div className="py-10 text-center text-stone-400 text-sm">
                      {regTab === 'upcoming' ? '目前沒有即將開課的報名' : '此期間無紀錄'}
                    </div>
                  ) : (
                    <>
                      {/* 手機版：每筆是獨立的邊框卡片，堆疊顯示（含講師） */}
                      <div className="flex flex-col gap-3 md:hidden">
                        {displayList.map((reg: any, i: number) => {
                          const course = reg.courses
                          const isPast = regTab === 'past'
                          const d = course?.date ? new Date(course.date + 'T00:00:00') : null
                          const weekdays = ['日','一','二','三','四','五','六']
                          const dateStr = d ? `${d.getMonth()+1}/${d.getDate()}（${weekdays[d.getDay()]}）` : ''
                          return (
                            <div key={reg.id} className="border border-stone-200 rounded-lg px-4 py-3 flex flex-col gap-2">
                              <button onClick={() => setSelectedReg(reg)} className="flex items-center gap-2 text-left w-full">
                                <span className="w-[26px] h-[26px] rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold text-sm">
                                  {i + 1}
                                </span>
                                <span className="font-bold text-stone-800 truncate flex-1 min-w-0">{course?.title}</span>
                                {isPast && (
                                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-stone-100 text-stone-400 flex-shrink-0">已結束</span>
                                )}
                              </button>
                              <div className="flex items-center gap-1 text-sm text-stone-500">
                                <IconClock /> {dateStr} · {course?.time_start?.slice(0,5)}–{course?.time_end?.slice(0,5)}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-stone-500">
                                <IconPin /> {course?.location}
                              </div>
                              {course?.instructors?.name && (
                                <div className="flex items-center gap-1 text-sm text-stone-500">
                                  <IconPerson /> {course.instructors.name}
                                </div>
                              )}
                              {!isPast && (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setCancelTarget(reg)}
                                    className="text-xs font-medium px-3 py-1.5 rounded-md border border-red-600 text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    取消報名
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* 電腦版：單行 list，divider 分隔 */}
                      <div className="hidden md:flex md:flex-col divide-y divide-stone-100">
                        {displayList.map((reg: any, i: number) => {
                          const course = reg.courses
                          const isPast = regTab === 'past'
                          const d = course?.date ? new Date(course.date + 'T00:00:00') : null
                          const weekdays = ['日','一','二','三','四','五','六']
                          const dateStr = d ? `${d.getMonth()+1}/${d.getDate()}（${weekdays[d.getDay()]}）` : ''
                          return (
                            <div key={reg.id} className="flex items-center gap-4 py-4">
                              <button onClick={() => setSelectedReg(reg)} className="flex items-center gap-4 min-w-0 flex-1 text-left">
                                <span className="w-[26px] h-[26px] rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 font-bold text-sm">
                                  {i + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-base text-stone-800 truncate">{course?.title}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1 text-sm text-stone-600">
                                      <IconClock /> {dateStr} {course?.time_start?.slice(0,5)}–{course?.time_end?.slice(0,5)}
                                    </span>
                                    <span className="flex items-center gap-1 text-sm text-stone-600">
                                      <IconPin /> {course?.location}
                                    </span>
                                  </div>
                                </div>
                              </button>
                              {isPast ? (
                                <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-stone-100 text-stone-400 flex-shrink-0">已結束</span>
                              ) : (
                                <button
                                  onClick={() => setCancelTarget(reg)}
                                  className="text-xs font-medium px-3 py-1.5 rounded-md border border-red-600 text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                                >
                                  取消報名
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )
          })()}
        </div>

        {registrations.length > 0 && (
          <>
            {/* 電腦版：跟頁面內容一起排列 */}
            <Link href="/"
              className="hidden md:flex items-center justify-center gap-2 w-full h-[50px] bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors">
              繼續報名其他課程
            </Link>
            {/* 手機版：sticky 在畫面底部的 modal 按鈕 */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white p-4" style={{ boxShadow: '0px -3px 4px 0px rgba(0,0,0,0.08)' }}>
              <Link href="/"
                className="flex items-center justify-center gap-2 w-full h-[50px] bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-[10px] transition-colors">
                繼續報名其他課程
              </Link>
            </div>
          </>
        )}
      </div>

       {/* 取消報名確認彈窗 */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) setCancelTarget(null) }}>
          <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-3xl shadow-2xl p-6">
            <div className="flex justify-center mb-4 md:hidden">
              <div className="w-10 h-1 bg-stone-200 rounded-full" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-800">確認取消報名？</h3>
                <p className="text-stone-400 text-xs mt-0.5">取消後無法自行復原</p>
              </div>
            </div>
            <div className="bg-stone-50 rounded-xl px-4 py-3 mb-5">
              <p className="text-stone-700 font-semibold text-sm">{cancelTarget.courses?.title}</p>
              <p className="text-stone-400 text-xs mt-1">
                {cancelTarget.courses?.date} · {cancelTarget.courses?.time_start?.slice(0,5)}–{cancelTarget.courses?.time_end?.slice(0,5)}
              </p>
              <p className="text-stone-400 text-xs">{cancelTarget.courses?.location}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-stone-300 text-white font-medium py-3.5 rounded-xl text-sm transition-colors">
                {cancelling ? '取消中...' : '確認取消報名'}
              </button>
              <button onClick={() => setCancelTarget(null)}
                className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3.5 rounded-xl text-sm transition-colors">
                保留
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 課程詳情彈窗 */}
      {selectedReg && (() => {
        const course = selectedReg.courses
        const isPast = course?.date ? new Date(course.date + 'T' + (course.time_end || '23:59')) < new Date() : false
        const d = course?.date ? new Date(course.date + 'T00:00:00') : null
        const weekdays = ['日','一','二','三','四','五','六']
        const dateStr = d ? `${d.getMonth()+1}/${d.getDate()}（${weekdays[d.getDay()]}）` : ''

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelectedReg(null) }}>
            <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden">
              {/* 拖拉把手（手機） */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 bg-stone-200 rounded-full" />
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <h3 className="font-bold text-stone-800 text-base">課程詳情</h3>
                <button onClick={() => setSelectedReg(null)} className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-lg font-bold text-stone-800 leading-snug">{course?.title}</h4>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 mt-0.5 ${isPast ? 'bg-stone-100 text-stone-500' : 'bg-green-100 text-green-700'}`}>
                    {isPast ? '已結束' : '即將開課'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">日期與時間</p>
                      <p className="text-sm font-semibold text-stone-800">{dateStr} {course?.time_start?.slice(0,5)}–{course?.time_end?.slice(0,5)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">地點</p>
                      <p className="text-sm font-semibold text-stone-800">{course?.location}</p>
                    </div>
                  </div>

                  {course?.instructors?.name && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div>
                        <p className="text-xs text-stone-400">講師</p>
                        <p className="text-sm font-semibold text-stone-800">{course.instructors.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <button onClick={() => setSelectedReg(null)}
                  className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-3.5 rounded-xl text-sm transition-colors">
                  關閉
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    {/* 兌換確認彈窗 */}
      {showRedeemModal && selectedReward && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowRedeemModal(false) }}>
          <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-3xl shadow-2xl p-6">
            <div className="flex justify-center mb-1 md:hidden">
              <div className="w-10 h-1 bg-stone-200 rounded-full mb-4" />
            </div>
            <h3 className="font-bold text-stone-800 text-lg mb-1">確認兌換</h3>
            <p className="text-stone-400 text-sm mb-6">送出後將等待管理員審核，審核通過後扣除點數。</p>
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-4 mb-6">
              <p className="text-stone-700 font-semibold">{selectedReward.name}</p>
              {selectedReward.description && <p className="text-stone-400 text-sm mt-0.5">{selectedReward.description}</p>}
              <p className="text-orange-500 font-bold mt-2">{selectedReward.points_required} 點</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleRedeem(selectedReward)} disabled={redeeming}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3.5 rounded-xl text-sm transition-colors">
                {redeeming ? '送出中...' : '確認送出申請'}
              </button>
              <button onClick={() => setShowRedeemModal(false)}
                className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3.5 rounded-xl text-sm transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" /></div>}>
      <ProfileContent />
    </Suspense>
  )
}
