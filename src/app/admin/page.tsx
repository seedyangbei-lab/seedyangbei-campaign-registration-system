'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const PAGE_SIZE_OPTIONS = [10, 20]

export default function AdminDashboard() {
  const [stats, setStats] = useState({ activeCourses: 0, totalRegistrations: 0, uniqueRegistrants: 0 })
  const [registrations, setRegistrations] = useState<any[]>([])
  const [cancelledRegs, setCancelledRegs] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [filterCourse, setFilterCourse] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterResident, setFilterResident] = useState('')
  const [sortOrder, setSortOrder] = useState<'desc'|'asc'>('desc')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [manageMode, setManageMode] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmPermanent, setConfirmPermanent] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
   const [
      { count: activeCourses },
      { data: regs },
      { data: cancelledRegs },
      { data: courseList },
    ] = await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('registrations')
        .select('*, users(name, room_number, phone, age_group), courses(id, title, date)')
        .eq('status', 'confirmed')
        .order('registered_at', { ascending: false }),
      supabase.from('registrations')
        .select('*, users(name, room_number, phone, age_group), courses(id, title, date)')
        .eq('status', 'cancelled')
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
    setCancelledRegs(cancelledRegs || [])
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
          <div className="flex items-center gap-3 flex-shrink-0">
          <h3 className="text-stone-700 font-semibold">報名記錄</h3>
          <button
            onClick={() => { setShowCancelled(v => !v); setManageMode(false); setSelectedIds(new Set()) }}
            className={`text-xs px-2 py-1 rounded-lg transition-colors ${showCancelled ? 'bg-stone-200 text-stone-700' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {showCancelled ? '隱藏已取消' : '顯示已取消'}
          </button>
        </div>
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

              {!showCancelled && (
                <button
                  onClick={() => { setManageMode(v => !v); setSelectedIds(new Set()); setConfirmDelete(false) }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${manageMode ? 'bg-stone-200 text-stone-700' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  {manageMode ? '取消管理' : '刪除報名'}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-stone-400">
              {showCancelled ? `共 ${cancelledRegs.length} 筆已取消記錄` : `共 ${filtered.length} 筆記錄，顯示第 ${currentPage} 頁（共 ${totalPages || 1} 頁）`}
            </p>
            {manageMode && selectedIds.size > 0 && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                取消 {selectedIds.size} 筆報名
              </button>
            )}
          </div>        </div>

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
                {(showCancelled ? cancelledRegs : paginated).map((reg, i) => (
                  <tr key={reg.id} className={`transition-colors ${manageMode ? 'cursor-pointer' : ''} ${selectedIds.has(reg.id) ? 'bg-red-50' : 'hover:bg-stone-50'}`}
                    onClick={() => {
                      if (!manageMode) return
                      setSelectedIds(prev => {
                        const next = new Set(prev)
                        next.has(reg.id) ? next.delete(reg.id) : next.add(reg.id)
                        return next
                      })
                    }}>
                    <td className="px-4 py-3 text-stone-400 text-xs">
                      {manageMode ? (
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(reg.id) ? 'bg-red-500 border-red-500' : 'border-stone-300'}`}>
                          {selectedIds.has(reg.id) && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      ) : showCancelled ? (
                        <div className="flex items-center gap-2">
                          <span>{i + 1}</span>
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmPermanent(reg.id) }}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                            title="永久刪除"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                          </button>
                        </div>
                      ) : (currentPage - 1) * pageSize + i + 1}
                    </td>
              
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

      {/* 軟刪除確認 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-stone-800">確認取消報名？</h3>
                <p className="text-stone-400 text-xs mt-0.5">將取消 {selectedIds.size} 筆報名記錄，可在「已取消」中復原</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setDeleting(true)
                  await supabase.from('registrations').update({ status: 'cancelled' }).in('id', Array.from(selectedIds))
                  setConfirmDelete(false); setManageMode(false); setSelectedIds(new Set())
                  await fetchAll(); setDeleting(false)
                }}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
              >
                {deleting ? '處理中...' : '確認取消報名'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">返回</button>
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

                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"

              >

                {deleting ? '刪除中...' : '永久刪除'}

              </button>

              <button onClick={() => setConfirmPermanent(null)} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">取消</button>

            </div>

          </div>

        </div>

      )}

      </div>

  )

}
