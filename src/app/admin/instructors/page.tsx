'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Instructor {
  id: string; name: string; bio: string; avatar_url: string
  is_active: boolean; phone?: string; line_id?: string
}

const emptyForm = { name: '', bio: '', avatar_url: '', phone: '', line_id: '' }

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Instructor | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [coursesByInstructor, setCoursesByInstructor] = useState<Record<string, any[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchInstructors = async () => {
    const { data } = await supabase.from('instructors').select('*').order('created_at', { ascending: true })
    setInstructors(data || [])
  }
  useEffect(() => { fetchInstructors() }, [])

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (inst: Instructor) => {
    setEditTarget(inst)
    setForm({
      name: inst.name, bio: inst.bio || '', avatar_url: inst.avatar_url || '',
      phone: inst.phone || '', line_id: inst.line_id || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const payload = {
      name: form.name, bio: form.bio,
      avatar_url: form.avatar_url || null,
      phone: form.phone || null,
      line_id: form.line_id || null,
    }
    if (editTarget) {
      await supabase.from('instructors').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('instructors').insert(payload)
    }
    setShowModal(false); await fetchInstructors(); setLoading(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('instructors').update({ is_active: !current }).eq('id', id)
    fetchInstructors()
  }
  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這位講師嗎？')) return
    await supabase.from('instructors').delete().eq('id', id)
    fetchInstructors()
  }
  const loadCourses = async (instructorId: string) => {
    if (expandedId === instructorId) { setExpandedId(null); return }
    const { data } = await supabase.from('courses').select('id, title, date, is_active').eq('instructor_id', instructorId).order('date', { ascending: false })
    setCoursesByInstructor(prev => ({ ...prev, [instructorId]: data || [] }))
    setExpandedId(instructorId)
  }

  const getLineUrl = (lineId?: string) => {
    if (!lineId) return null
    if (lineId.startsWith('http')) return lineId
    const cleanId = lineId.replace(/^@/, '')
    return `https://line.me/R/ti/p/~${cleanId}`
  }

  const isGroupUrl = (lineId?: string) => lineId?.startsWith('http') ?? false

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">講師管理</h2>
          <p className="text-stone-400 mt-1 text-sm">管理種子戶開課講師陣容</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新增講師
        </button>
      </div>

      <div className="space-y-3">
        {instructors.length === 0 && (
          <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400"><p>尚無講師資料</p></div>
        )}
        {instructors.map(inst => (
          <div key={inst.id} className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              {inst.avatar_url ? (
                <img src={inst.avatar_url} alt={inst.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-rose-600 font-bold text-lg">{inst.name[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-stone-800 font-semibold mb-1">{inst.name}</p>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inst.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                    {inst.is_active ? '開課中' : '暫停'}
                  </span>
                  {inst.line_id && (
                    <a
                      href={getLineUrl(inst.line_id) || '#'}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: '#06C755' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
                      {isGroupUrl(inst.line_id) ? '課程群組' : 'LINE'}
                    </a>
                  )}
               </div>
                {inst.bio && <p className="text-stone-400 text-xs truncate">{inst.bio}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => loadCourses(inst.id)} className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors">
                  {expandedId === inst.id ? '收起' : '查看課程'}
                </button>
                <button onClick={() => openEdit(inst)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={() => toggleActive(inst.id, inst.is_active)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                  {inst.is_active
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
                  }
                </button>
                <button onClick={() => handleDelete(inst.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-stone-400 hover:text-red-500">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>

            {expandedId === inst.id && (
              <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
                <p className="text-xs font-semibold text-stone-500 mb-3 uppercase tracking-wider">開設課程</p>
                {(coursesByInstructor[inst.id] || []).length === 0 ? (
                  <p className="text-stone-400 text-sm">尚無開設課程</p>
                ) : (
                  <div className="space-y-2">
                    {(coursesByInstructor[inst.id] || []).map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-stone-200">
                        <div>
                          <p className="text-stone-700 text-sm font-medium">{c.title}</p>
                          <p className="text-stone-400 text-xs mt-0.5">{c.date}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                          {c.is_active ? '開放中' : '已關閉'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="text-stone-800 font-bold text-lg">{editTarget ? '編輯講師' : '新增講師'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">講師姓名 *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="例：佑辰"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">講師簡介</label>
                <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                  rows={3} placeholder="簡短介紹這位講師"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">
                  聯絡電話 <span className="text-stone-400 font-normal">（選填）</span>
                </label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  placeholder="例：0912345678"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">
                  LINE ID 或課程群組連結 <span className="text-stone-400 font-normal">（選填）</span>
                </label>
                <p className="text-stone-400 text-xs mb-2">
                  填 <code className="bg-stone-100 px-1 rounded">@帳號ID</code> 加好友，或貼群組連結 <code className="bg-stone-100 px-1 rounded">https://line.me/R/ti/g/xxx</code>
                </p>
                <input
                  value={form.line_id}
                  onChange={e => setForm({...form, line_id: e.target.value})}
                  placeholder="例：@abc1234 或 https://line.me/R/ti/g/xxxxxxxx"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                {form.line_id && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-stone-400">預覽連結：</span>
                    <a
                      href={getLineUrl(form.line_id) || '#'}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-green-600 underline hover:text-green-700 truncate"
                    >
                      {getLineUrl(form.line_id)}
                    </a>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">
                  大頭照連結 <span className="text-stone-400 font-normal">（選填）</span>
                </label>
                <input value={form.avatar_url} onChange={e => setForm({...form, avatar_url: e.target.value})}
                  placeholder="https://..."
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? '儲存中...' : '儲存'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
