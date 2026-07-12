'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { StatCard, FilterDropdown, SortToggle, IdentityBadge, StatusBadge, PaginationControl, RowActionMenu } from '@/components/AdminUI'

const PAGE_SIZE = 10

type RegStatus = 'cancelled' | 'confirmed' | 'attended'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activeCourses: 0, totalRegistrations: 0, uniqueRegistrants: 0 })
  const [registrations, setRegistrations] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [filterCourse, setFilterCourse] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterResident, setFilterResident] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc'|'asc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [confirmPermanent, setConfirmPermanent] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    const [
      { count: activeCourses },
      { data: regs },
      { data: courseList },
    ] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('registrations')
        .select('*, users(name, room_number, phone, age_group, line_id), courses(id, title, date)')
        .in('status', ['confirmed', 'attended', 'cancelled'])
        .order('registered_at', { ascending: false }),
      supabase.from('courses').select('id, title, date').order('date', { ascending: false }),
    ])

    const allRegs = regs || []
    const activeRegs = allRegs.filter((r: any) => r.status !== 'cancelled')
    const uniqueUserIds = new Set(activeRegs.map((r: any) => r.user_id))

    setStats({
      activeCourses: activeCourses ?? 0,
      totalRegistrations: activeRegs.length,
      uniqueRegistrants: uniqueUserIds.size,
    })
    setRegistrations(allRegs)
    setCourses(courseList || [])
    setLoading(false)
  }

  // 可用月份（從課程列表提取）
  const availableMonths = Array.from(
    new Set(courses.map(c => c.date?.slice(0, 7)).filter(Boolean))
  ).sort().reverse()

  const filtered = registrations
    .filter(r => filterCourse ? r.course_id === filterCourse : true)
    .filter(r => filterMonth ? r.courses?.date?.startsWith(filterMonth) : true)
    .filter(r => filterResident === '' ? true : filterResident === 'social' ? r.is_social_housing_resident : !r.is_social_housing_resident)
    .filter(r => filterStatus === '' ? true : r.status === filterStatus)
    .sort((a, b) => sortOrder === 'desc'
      ? new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
      : new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
    )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (setter: (v: any) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value)
    setCurrentPage(1)
  }

  const handleSortChange = (v: 'desc' | 'asc') => {
    setSortOrder(v)
    setCurrentPage(1)
  }

  const handleCancelRegistration = async () => {
    if (!confirmCancelId) return
    setDeleting(true)
    await supabase.from('registrations').update({ status: 'cancelled' }).eq('id', confirmCancelId)
    setConfirmCancelId(null)
    await fetchAll()
    setDeleting(false)
  }

  const formatDT = (ts: string) => {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const getInitials = (name?: string) => (name || '?').slice(0, 2).toUpperCase()

  const statCards = [
    { label: '開放中課程', value: stats.activeCourses, desc: '目前可報名的課程數' },
    { label: '已報名課程數', value: stats.totalRegistrations, desc: '所有課程的報名總筆數' },
    { label: '報名人數', value: stats.uniqueRegistrants, desc: '已報名的不重複人數' },
  ]

  const columns = ['#', '姓名', '房號', '手機', '課程', '身份', '年齡', '報名時間', '出席狀況', '操作']

  return (
    <div className="p-6 md:p-8">
      {/* Title */}
      <div className="flex flex-col items-start pb-[17px] border-b border-stone-200 mb-6">
        <h2 className="text-xl font-bold text-stone-600">總覽</h2>
        <p className="text-sm text-stone-500">歡迎回來，種子戶管理員</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {statCards.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* 報名看板 */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden p-[17px]">
        {/* 篩選列 */}
        <div className="pb-4">
          <h3 className="text-stone-700 font-semibold mb-3">報名記錄</h3>
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterDropdown value={filterCourse} onChange={handleFilterChange(setFilterCourse)}>
                <option value="">全部課程</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.date} · {c.title}</option>)}
              </FilterDropdown>

              <FilterDropdown value={filterMonth} onChange={handleFilterChange(setFilterMonth)}>
                <option value="">全部月份</option>
                {availableMonths.map(m => {
                  const [y, mo] = m.split('-')
                  return <option key={m} value={m}>{y} 年 {parseInt(mo)} 月</option>
                })}
              </FilterDropdown>

              <FilterDropdown value={filterResident} onChange={handleFilterChange(setFilterResident)}>
                <option value="">全部身份</option>
                <option value="social">社宅居民</option>
                <option value="other">非社宅居民</option>
              </FilterDropdown>

              <FilterDropdown value={filterStatus} onChange={handleFilterChange(setFilterStatus)}>
                <option value="">全部狀態</option>
                <option value="cancelled">已取消</option>
                <option value="confirmed">待出席</option>
                <option value="attended">已出席</option>
              </FilterDropdown>
            </div>

            <div className="xl:ml-auto">
              <SortToggle value={sortOrder} onChange={handleSortChange} />
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-3">
            共 {filtered.length} 筆記錄，顯示第 {currentPage} 頁（共 {totalPages} 頁）
          </p>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-sm">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm">尚無符合條件的報名記錄</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#f0edeb]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#fafaf9] border border-[#f0edeb]">
                  {columns.map(h => (
                    <th key={h} className="text-left px-4 py-2 text-[#403b38] font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((reg, i) => (
                  <tr key={reg.id} className={`border border-[#f0edeb] ${i % 2 === 0 ? 'bg-[#f5f5f4]' : 'bg-white'}`}>
                    <td className="px-4 py-3 text-[#a8a39e] text-xs w-10">
                      {(currentPage - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td className="px-4 py-3 w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="size-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-normal text-xs tracking-wide">{getInitials(reg.users?.name)}</span>
                        </div>
                        <span className="font-medium text-[#292624] whitespace-nowrap">{reg.users?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#57544f] whitespace-nowrap w-[120px]">{reg.users?.room_number}</td>
                    <td className="px-4 py-3 text-[#78706b] whitespace-nowrap w-[120px]">{reg.users?.phone}</td>
                    <td className="px-4 py-3">
                      <p className="text-[#57544f] font-medium whitespace-nowrap">{reg.courses?.title}</p>
                      <p className="text-[#bab5b0] text-xs">{reg.courses?.date}</p>
                    </td>
                    <td className="px-4 py-3 w-[120px]">
                      <IdentityBadge resident={!!reg.is_social_housing_resident} />
                    </td>
                    <td className="px-4 py-3 text-[#78706b] text-xs whitespace-nowrap w-[120px]">{reg.users?.age_group}</td>
                    <td className="px-4 py-3 text-[#bab5b0] text-xs whitespace-nowrap w-[120px]">{formatDT(reg.registered_at)}</td>
                    <td className="px-4 py-3 w-[120px]">
                      <StatusBadge status={reg.status as RegStatus} />
                    </td>
                    <td className="px-4 py-3 w-14">
                      <RowActionMenu
                        status={reg.status as RegStatus}
                        onCancel={() => setConfirmCancelId(reg.id)}
                        onDelete={() => setConfirmPermanent(reg.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Page Control */}
        {totalPages > 1 && (
          <div className="pt-4">
            <PaginationControl currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />
          </div>
        )}
      </div>

      {/* 單筆取消報名確認 */}
      {confirmCancelId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-800">確認取消報名？</h3>
                <p className="text-stone-400 text-xs mt-0.5">取消後可在「已取消」狀態中查看，此動作可再復原</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelRegistration}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg text-sm transition-colors"
              >
                {deleting ? '處理中...' : '確認取消報名'}
              </button>
              <button onClick={() => setConfirmCancelId(null)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-lg text-sm transition-colors">返回</button>
            </div>
          </div>
        </div>
      )}

      {/* 永久刪除確認 */}
      {confirmPermanent && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-800">永久刪除此筆紀錄？</h3>
                <p className="text-stone-400 text-xs mt-0.5">此操作無法復原，資料將從資料庫中永久移除</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleting(true)
                  await supabase.from('registrations').delete().eq('id', confirmPermanent)
                  setConfirmPermanent(null)
                  await fetchAll(); setDeleting(false)
                }}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg text-sm transition-colors"
              >
                {deleting ? '刪除中...' : '永久刪除'}
              </button>
              <button onClick={() => setConfirmPermanent(null)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-lg text-sm transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
