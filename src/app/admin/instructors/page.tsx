'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Instructor {
  id: string; name: string; bio: string; avatar_url: string
  is_active: boolean; phone?: string; line_id?: string
  line_user_id?: string | null
}

const emptyForm = { name: '', bio: '', avatar_url: '', phone: '', line_id: '', is_active: true }

/* ---------- Icons（inline SVG，禁止 emoji） ---------- */

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  )
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}

// 開課狀態切換（對應 Figma node 368-31500 的 Toggle）
function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label="切換開課狀態" className="relative rounded-full transition-colors shrink-0 w-11 h-6" style={{ background: on ? '#f97316' : '#d6d3d1' }}>
      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: '20px', height: '20px', left: on ? '22px' : '2px' }} />
    </button>
  )
}

// 綁定狀態 badge（bg-teal-100/text-teal-600 對應已綁定；bg-rose-600/text-white 對應尚未綁定）
function BindBadge({ bound }: { bound: boolean }) {
  return (
    <span className={`text-sm font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${bound ? 'bg-teal-100 text-teal-600' : 'bg-rose-600 text-white'}`}>
      {bound ? '已綁定中台' : '尚未綁定中台'}
    </span>
  )
}

// 開課狀態 badge（bg-green-100/text-green-700 開放；bg-stone-100/border-stone-300/text-stone-600 已結束）
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-sm font-medium px-2 py-0.5 rounded-md whitespace-nowrap ${active ? 'bg-green-100 text-green-700' : 'bg-stone-100 border border-stone-300 text-stone-600'}`}>
      {active ? '開放報名' : '已結束'}
    </span>
  )
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Instructor | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [coursesByInstructor, setCoursesByInstructor] = useState<Record<string, any[]>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [claimLoadingId, setClaimLoadingId] = useState<string | null>(null)
  const [claimUrl, setClaimUrl] = useState<string | null>(null)
  const [claimError, setClaimError] = useState<string | null>(null)
  const supabase = createClient()

  const handleGenerateClaim = async (instructorId: string) => {
    setClaimLoadingId(instructorId); setClaimError(null)
    try {
      const res = await fetch('/api/instructor/generate-claim-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructorId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'unknown')
      setClaimUrl(data.claimUrl)
    } catch (e) {
      setClaimError('產生連結失敗，請稍後再試')
    } finally {
      setClaimLoadingId(null)
    }
  }

  const handleUnbind = async (instructorId: string) => {
    if (!confirm('確定要解除這位講師的中台綁定嗎？解除後他需要用新的邀請連結重新綁定。')) return
    await supabase.from('instructors').update({ line_user_id: null }).eq('id', instructorId)
    fetchInstructors()
  }

  const fetchInstructors = async () => {
    const { data } = await supabase.from('instructors').select('*').order('created_at', { ascending: true })
    setInstructors(data || [])
    setPageLoading(false)
  }
  useEffect(() => { fetchInstructors() }, [])

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (inst: Instructor) => {
    setEditTarget(inst)
    setForm({
      name: inst.name, bio: inst.bio || '', avatar_url: inst.avatar_url || '',
      phone: inst.phone || '', line_id: inst.line_id || '', is_active: inst.is_active,
    })
    setShowModal(true)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const filename = `avatars/${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
      setForm(f => ({ ...f, avatar_url: urlData.publicUrl }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const payload = {
      name: form.name, bio: form.bio,
      avatar_url: form.avatar_url || null,
      phone: form.phone || null,
      line_id: form.line_id || null,
      is_active: form.is_active,
    }
    if (editTarget) {
      await supabase.from('instructors').update(payload).eq('id', editTarget.id)
    } else {
      await supabase.from('instructors').insert(payload)
    }
    setShowModal(false); await fetchInstructors(); setLoading(false)
  }

  // 停止開課／刪除講師已整合進編輯講師彈窗（開課狀態切換 + 刪除講師按鈕）
  const handleDeleteFromModal = async () => {
    if (!editTarget) return
    if (!confirm('確定要刪除這位講師嗎？此操作無法復原。')) return
    setLoading(true)
    await supabase.from('instructors').delete().eq('id', editTarget.id)
    setShowModal(false)
    await fetchInstructors()
    setLoading(false)
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


  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">講師管理</h2>
          <p className="text-stone-400 mt-1 text-sm">管理種子戶開課講師陣容</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <PlusIcon />新增講師
        </button>
      </div>

      <div className="space-y-4">
        {pageLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-stone-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-pulse">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-stone-100 rounded w-1/4" />
              <div className="h-3 bg-stone-100 rounded w-1/3" />
            </div>
          </div>
        ))}
        {!pageLoading && instructors.length === 0 && (
          <div className="bg-white border border-stone-100 rounded-2xl p-12 text-center text-stone-400"><p>尚無講師資料</p></div>
        )}
        {instructors.map(inst => {
          const bound = !!inst.line_user_id
          const expanded = expandedId === inst.id
          return (
            <div key={inst.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
              {/* 桌機版：單行 row（對應 Figma node 368-30742 / 367-29994），移除簡介顯示，右側按鈕改橫排 */}
              <div className="hidden md:flex md:items-center md:h-[66px]">
                <div className="flex-1 min-w-0 h-full border-b border-stone-100 flex items-center gap-2 px-4 py-2">
                  {inst.avatar_url ? (
                    <img src={inst.avatar_url} alt={inst.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-bold text-lg">{inst.name[0]}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <p className="text-stone-800 font-bold text-base whitespace-nowrap">{inst.name}</p>
                    <button onClick={() => openEdit(inst)} aria-label="編輯講師"
                      className="w-5 h-5 flex items-center justify-center border border-stone-200 rounded-md hover:bg-stone-50 transition-colors shrink-0 text-stone-500">
                      <EditIcon />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <BindBadge bound={bound} />
                    <ActiveBadge active={inst.is_active} />
                  </div>
                </div>

                <div className="w-[217px] shrink-0 h-full flex items-center gap-2 p-4">
                  {bound ? (
                    <button onClick={() => handleUnbind(inst.id)}
                      className="flex-1 border border-rose-600 text-rose-600 text-xs font-medium py-2 rounded-md hover:bg-rose-50 transition-colors whitespace-nowrap">
                      解除綁定
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateClaim(inst.id)}
                      disabled={claimLoadingId === inst.id}
                      className="flex-1 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium py-2 rounded-md hover:bg-orange-100 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {claimLoadingId === inst.id ? '產生中...' : '產生邀請連結'}
                    </button>
                  )}
                  <button onClick={() => loadCourses(inst.id)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 rounded-md transition-colors whitespace-nowrap">
                    {expanded ? '收起課程' : '查看課程'}
                  </button>
                </div>
              </div>

              {/* 手機版：卡片直向堆疊（對應 Figma node 387-34119 / 387-34184），移除簡介顯示與虛線分隔 */}
              <div className="flex md:hidden flex-col">
                <div className="border-b border-stone-100">
                  <div className="flex items-center gap-2 p-4">
                    {inst.avatar_url ? (
                      <img src={inst.avatar_url} alt={inst.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-600 font-bold text-lg">{inst.name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <p className="text-stone-800 font-bold text-base whitespace-nowrap">{inst.name}</p>
                        <button onClick={() => openEdit(inst)} aria-label="編輯講師"
                          className="w-5 h-5 flex items-center justify-center border border-stone-200 rounded-md hover:bg-stone-50 transition-colors shrink-0 text-stone-500">
                          <EditIcon />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <BindBadge bound={bound} />
                        <ActiveBadge active={inst.is_active} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white flex items-center gap-2 p-4">
                  {bound ? (
                    <button onClick={() => handleUnbind(inst.id)}
                      className="flex-1 border border-rose-600 text-rose-600 text-xs font-medium py-2 rounded-md hover:bg-rose-50 transition-colors">
                      解除綁定
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateClaim(inst.id)}
                      disabled={claimLoadingId === inst.id}
                      className="flex-1 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-medium py-2 rounded-md hover:bg-orange-100 disabled:opacity-50 transition-colors"
                    >
                      {claimLoadingId === inst.id ? '產生中...' : '產生邀請連結'}
                    </button>
                  )}
                  <button onClick={() => loadCourses(inst.id)}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-2 rounded-md transition-colors">
                    {expanded ? '收起課程' : '查看課程'}
                  </button>
                </div>
              </div>

              {/* grid-template-rows 0fr/1fr 技巧：不需量測高度也能讓展開/收合順暢過渡 */}
              <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <div className={`border-t border-stone-100 bg-stone-50 px-5 py-4 transition-opacity duration-300 ${expanded ? 'opacity-100 delay-100' : 'opacity-0'}`}>
                    <p className="text-sm font-medium text-stone-600 mb-3">開設課程</p>
                    {(coursesByInstructor[inst.id] || []).length === 0 ? (
                      <p className="text-stone-400 text-sm">尚無開設課程</p>
                    ) : (
                      <div className="space-y-2">
                        {(coursesByInstructor[inst.id] || []).map(c => (
                          <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-stone-200">
                            <div>
                              <p className="text-stone-600 text-sm font-medium">{c.title}</p>
                              <p className="text-stone-400 text-xs mt-0.5">{c.date}</p>
                            </div>
                            <ActiveBadge active={c.is_active} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 邀請連結 Modal */}
      {(claimUrl || claimError) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) { setClaimUrl(null); setClaimError(null) } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-stone-800 font-bold text-lg mb-3">講師邀請連結</h3>
            {claimError ? (
              <p className="text-red-500 text-sm">{claimError}</p>
            ) : (
              <>
                <p className="text-stone-400 text-xs mb-3">7 天內有效，請直接傳送給講師本人，勿公開分享。</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={claimUrl || ''} className="flex-1 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-600" />
                  <button
                    onClick={() => { navigator.clipboard.writeText(claimUrl || ''); }}
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl font-medium transition-colors"
                  >
                    複製
                  </button>
                </div>
              </>
            )}
            <button onClick={() => { setClaimUrl(null); setClaimError(null) }} className="mt-5 w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-2.5 rounded-xl text-sm transition-colors">
              關閉
            </button>
          </div>
        </div>
      )}

      {/* 新增／編輯講師 Modal：停止開課（開課狀態切換）與刪除講師已整合進來（對應 Figma node 368-31500） */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <form onSubmit={handleSubmit} className="relative bg-white border border-stone-200 rounded-2xl w-full max-w-[346px] max-h-[90vh] overflow-y-auto flex flex-col items-center gap-4 pt-8 pb-4 px-4">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-2.5 right-3 bg-white border border-stone-200 rounded-full p-1.5 hover:bg-stone-50 transition-colors" aria-label="關閉">
              <CloseIcon className="text-stone-600" />
            </button>

            <div className="border-b border-stone-100 pb-4 w-full flex flex-col items-center">
              <p className="font-medium text-lg leading-7 text-stone-600">{editTarget ? '編輯講師資料' : '新增講師'}</p>
            </div>

            <div className="relative w-[100px] h-[100px] shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-orange-100 flex items-center justify-center">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="大頭照" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-orange-600 font-bold text-3xl">{form.name?.[0] || '?'}</span>
                )}
              </div>
              <label className="absolute right-0 bottom-[6px] bg-orange-500 hover:bg-orange-600 rounded-full p-[7px] cursor-pointer transition-colors">
                <CameraIcon className="text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>

            {editTarget && (
              <>
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-stone-600">開課狀態</span>
                  <ToggleSwitch on={form.is_active} onToggle={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
                </div>
                <div className="h-px bg-stone-100 w-full" />
              </>
            )}

            <div className="flex flex-col gap-4 items-start w-full">
              <div className="flex flex-col gap-2 items-start w-full">
                <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
                  <span className="text-red-500 text-xs leading-none">*</span>姓名
                </label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例：佑辰"
                  className="w-full bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex flex-col gap-2 items-start w-full">
                <label className="text-sm font-medium text-stone-600">簡介</label>
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="簡短介紹這位講師"
                  className="w-full h-20 bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex flex-col gap-2 items-start w-full">
                <label className="text-sm font-medium text-stone-600">聯絡電話</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0912-345-678"
                  className="w-full bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex flex-col gap-2 items-start w-full">
                <label className="text-sm font-medium text-stone-600">LINE ID 或課程群組連結</label>
                <input
                  value={form.line_id}
                  onChange={e => setForm({ ...form, line_id: e.target.value })}
                  placeholder="https://line.me/..."
                  className="w-full bg-white border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                {form.line_id && (
                  <div className="flex items-center gap-2">
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
            </div>

            <div className="flex gap-3 w-full">
              {editTarget && (
                <button type="button" onClick={handleDeleteFromModal}
                  className="shrink-0 flex items-center gap-1.5 border border-rose-600 text-rose-600 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-rose-50 transition-colors">
                  <TrashIcon />刪除講師
                </button>
              )}
              <button type="submit" disabled={loading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {loading ? '儲存中...' : editTarget ? '儲存講師資料' : '新增講師'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
