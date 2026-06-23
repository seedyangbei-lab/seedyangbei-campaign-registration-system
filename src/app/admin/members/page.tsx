'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function getTag(count: number) {
  if (count === 0) return { label: '尚未參與', color: '#9ca3af', bg: '#f3f4f6' }
  if (count === 1) return { label: '初次體驗', color: '#3b82f6', bg: '#eff6ff' }
  if (count <= 4) return { label: '偶爾參與', color: '#d97706', bg: '#fffbeb' }
  if (count <= 9) return { label: '常常參與', color: '#f97316', bg: '#fff7ed' }
  return { label: '積極參與', color: '#16a34a', bg: '#f0fdf4' }
}

const BUILDINGS = ['A棟','B棟','C棟','D棟']

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [editMember, setEditMember] = useState<any>(null)
  const [editForm, setEditForm] = useState({ building: '', unit_number: '', floor_number: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [historyMember, setHistoryMember] = useState<any>(null)
  const [historyRegs, setHistoryRegs] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [chartTab, setChartTab] = useState<'overall' | 'personal'>('overall')
  const [chartData, setChartData] = useState<any[]>([])
  const [selectedMemberForChart, setSelectedMemberForChart] = useState<any>(null)
  const [personalChartData, setPersonalChartData] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [monthBarData, setMonthBarData] = useState<any[]>([])
  const [addPointModal, setAddPointModal] = useState<any>(null)
  const [addPointForm, setAddPointForm] = useState({ delta: 1, reason: '' })
  const [addPointSaving, setAddPointSaving] = useState(false)
  const supabase = createClient()

   const fetchMembers = async () => {
    const res = await fetch('/api/admin/members')
    const data = await res.json()
    if (!Array.isArray(data)) { setMembers([]); return }
    setMembers(data)

    // 批次撈所有 confirmed 報名，一次 query 取代 N 次
    const { data: allRegs } = await supabase
      .from('registrations')
      .select('user_id, users!inner(line_id)')
      .eq('status', 'confirmed')

    const counts: Record<string, number> = {}
    if (allRegs) {
      const lineIdToCount: Record<string, number> = {}
      allRegs.forEach((r: any) => {
        const lid = r.users?.line_id
        if (lid) lineIdToCount[lid] = (lineIdToCount[lid] || 0) + 1
      })
      data.forEach((m: any) => {
        counts[m.id] = lineIdToCount[m.line_user_id] || 0
      })
    }
    setRegCounts(counts)
  }

  useEffect(() => { fetchMembers(); fetchOverallChart() }, [])

  const fetchOverallChart = async () => {
    const { data: regs } = await supabase
      .from('registrations')
      .select('course_id, courses!inner(date)')
      .eq('status', 'confirmed')
    if (!regs) return
    const monthMap: Record<string, number> = {}
    regs.forEach((r: any) => {
      const date = (r.courses as any)?.date
      const m = date?.slice(0, 7)
      if (m) monthMap[m] = (monthMap[m] || 0) + 1
    })
    const sorted = Object.keys(monthMap).sort()
    setChartData(sorted.map(m => {
      const [, mo] = m.split('-')
      return { month: `${parseInt(mo)}月`, count: monthMap[m], key: m }
    }))
  }

  const fetchMonthBar = async (monthKey: string) => {
    if (!monthKey) return
    const startDate = `${monthKey}-01`
    const [y, m] = monthKey.split('-')
    const nextMonth = parseInt(m) + 1
    const endDate = nextMonth > 12
      ? `${parseInt(y) + 1}-01-01`
      : `${y}-${String(nextMonth).padStart(2, '0')}-01`

    // 先撈出該月份的課程 id 清單
    const { data: monthlyCourses } = await supabase
      .from('courses')
      .select('id, title')
      .gte('date', startDate)
      .lt('date', endDate)

    if (!monthlyCourses || monthlyCourses.length === 0) { setMonthBarData([]); return }

    const courseIds = monthlyCourses.map((c: any) => c.id)

    // 再撈這些課程的 confirmed 報名數
    const { data: regs } = await supabase
      .from('registrations')
      .select('course_id')
      .eq('status', 'confirmed')
      .in('course_id', courseIds)

    if (!regs) { setMonthBarData([]); return }

    const countMap: Record<string, { title: string; count: number }> = {}
    monthlyCourses.forEach((c: any) => {
      countMap[c.id] = { title: c.title, count: 0 }
    })
    regs.forEach((r: any) => {
      if (countMap[r.course_id]) countMap[r.course_id].count++
    })
    setMonthBarData(
      Object.values(countMap)
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count)
    )
  }
  const fetchPersonalChart = async (member: any) => {
    setSelectedMemberForChart(member)
    const { data: user } = await supabase.from('users').select('id').eq('line_id', member.line_user_id).maybeSingle()
    if (!user) { setPersonalChartData([]); return }
    const { data: regs } = await supabase
      .from('registrations')
      .select('registered_at')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
    if (!regs) { setPersonalChartData([]); return }
    const monthMap: Record<string, number> = {}
    regs.forEach((r: any) => {
      const m = r.registered_at?.slice(0, 7)
      if (m) monthMap[m] = (monthMap[m] || 0) + 1
    })
    const sorted = Object.keys(monthMap).sort()
    setPersonalChartData(sorted.map(m => {
      const [, mo] = m.split('-')
      return { month: `${parseInt(mo)}月`, count: monthMap[m] }
    }))
  }

  const openHistory = async (member: any) => {
    setHistoryMember(member)
    setHistoryLoading(true)
    setHistoryRegs([])
    const { data: user } = await supabase.from('users').select('id').eq('line_id', member.line_user_id).maybeSingle()
    if (user) {
      const { data: regs } = await supabase.from('registrations')
        .select('*, courses(title, date, time_start, time_end, location)')
        .eq('user_id', user.id).eq('status', 'confirmed')
        .order('registered_at', { ascending: false })
      setHistoryRegs(regs || [])
    }
    setHistoryLoading(false)
  }

 const openEdit = async (member: any) => {
    setEditMember(member)
    // 先用 line_members 資料帶入
    let building = member.building || ''
    let unit_number = member.unit_number || ''
    let floor_number = member.floor_number || ''
    // 若 line_members 沒有，嘗試從 users 表解析 room_number
    if (!building && member.line_user_id) {
      const { data: user } = await supabase.from('users').select('room_number').eq('line_id', member.line_user_id).maybeSingle()
      if (user?.room_number) {
        const match = user.room_number.match(/^([A-Z]棟)\s+(\d+)-(\d+)F-(\d+)$/)
        if (match) {
          building = match[1]
          unit_number = match[2]
          floor_number = match[3]
        }
      }
    }
    setEditForm({ building, unit_number, floor_number, notes: member.notes || '' })
  }
  const handleSave = async () => {
    setSaving(true)
    await supabase.from('line_members').update({
      building: editForm.building || null, unit_number: editForm.unit_number || null,
      floor_number: editForm.floor_number || null, notes: editForm.notes || null,
    }).eq('id', editMember.id)
    setEditMember(null)
    await fetchMembers()
    setSaving(false)
  }

   const handleAddPoint = async () => {
    if (!addPointForm.reason.trim()) { alert('請填寫原因'); return }
    setAddPointSaving(true)
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registrationId: null,
        courseTitle: '',
        lineUserId: addPointModal.line_user_id,
        action: addPointForm.delta > 0 ? 'manual_add' : 'manual_deduct',
        delta: addPointForm.delta,
        reason: addPointForm.reason,
      }),
    })
    setAddPointModal(null)
    setAddPointForm({ delta: 1, reason: '' })
    await fetchMembers()
    setAddPointSaving(false)
  }

  const tagLegend = [
    { label: '尚未參與', desc: '0 次', color: '#9ca3af' },
    { label: '初次體驗', desc: '1 次', color: '#3b82f6' },
    { label: '偶爾參與', desc: '2–4 次', color: '#d97706' },
    { label: '常常參與', desc: '5–9 次', color: '#f97316' },
    { label: '積極參與', desc: '10 次以上', color: '#16a34a' },
  ]

  // 自訂折線圖 Tooltip
  const OverallTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'white', border: '1px solid #e7e5e4', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
        <p style={{ color: '#78716c', marginBottom: 4 }}>{payload[0]?.payload?.month}</p>
        <p style={{ color: '#f97316', fontWeight: 600 }}>報名次數：{payload[0]?.value} 次</p>
        <p style={{ color: '#a8a29e', fontSize: 11, marginTop: 6 }}>點擊查看當月課程細項 →</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-4">
        <h2 className="text-stone-800 text-2xl font-bold">LINE 會員</h2>
        <p className="text-stone-400 mt-1 text-sm">透過 LINE 登入的會員資料，共 {members.length} 位</p>
      </div>

      {/* 走勢圖區塊（預設展開，無收合） */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-stone-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="font-semibold text-stone-700 text-sm">參與走勢圖</span>
        </div>

        <div>
          {/* Tab */}
          <div className="flex gap-1 p-1 mx-6 mt-4 bg-stone-100 rounded-xl w-fit">
            {([['overall', '全體走勢'], ['personal', '個人查詢']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setChartTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${chartTab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* 全體走勢 */}
          {chartTab === 'overall' && (
            <div className="px-6 py-4 space-y-6">
              <div>
                <p className="text-xs text-stone-400 mb-4">每月課程報名總次數（點擊圓點查看當月課程細項）</p>
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">尚無資料</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                      onClick={(e) => {
                        if (e?.activePayload?.[0]) {
                          const key = e.activePayload[0].payload.key
                          setSelectedMonth(key)
                          fetchMonthBar(key)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
                      <Tooltip content={<OverallTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ fill: '#f97316', r: 5, cursor: 'pointer' }}
                        activeDot={{ r: 7, stroke: '#f97316', strokeWidth: 2, fill: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* 月份細項柱狀圖（直式） */}
              {selectedMonth && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-stone-700">
                      {parseInt(selectedMonth.split('-')[1])}月 各課程報名人數
                    </p>
                    <button
                      onClick={() => { setSelectedMonth(''); setMonthBarData([]) }}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      關閉
                    </button>
                  </div>
                  {monthBarData.length === 0 ? (
                    <div className="text-center py-6 text-stone-400 text-sm">此月無報名資料</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={monthBarData}
                        margin={{ top: 10, right: 10, left: -10, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                        <XAxis
                          dataKey="title"
                          tick={{ fontSize: 11, fill: '#57534e' }}
                          angle={-45}
                          textAnchor="end"
                          interval={0}
                          dy={4}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }}
                          formatter={(v: any) => [`${v} 人`, '報名人數']}
                        />
                        <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 個人查詢 */}
          {chartTab === 'personal' && (
            <div className="px-6 py-4">
              <p className="text-xs text-stone-400 mb-3">選擇會員查看個人每月參與次數</p>
              <select
                onChange={e => {
                  const m = members.find(m => m.id === e.target.value)
                  if (m) fetchPersonalChart(m)
                }}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 mb-4"
                defaultValue=""
              >
                <option value="" disabled>選擇會員</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.display_name}</option>
                ))}
              </select>
              {selectedMemberForChart && (
                personalChartData.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-sm">此會員尚無參與記錄</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={personalChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }}
                        formatter={(v: any) => [`${v} 次`, selectedMemberForChart.display_name]}
                      />
                      <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {tagLegend.map(t => (
          <div key={t.label} className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
            <span className="font-medium" style={{ color: t.color }}>{t.label}</span>
            <span className="text-stone-400">（{t.desc}）</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {members.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400"><p>尚無 LINE 會員登入記錄</p></div>
        )}
        {members.map(member => {
          const count = regCounts[member.id] ?? 0
          const tag = getTag(count)
          const hasLocation = member.building || member.unit_number

          return (
            <div key={member.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                {member.picture_url
                  ? <img src={member.picture_url} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                  : <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"><span className="text-green-600 font-bold text-lg">{member.display_name?.[0]}</span></div>
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-stone-800 font-semibold">{member.display_name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: tag.color, backgroundColor: tag.bg }}>
                      {tag.label}
                    </span>
                    {member.points > 0 && (
                      <span className="text-xs text-orange-500 font-bold">{member.points} 點</span>
                    )}
                  </div>
                  {hasLocation && (
                    <p className="text-stone-500 text-xs">{member.building} {member.unit_number}{member.floor_number && `-${member.floor_number}F`}</p>
                  )}
                  {member.notes && <p className="text-stone-400 text-xs mt-0.5 truncate">{member.notes}</p>}
                  <p className="text-stone-300 text-xs mt-0.5">加入：{member.created_at?.split('T')[0]}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                 <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(member)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => { setAddPointModal(member); setAddPointForm({ delta: 1, reason: '' }) }}
                    className="flex items-center gap-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    調整點數

                  </button>
                 <button onClick={() => openHistory(member)}
                    className="flex items-center gap-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors">
                    課程記錄
                    <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{count}</span>
                  </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 課程記錄彈窗 */}
      {historyMember && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setHistoryMember(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3">
                {historyMember.picture_url
                  ? <img src={historyMember.picture_url} alt="" className="w-10 h-10 rounded-full" />
                  : <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 font-bold">{historyMember.display_name?.[0]}</span></div>
                }
                <div>
                  <h3 className="font-bold text-stone-800">{historyMember.display_name}</h3>
                  <p className="text-stone-400 text-xs">課程參與記錄</p>
                </div>
              </div>
              <button onClick={() => setHistoryMember(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {historyLoading ? (
                <div className="text-center py-8 text-stone-400 text-sm">載入中...</div>
              ) : historyRegs.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">尚無課程參與記錄</div>
              ) : (
                <div className="space-y-3">
                  {historyRegs.map((reg: any, i: number) => {
                    const isPast = reg.courses?.date ? new Date(reg.courses.date) < new Date() : false
                    return (
                      <div key={reg.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 border border-stone-200">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-stone-400 font-medium w-5 text-center">{i + 1}</span>
                          <div>
                            <p className="text-stone-700 text-sm font-semibold">{reg.courses?.title}</p>
                            <p className="text-stone-400 text-xs mt-0.5">{reg.courses?.date} · {reg.courses?.location}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${isPast ? 'bg-stone-100 text-stone-500' : 'bg-green-100 text-green-700'}`}>
                          {isPast ? '已結束' : '即將開課'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-stone-100">
              <p className="text-xs text-stone-400 text-center">共參與 {historyRegs.length} 堂課程</p>
            </div>
          </div>
        </div>
      )}

       {/* 手動加點彈窗 */}
      {addPointModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setAddPointModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3">
                {addPointModal.picture_url
                  ? <img src={addPointModal.picture_url} alt="" className="w-9 h-9 rounded-full" />
                  : <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 font-bold text-sm">{addPointModal.display_name?.[0]}</span></div>
                }
                <div>
                  <h3 className="font-bold text-stone-800 text-sm">{addPointModal.display_name}</h3>
                  <p className="text-stone-400 text-xs">目前 {addPointModal.points ?? 0} 點</p>
                </div>
              </div>
              <button onClick={() => setAddPointModal(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-2">點數調整</label>
                <div className="flex gap-2">
                  {[-3, -2, -1, 1, 2, 3].map(n => (
                    <button key={n} type="button"
                      onClick={() => setAddPointForm(f => ({ ...f, delta: n }))}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${addPointForm.delta === n
                        ? n > 0 ? 'bg-orange-500 text-white border-orange-500' : 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}>
                      {n > 0 ? `+${n}` : n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">原因 *</label>
                <input
                  value={addPointForm.reason}
                  onChange={e => setAddPointForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="例：現場參與「繪畫央北」"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
              <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-600">
                調整後點數：<span className="font-bold text-orange-500">{(addPointModal.points ?? 0) + addPointForm.delta} 點</span>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAddPoint} disabled={addPointSaving || !addPointForm.reason.trim()}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {addPointSaving ? '儲存中...' : '確認調整'}
                </button>
                <button onClick={() => setAddPointModal(null)}
                  className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 編輯彈窗 */}
      {editMember && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setEditMember(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="font-bold text-stone-800">編輯會員資料</h3>
              <button onClick={() => setEditMember(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl p-3">
                {editMember.picture_url ? <img src={editMember.picture_url} alt="" className="w-10 h-10 rounded-full" />
                  : <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 font-bold">{editMember.display_name?.[0]}</span></div>}
                <div>
                  <p className="font-semibold text-stone-800 text-sm">{editMember.display_name}</p>
                  <p className="text-stone-400 text-xs">{editMember.line_user_id}</p>
                </div>
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-2">居住資訊</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">棟別</label>
                    <select value={editForm.building} onChange={e => setEditForm({...editForm, building: e.target.value})}
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                      <option value="">未填</option>
                      {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">戶號</label>
                    <input value={editForm.unit_number} onChange={e => setEditForm({...editForm, unit_number: e.target.value})} placeholder="例：400"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 mb-1">樓層</label>
                    <input value={editForm.floor_number} onChange={e => setEditForm({...editForm, floor_number: e.target.value})} placeholder="例：5"
                      className="w-full border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">其他備註</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  placeholder="例：上課習慣、特殊需求..." rows={3}
                  className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {saving ? '儲存中...' : '儲存'}
                </button>
                <button onClick={() => setEditMember(null)}
                  className="px-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
