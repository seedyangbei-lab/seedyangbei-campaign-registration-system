'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const PAGE_SIZE_OPTIONS = [10, 20]

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activeCourses: 0, totalRegistrations: 0, uniqueRegistrants: 0 })
  const [registrations, setRegistrations] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [filterCourse, setFilterCourse] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterResident, setFilterResident] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc'|'asc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
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
        .select('*, users(name, room_number, phone, age_group), courses(id, title, date)')
        .eq('status', 'confirmed')
        .order('registered_at', { ascending: false }),
      supabase.from('courses').select('id, title, date').order('date', { ascending: false }),
    ])

    const allRegs = regs || []
    // 正確計算：有報名記錄的不重複 user_id
    const uniqueUserIds = new Set(allRegs.map((r: any) => r.user_id))

    setStats({
      activeCourses: activeCourses ?? 0,
      totalRegistrations: allRegs.length,
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
    .sort((a, b) => sortOrder === 'desc'
      ? new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
      : new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
    )

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleFilterChange = (setter: (v: any) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value)
    setCurrentPage(1)
  }

  const formatDT = (ts: string) => {
    const d = new Date(ts)
    return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  const statCards = [
    {
      label: '開放中課程',
      value: stats.activeCourses,
      desc: '目前可報名的課程數',
      color: 'bg-orange-50 border-orange-100',
    },
    {
      label: '已報名課程數',
      value: stats.totalRegistrations,
      desc: '所有課程的報名總筆數',
      color: 'bg-cyan-50 border-cyan-100',
    },
    {
      label: '報名人數',
      value: stats.uniqueRegistrants,
      desc: '已報名的不重複人數',
      color: 'bg-violet-50 border-violet-100',
    },
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-stone-800 text-2xl font-bold">總覽</h2>
        <p className="text-stone-400 mt-1 text-sm">歡迎回來，種子戶管理員</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-5`}>
            <p className="text-stone-600 text-sm font-medium">{s.label}</p>
            <p className="text-stone-800 text-4xl font-bold mt-1 mb-1">{s.value}</p>
            <p className="text-stone-400 text-xs">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* 報名看板 */}
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        {/* 篩選列 */}
        <div className="px-6 py-4 border-b border-stone-100">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <h3 className="text-stone-700 font-semibold flex-shrink-0">報名記錄</h3>
            <div className="flex flex-wrap gap-2 md:ml-auto">
              {/* 課程篩選 */}
              <select value={filterCourse} onChange={handleFilterChange(setFilterCourse)}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                <option value="">全部課程</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.date} · {c.title}</option>)}
              </select>

              {/* 月份篩選 */}
              <select value={filterMonth} onChange={handleFilterChange(setFilterMonth)}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                <option value="">全部月份</option>
                {availableMonths.map(m => {
                  const [y, mo] = m.split('-')
                  return <option key={m} value={m}>{y} 年 {parseInt(mo)} 月</option>
                })}
              </select>

              {/* 身份篩選 */}
              <select value={filterResident} onChange={handleFilterChange(setFilterResident)}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                <option value="">全部身份</option>
                <option value="social">社宅居民</option>
                <option value="other">非社宅居民</option>
              </select>

              {/* 排序 */}
              <select value={sortOrder} onChange={e => { setSortOrder(e.target.value as 'desc'|'asc'); setCurrentPage(1) }}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                <option value="desc">最新優先</option>
                <option value="asc">最舊優先</option>
              </select>

              {/* 每頁筆數 */}
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>每頁 {n} 筆</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-stone-400 mt-2">共 {filtered.length} 筆記錄，顯示第 {currentPage} 頁（共 {totalPages || 1} 頁）</p>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone-400 text-sm">尚無符合條件的報名記錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  {['#','姓名','房號','手機','課程','身份','年齡','報名時間'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginated.map((reg, i) => (
                  <tr key={reg.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-stone-400 text-xs">{(currentPage - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-600 font-bold text-xs">{reg.users?.name?.[0] || '?'}</span>
                        </div>
                        <span className="font-medium text-stone-800 whitespace-nowrap">{reg.users?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-600 whitespace-nowrap">{reg.users?.room_number}</td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">{reg.users?.phone}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-stone-700 font-medium whitespace-nowrap">{reg.courses?.title}</p>
                        <p className="text-stone-400 text-xs">{reg.courses?.date}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${reg.is_social_housing_resident ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-600'}`}>
                        {reg.is_social_housing_resident ? '社宅居民' : '非社宅'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{reg.users?.age_group}</td>
                    <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">{formatDT(reg.registered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Page Control */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              上一頁
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === currentPage ? 'bg-orange-500 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
              下一頁
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
