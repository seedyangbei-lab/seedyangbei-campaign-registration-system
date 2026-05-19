'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function RegistrationsPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [registrations, setRegistrations] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.from('courses').select('id, title, date').order('date', { ascending: false })
      .then(({ data }) => setCourses(data || []))
  }, [])

  useEffect(() => {
    if (!selectedCourse) return
    supabase.from('registrations')
      .select('*, users(name, room_number, phone, email, age_group, line_id)')
      .eq('course_id', selectedCourse).eq('status', 'confirmed')
      .order('registered_at', { ascending: true })
      .then(({ data }) => setRegistrations(data || []))
  }, [selectedCourse])

  const exportCSV = () => {
    const header = '序號,姓名,房號,手機,Email,LINE ID,年齡區間,是否社宅居民,報名時間'
    const rows = registrations.map((r, i) =>
      `${i+1},${r.users?.name},${r.users?.room_number},${r.users?.phone},${r.users?.email},${r.users?.line_id||''},${r.users?.age_group},${r.is_social_housing_resident?'是':'否'},${r.registered_at?.split('T')[0]}`
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `報名名單.csv`
    a.click()
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">報名名單</h2>
          <p className="text-stone-400 mt-1 text-sm">選擇課程查看報名資料</p>
        </div>
        {registrations.length > 0 && (
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            匯出 CSV
          </button>
        )}
      </div>

      <div className="mb-6">
        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
          className="w-full md:w-96 bg-white border border-stone-300 rounded-xl px-4 py-3 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
          <option value="">選擇課程查看報名名單</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.date} · {c.title}</option>)}
        </select>
      </div>

      {selectedCourse && (
        <div className="space-y-3">
          <p className="text-stone-500 text-sm">共 <span className="font-semibold text-stone-700">{registrations.length}</span> 位報名者</p>
          {registrations.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-stone-400">
              <p>這堂課尚無報名者</p>
            </div>
          )}
          {registrations.map((reg, i) => (
            <div key={reg.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-1 rounded-lg">#{i + 1}</span>
                <span className="text-xs text-stone-400">{reg.registered_at?.split('T')[0]}</span>
              </div>
              <p className="text-stone-800 font-semibold text-base mb-2">{reg.users?.name}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: '房號', value: reg.users?.room_number },
                  { label: '手機', value: reg.users?.phone },
                  { label: '年齡', value: reg.users?.age_group },
                  { label: '身份', value: reg.is_social_housing_resident ? '社宅居民' : `非社宅` },
                ].map(item => (
                  <div key={item.label} className="bg-stone-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-stone-400">{item.label}</p>
                    <p className="text-sm text-stone-700 font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
              {reg.questions && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-stone-600">
                  <span className="text-amber-600 font-medium text-xs mr-2">課前提問</span>
                  {reg.questions}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
