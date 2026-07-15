'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BUILDINGS, UNIT_NUMBERS, FLOORS, SUB_UNITS, formatRoomNumber } from '@/lib/address'

type ExistingUser = { id: string; name: string; room_number: string; line_id?: string | null }
type CreatedReg = { id: string; status: string; is_walk_in: boolean; users: ExistingUser }

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

// 現場報到（無網路報名居民）：中台／後台簽到彈窗共用同一個新增視窗（對照 Figma node 471:19309）
// - 姓名輸入同時是搜尋框：先查有沒有既有紀錄（例如之前線上報名過、或已是 LINE 會員），有的話直接選用，不重複建檔
// - 找不到才走「新建」：身份（住戶／非社區住戶）＋ 房號（棟別/號數/樓層/幾之幾，格式與樣式與 /register 報名表單一致）
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

  const runSearch = async (q: string) => {
    if (!q) { setSuggestions([]); return }
    const { data } = await supabase.from('users').select('id, name, room_number, line_id').ilike('name', `%${q}%`).limit(6)
    setSuggestions(data || [])
  }

  // 輸入時自動搜尋（防手震），旁邊的搜尋按鈕可以立即觸發，不用等
  useEffect(() => {
    if (selected) { setSuggestions([]); return }
    const q = query.trim()
    if (!q) { setSuggestions([]); return }
    let active = true
    const t = setTimeout(() => { if (active) runSearch(q) }, 300)
    return () => { active = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h4 className="font-bold text-stone-800 text-lg">現場新增報到</h4>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors" aria-label="關閉">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="relative">
            <label className="block text-base font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>姓名</label>
            {selected ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-base font-medium text-stone-800 truncate">{selected.name}</p>
                  <p className="text-sm text-stone-500 truncate">{selected.room_number}（既有紀錄）</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setQuery('') }} className="text-sm text-stone-400 hover:text-stone-600 shrink-0 ml-2">
                  清除
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="輸入姓名搜尋既有紀錄，或直接新增"
                    className="flex-1 min-w-0 border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <button type="button" onClick={() => runSearch(query.trim())} aria-label="搜尋"
                    className="shrink-0 w-12 flex items-center justify-center border border-stone-300 rounded-xl text-stone-500 hover:bg-stone-50 transition-colors">
                    <SearchIcon />
                  </button>
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map(u => (
                      <button key={u.id} type="button" onClick={() => { setSelected(u); setSuggestions([]) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors border-b border-stone-50 last:border-0">
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
                <label className="block text-base font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>身份</label>
                <div className="flex gap-3">
                  {[{ v: true, l: '住戶' }, { v: false, l: '非社區住戶' }].map(opt => (
                    <button key={String(opt.v)} type="button" onClick={() => setIsResident(opt.v)}
                      className={`flex-1 h-[50px] rounded-[10px] border text-base font-medium transition-colors ${isResident === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {isResident && (
                <div>
                  <label className="block text-base font-medium text-stone-700 mb-2"><span className="text-orange-500">* </span>戶號</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <select value={building} onChange={e => setBuilding(e.target.value)}
                        className="w-full appearance-none h-12 px-3 rounded-lg border border-stone-200 text-base bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="">棟別</option>
                        {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    <div className="relative">
                      <select value={unitNumber} onChange={e => setUnitNumber(e.target.value)}
                        className="w-full appearance-none h-12 px-3 rounded-lg border border-stone-200 text-base bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="">號數</option>
                        {UNIT_NUMBERS.map(n => <option key={n} value={n}>{n}號</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    <div className="relative">
                      <select value={floor} onChange={e => setFloor(e.target.value)}
                        className="w-full appearance-none h-12 px-3 rounded-lg border border-stone-200 text-base bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="">樓層</option>
                        {FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                    <div className="relative">
                      <select value={subUnit} onChange={e => setSubUnit(e.target.value)}
                        className="w-full appearance-none h-12 px-3 rounded-lg border border-stone-200 text-base bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                        <option value="">幾之幾</option>
                        <option value="none">無</option>
                        {SUB_UNITS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                  {roomNumber && (
                    <div className="mt-3 bg-stone-100 border border-stone-300 rounded-lg p-2.5">
                      <p className="text-xs text-stone-500">房號</p>
                      <p className="text-base font-bold text-stone-800">{roomNumber}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="button" onClick={handleConfirm} disabled={saving}
            className="w-full h-[50px] bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium text-base rounded-[10px] transition-colors">
            {saving ? '新增中...' : '確認新增'}
          </button>
        </div>
      </div>
    </div>
  )
}
