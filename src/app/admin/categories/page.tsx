'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const PRESET_COLORS = ['#e11d48','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#2563eb','#0d9488']

interface Category { id: string; name: string; color: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', color: '#e11d48' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetch = async () => {
    const { data } = await supabase.from('course_categories').select('*').order('created_at')
    setCategories(data || [])
  }

  useEffect(() => { fetch() }, [])

  const openAdd = () => { setEditTarget(null); setForm({ name: '', color: '#e11d48' }); setShowModal(true) }
  const openEdit = (c: Category) => { setEditTarget(c); setForm({ name: c.name, color: c.color }); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (editTarget) {
      await supabase.from('course_categories').update({ name: form.name, color: form.color }).eq('id', editTarget.id)
    } else {
      await supabase.from('course_categories').insert({ name: form.name, color: form.color })
    }
    setShowModal(false)
    await fetch()
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除這個類別嗎？已使用此類別的課程將會失去分類。')) return
    await supabase.from('course_categories').delete().eq('id', id)
    fetch()
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">課程類別</h2>
          <p className="text-stone-400 mt-1 text-sm">管理前台的篩選類別標籤</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          新增類別
        </button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        {categories.length === 0 && (
          <div className="p-12 text-center text-stone-400"><p>尚無類別</p></div>
        )}
        {categories.map((cat, i) => (
          <div key={cat.id} className={`flex items-center justify-between px-5 py-4 ${i < categories.length - 1 ? 'border-b border-stone-100' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-stone-700 font-medium">{cat.name}</span>
              <span className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{ backgroundColor: cat.color }}>
                {cat.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(cat)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              </button>
              <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-stone-400 hover:text-red-500">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="text-stone-800 font-bold">{editTarget ? '編輯類別' : '新增類別'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">類別名稱 *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="例：AI 學習相關"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-2">標籤顏色</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm({...form, color})}
                      className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-stone-400' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full" style={{ backgroundColor: form.color }} />
                  <span className="text-xs px-3 py-1.5 rounded-full text-white font-medium" style={{ backgroundColor: form.color }}>
                    {form.name || '預覽'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? '儲存中...' : '儲存'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">
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
