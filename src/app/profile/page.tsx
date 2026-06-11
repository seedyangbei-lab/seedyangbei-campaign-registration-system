'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

function getParticipationTag(count: number) {
  if (count === 0) return { label: '尚未參與', color: '#9ca3af', bg: '#f3f4f6' }
  if (count === 1) return { label: '初次體驗', color: '#3b82f6', bg: '#eff6ff' }
  if (count <= 4) return { label: '偶爾參與', color: '#d97706', bg: '#fffbeb' }
  if (count <= 9) return { label: '常常參與', color: '#f97316', bg: '#fff7ed' }
  return { label: '積極參與', color: '#16a34a', bg: '#f0fdf4' }
}

function ProfileContent() {
  const router = useRouter()
  const [lineUser, setLineUser] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReg, setSelectedReg] = useState<any>(null)
  const [memberPoints, setMemberPoints] = useState<number | null>(null)
  const [rewardItems, setRewardItems] = useState<any[]>([])
  const [myRedemptions, setMyRedemptions] = useState<any[]>([])
  const [showRedeemModal, setShowRedeemModal] = useState(false)
  const [selectedReward, setSelectedReward] = useState<any>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemSuccess, setRedeemSuccess] = useState(false)
  const supabase = createClient()

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

    const { data: member } = await supabase
      .from('line_members')
      .select('id, points')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (member) {
      setMemberPoints(member.points ?? 0)
      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('*, reward_items(name, points_required)')
        .eq('line_member_id', member.id)
        .order('requested_at', { ascending: false })
      setMyRedemptions(redemptions || [])
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


  const handleLogout = () => {
    localStorage.removeItem('line_user')
    router.push('/')
  }

  if (!lineUser) return null

  const tag = getParticipationTag(registrations.length)

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-700 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回首頁
        </Link>
        <button onClick={handleLogout} className="text-sm text-stone-400 hover:text-red-500 transition-colors">登出</button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* 個人資料卡 */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            {lineUser.pictureUrl ? (
              <img src={lineUser.pictureUrl} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-2xl font-bold">{lineUser.displayName?.[0]}</span>
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-stone-800">{lineUser.displayName}</h1>
              <p className="text-stone-400 text-sm mt-0.5">LINE 會員</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ color: tag.color, backgroundColor: tag.bg }}>
              {tag.label}
            </span>
            <span className="text-stone-400 text-sm">共參與 {registrations.length} 堂課程</span>
          </div>
        </div>

        {/* 點數卡 */}
        {memberPoints !== null && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-stone-700">我的點數</h2>
                <p className="text-stone-400 text-xs mt-0.5">每次出席課程獲得 1 點</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-500">{memberPoints}</p>
                <p className="text-xs text-stone-400">累積點數</p>
              </div>
            </div>
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
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-700">我的報名記錄</h2>
            <p className="text-stone-400 text-xs mt-0.5">所有已報名的課程記錄</p>
          </div>

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
          ) : (
            <div className="divide-y divide-stone-100">
              {registrations.map((reg: any, i: number) => {
                const course = reg.courses
                const isPast = course?.date ? new Date(course.date + 'T' + (course.time_end || '23:59')) < new Date() : false
                return (
                  <button key={reg.id}
                    onClick={() => setSelectedReg(reg)}
                    className="w-full text-left px-6 py-4 hover:bg-stone-50 transition-colors active:bg-stone-100">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 text-orange-600 font-bold text-xs">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-800 truncate">{course?.title}</p>
                          <p className="text-stone-400 text-xs mt-0.5">
                            {course?.date} · {course?.time_start?.slice(0,5)}–{course?.time_end?.slice(0,5)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${isPast ? 'bg-stone-100 text-stone-500' : 'bg-green-100 text-green-700'}`}>
                          {isPast ? '已結束' : '即將開課'}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-300 flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {registrations.length > 0 && (
          <Link href="/"
            className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3.5 rounded-xl transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            繼續報名其他課程
          </Link>
        )}
      </div>

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
