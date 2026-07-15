'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BUILDINGS, UNIT_NUMBERS, FLOORS, SUB_UNITS, formatRoomNumber } from '@/lib/address'

type ExistingUser = { id: string; name: string; room_number: string; line_id?: string | null }
type CreatedReg = { id: string; status: string; is_walk_in: boolean; users: ExistingUser }

// 現場報到（無網路報名居民）：中台／後台簽到彈窗共用同一個新增視窗
// - 姓名輸入同時是搜尋框：先查有沒有既有紀錄（例如之前線上報名過、或已是 LINE 會員），有的話直接選用，不重複建檔
// - 找不到才走「新建」：身份（住戶／非社區住戶）＋ 房號（棟別/號數/樓層/幾之幾，格式與 /register 報名表單一致）
export default function WalkInRegistrationModal({
  courseId, onClose, onCreated,
}: {
  courseId: string
  onClose: () => void
  onCreated: (reg: CreatedReg) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<ExistingUser[]>([])
  const [selected, setSelected] = useState<ExistingUser | null>(null)
  const [isResident, setIsResident] = useState(true)
  const [building, setBuilding] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [subUnit, setSubUnit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (selected) { setSuggestions([]); return }
    const q = query.trim()
    if (!q) { setSuggestions([]); return }
    let active = true
    const t = setTimeout(async () => {
      const { data } = await supabase.from('users').select('id, name, room_number, line_id').ilike('name', `%${q}%`).limit(6)
      if (active) setSuggestions(data || [])
    }, 300)
    return () => { active = false; clearTimeout(t) }
  }, [query, selected])

  const roomNumber = isResident ? formatRoomNumber(building, unitNumber, floor, subUnit) : '非社宅居民'

  const handleConfirm = async () => {
    setError('')
    if (!selected && !query.trim()) { setError('請輸入姓名，或從搜尋結果中選擇既有紀錄'); return }
    if (!selected && isResident && !roomNumber) { setError('請填寫完整戶號（棟別／號數／樓層／幾之幾）'); return }
    setSaving(true)

    let userRow: ExistingUser

    if (selected) {
      userRow = selected
    } else {
      const { data: newUser, error: userErr } = await supabase.from('users')
        .insert({ name: query.trim(), room_number: roomNumber })
        .select('id, name, room_number, line_id')
        .single()
      if (userErr || !newUser) {
        setError('新增失敗：' + (userErr?.message || '未知錯誤'))
        setSaving(false)
        return
      }
      userRow = newUser
    }

    const { data: newReg, error: regErr } = await supabase.from('registrations')
      .insert({
        user_id: userRow.id, course_id: courseId, status: 'confirmed',
        is_social_housing_resident: selected ? true : isResident,
        is_walk_in: true,
      })
      .select('id, status, is_walk_in')
      .single()

    if (regErr || !newReg) {
      setError(regErr?.code === '23505' ? '這位居民已經報名過這堂課了' : '新增失敗：' + (regErr?.message || '未知錯誤'))
      setSaving(false)
      return
    }

    onCreated({ ...newReg, users: userRow })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h4 className="font-bold text-stone-800 text-sm">現場新增報到</h4>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors" aria-label="關閉">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-stone-500 mb-1.5">姓名</label>
            {selected ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{selected.name}</p>
                  <p className="text-xs text-stone-500 truncate">{selected.room_number}（既有紀錄）</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setQuery('') }} className="text-xs text-stone-400 hover:text-stone-600 shrink-0 ml-2">
                  清除
                </button>
              </div>
            ) : (
              <>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="輸入姓名搜尋既有紀錄，或直接新增"
                  className="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map(u => (
                      <button key={u.id} type="button" onClick={() => { setSelected(u); setSuggestions([]) }}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors border-b border-stone-50 last:border-0">
                        <p className="text-sm text-stone-800">{u.name}</p>
                        <p className="text-xs text-stone-400">{u.room_number}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {!selected && (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1.5">身份</label>
                <div className="flex gap-2">
                  {[{ v: true, l: '住戶' }, { v: false, l: '非社區住戶' }].map(opt => (
                    <button key={String(opt.v)} type="button" onClick={() => setIsResident(opt.v)}
                      className={`flex-1 h-9 rounded-lg border text-xs font-medium transition-colors ${isResident === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {isResident && (
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5">戶號</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={building} onChange={e => setBuilding(e.target.value)} className="h-9 px-2 rounded-lg border border-stone-200 text-sm bg-white text-stone-700">
                      <option value="">棟別</option>
                      {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={unitNumber} onChange={e => setUnitNumber(e.target.value)} className="h-9 px-2 rounded-lg border border-stone-200 text-sm bg-white text-stone-700">
                      <option value="">號數</option>
                      {UNIT_NUMBERS.map(n => <option key={n} value={n}>{n}號</option>)}
                    </select>
                    <select value={floor} onChange={e => setFloor(e.target.value)} className="h-9 px-2 rounded-lg border border-stone-200 text-sm bg-white text-stone-700">
                      <option value="">樓層</option>
                      {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={subUnit} onChange={e => setSubUnit(e.target.value)} className="h-9 px-2 rounded-lg border border-stone-200 text-sm bg-white text-stone-700">
                      <option value="">幾之幾</option>
                      <option value="none">無</option>
                      {SUB_UNITS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {roomNumber && <p className="mt-2 text-xs text-stone-500">房號：<span className="font-medium text-stone-700">{roomNumber}</span></p>}
                </div>
              )}
            </>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-center gap-4 p-5 border-t border-stone-100">
          <button type="button" onClick={onClose} aria-label="取消"
            className="w-11 h-11 flex items-center justify-center rounded-full border border-stone-300 text-stone-500 hover:bg-stone-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
          <button type="button" onClick={handleConfirm} disabled={saving} aria-label="確認新增"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /></svg>
          </button>
        </div>
        {saving && <p className="text-center text-xs text-stone-400 pb-3">新增中...</p>}
      </div>
    </div>
  )
}
