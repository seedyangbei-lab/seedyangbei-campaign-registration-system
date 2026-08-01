'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { BUILDINGS, UNIT_NUMBERS, SUB_UNITS, getFloors, formatRoomNumber } from '@/lib/address'

type ExistingUser = { id: string; name: string; room_number: string; line_id?: string | null }
type CreatedReg = { id: string; status: string; is_walk_in: boolean; users: ExistingUser }

// 搜尋結果可能來自兩張表：
// - users：曾經完整報名過（前臺報名表單或現場報到建過檔）
// - line_members：LINE 官方帳號的會員，但可能從沒報名過任何一堂課，users 表裡還沒有他的紀錄
type Candidate = { key: string; name: string; roomNumber: string; lineId?: string | null; source: 'user' | 'line_member' }

// 已加入本次現場報到批次、但尚未寫入資料庫的暫存名單
type PendingItem = {
  key: string
  name: string
  roomNumber: string
  isResident: boolean
  existingUserId?: string   // 選自 users 表既有紀錄
  lineMemberId?: string     // 選自 line_members（尚未有 users 紀錄，確認時才建檔）
  lineId?: string | null
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

// 現場報到（無網路報名居民）：中台／後台簽到彈窗共用同一個新增視窗（對照 Figma node 477:19724）
// - 姓名輸入同時是搜尋框：同時查 users（曾報名過）與 line_members（LINE 會員，可能還沒報名過），有既有紀錄就直接選用
// - 點選搜尋結果 → 直接加入下方「本次新增名單」暫存清單（不立即寫入資料庫），可移除（X）
// - 找不到才走「新建」：身份（住戶／非社區住戶）＋ 房號，填完按「加入名單」暫存
// - 全部加入暫存名單後，按「確認新增」才一次寫入資料庫；新增後直接視為「已出席」
export default function WalkInRegistrationModal({
  courseId, courseTitle, existingUserIds = [], onClose, onConfirmed,
}: {
  courseId: string
  courseTitle?: string
  existingUserIds?: string[]
  onClose: () => void
  onConfirmed: (regs: CreatedReg[]) => void
}) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [isResident, setIsResident] = useState(true)
  const [building, setBuilding] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [floor, setFloor] = useState('')
  const [subUnit, setSubUnit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [pendingList, setPendingList] = useState<PendingItem[]>([])

  const isDuplicateCandidate = (c: Candidate) => {
    if (c.source === 'user' && existingUserIds.includes(c.key)) return true
    return pendingList.some(p =>
      (c.source === 'user' && p.existingUserId === c.key) ||
      (c.source === 'line_member' && p.lineMemberId === c.key)
    )
  }

  const runSearch = async (q: string) => {
    if (!q) { setSuggestions([]); return }
    // users 表 RLS 對匿名讀取是開放的，可以直接查；line_members 沒有開放匿名讀取（跟後台會員頁一樣走 service role），
    // 所以另外打一支用 service role 查的 API，才能搜到「是 LINE 會員但沒報名過活動」的人
    const [{ data: userRows }, memberRows] = await Promise.all([
      supabase.from('users').select('id, name, room_number, line_id').ilike('name', `%${q}%`).limit(6),
      fetch(`/api/search-members?q=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : []).catch(() => []) as Promise<{ line_user_id: string; display_name: string | null; building: string | null; unit_number: string | null; floor_number: string | null }[]>,
    ])
    const userLineIds = new Set((userRows || []).map(u => u.line_id).filter(Boolean))
    const userCandidates: Candidate[] = (userRows || []).map(u => ({
      key: u.id, name: u.name, roomNumber: u.room_number, lineId: u.line_id, source: 'user',
    }))
    // line_members 若已經有對應的 users 紀錄，會在上面查到，這裡排除掉避免同一個人出現兩次
    const memberCandidates: Candidate[] = (memberRows || [])
      .filter(m => !userLineIds.has(m.line_user_id))
      .map(m => ({
        key: m.line_user_id,
        name: m.display_name || 'LINE 會員',
        roomNumber: m.building && m.unit_number && m.floor_number ? `${m.building} ${m.unit_number}-${m.floor_number}F` : 'LINE 會員（尚未報名過活動）',
        lineId: m.line_user_id,
        source: 'line_member',
      }))
    const merged = [...userCandidates, ...memberCandidates].filter(c => !isDuplicateCandidate(c))
    setSuggestions(merged.slice(0, 8))
  }

  // 輸入時自動搜尋（防手震縮短為 150ms，加快回饋速度），旁邊的搜尋按鈕可以立即觸發，不用等
  useEffect(() => {
    if (selected) { setSuggestions([]); return }
    const q = query.trim()
    if (!q) { setSuggestions([]); return }
    let active = true
    const t = setTimeout(() => { if (active) runSearch(q) }, 150)
    return () => { active = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selected])

  const roomNumber = isResident ? formatRoomNumber(building, unitNumber, floor, subUnit) : '非社宅居民'

  const resetForNextEntry = () => {
    setQuery('')
    setSelected(null)
    setSuggestions([])
    setIsResident(true)
    setBuilding('')
    setUnitNumber('')
    setFloor('')
    setSubUnit('')
  }

  // 點選搜尋結果 → 直接加入暫存名單，不寫入資料庫
  const handlePickCandidate = (c: Candidate) => {
    setError('')
    if (isDuplicateCandidate(c)) { setError('這位居民已經在名單中了'); return }
    setPendingList(list => [...list, {
      key: `${c.source}-${c.key}-${Date.now()}`,
      name: c.name,
      roomNumber: c.roomNumber,
      isResident: true,
      existingUserId: c.source === 'user' ? c.key : undefined,
      lineMemberId: c.source === 'line_member' ? c.key : undefined,
      lineId: c.lineId ?? null,
    }])
    resetForNextEntry()
  }

  const removePending = (key: string) => setPendingList(list => list.filter(p => p.key !== key))

  // 表單有內容（正在輸入新的一位）時，「確認新增」先把這一位收進暫存名單；
  // 表單清空時，同一顆按鈕才會真的把整份暫存名單一次寫入資料庫
  const handleFooterClick = async () => {
    setError('')
    const hasFormData = !!selected || !!query.trim()

    if (hasFormData) {
      if (selected) { handlePickCandidate(selected); return }
      if (isResident && !roomNumber) { setError('請填寫完整戶號（棟別／號數／樓層／幾之幾）'); return }
      setPendingList(list => [...list, {
        key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: query.trim(),
        roomNumber,
        isResident,
      }])
      resetForNextEntry()
      return
    }

    if (pendingList.length === 0) { setError('請先加入至少一位'); return }
    setSaving(true)

    const created: CreatedReg[] = []
    const failedNames: string[] = []

    for (const p of pendingList) {
      let userRow: ExistingUser | null = null

      if (p.existingUserId) {
        userRow = { id: p.existingUserId, name: p.name, room_number: p.roomNumber, line_id: p.lineId }
      } else if (p.lineMemberId) {
        // LINE 會員尚未有 users 紀錄：先查一次避免競態重複建檔，查不到才新建
        const { data: found } = await supabase.from('users').select('id, name, room_number, line_id').eq('line_id', p.lineMemberId).maybeSingle()
        if (found) {
          userRow = found
        } else {
          const { data: newUser, error: userErr } = await supabase.from('users')
            .insert({ name: p.name, room_number: p.roomNumber, line_id: p.lineMemberId })
            .select('id, name, room_number, line_id')
            .single()
          if (userErr || !newUser) { failedNames.push(p.name); continue }
          userRow = newUser
        }
      } else {
        const { data: newUser, error: userErr } = await supabase.from('users')
          .insert({ name: p.name, room_number: p.roomNumber })
          .select('id, name, room_number, line_id')
          .single()
        if (userErr || !newUser) { failedNames.push(p.name); continue }
        userRow = newUser
      }

      const { data: newReg, error: regErr } = await supabase.from('registrations')
        .insert({
          user_id: userRow.id, course_id: courseId, status: 'attended',
          is_social_housing_resident: p.isResident,
          is_walk_in: true,
        })
        .select('id, status, is_walk_in')
        .single()

      if (regErr || !newReg) { failedNames.push(p.name); continue }

      if (userRow.line_id) {
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationId: newReg.id, courseTitle: courseTitle || '', lineUserId: userRow.line_id, action: 'attend' }),
        }).catch(() => {})
      }

      created.push({ ...newReg, users: userRow })
    }

    setSaving(false)

    if (failedNames.length > 0) {
      setError(`部分新增失敗（可能已報名過）：${failedNames.join('、')}`)
      setPendingList(list => list.filter(p => failedNames.includes(p.name)))
    } else {
      setPendingList([])
    }

    if (created.length > 0) onConfirmed(created)
    if (failedNames.length === 0) onClose()
  }

  const footerLabel = saving
    ? '新增中...'
    : (selected || query.trim())
      ? '加入名單'
      : pendingList.length > 0
        ? `確認新增 ${pendingList.length} 位`
        : '確認新增'

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto pt-8">
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-2 right-2 flex items-center justify-center size-7 rounded-full border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition-colors">
          <CloseIcon />
        </button>

        <div className="flex flex-col gap-4 px-4">
          <h4 className="pb-[17px] border-b border-stone-100 text-xl font-bold text-stone-600">現場新增報到</h4>

          <div className="relative flex flex-col gap-2">
            <label className="text-sm font-medium text-stone-600"><span className="text-orange-500">* </span>姓名</label>
            {selected ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-md px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{selected.name}</p>
                  <p className="text-xs text-stone-500 truncate">{selected.roomNumber}{selected.source === 'line_member' ? '（LINE 會員）' : '（既有紀錄）'}</p>
                </div>
                <button type="button" onClick={() => { setSelected(null); setQuery('') }} className="text-xs text-stone-400 hover:text-stone-600 shrink-0 ml-2">
                  清除
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="輸入姓名搜尋既有紀錄，或直接新增"
                    className="w-full border border-stone-200 rounded-md pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 placeholder:text-stone-400"
                  />
                  <SearchIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                </div>
                {suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map(c => (
                      <button key={c.key + c.source} type="button" onClick={() => handlePickCandidate(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors border-b border-stone-50 last:border-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm text-stone-700">{c.name}</p>
                          {c.source === 'line_member' && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">LINE 會員</span>}
                        </div>
                        <p className="text-xs text-stone-400">{c.roomNumber}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {!selected && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-600"><span className="text-orange-500">* </span>身份</label>
                <div className="flex gap-2">
                  {[{ v: true, l: '住戶' }, { v: false, l: '非社區住戶' }].map(opt => (
                    <button key={String(opt.v)} type="button" onClick={() => setIsResident(opt.v)}
                      className={`flex-1 h-8 rounded-md border text-sm font-medium transition-colors ${isResident === opt.v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {isResident && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-stone-500">戶號</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-xs text-stone-500">棟別</p>
                        <div className="relative">
                          <select value={building} onChange={e => { setBuilding(e.target.value); setFloor('') }}
                            className="w-full appearance-none px-3 py-2 rounded-md border border-stone-200 text-xs bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                            <option value="">請選擇</option>
                            {BUILDINGS.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-xs text-stone-500">號數</p>
                        <div className="relative">
                          <select value={unitNumber} onChange={e => setUnitNumber(e.target.value)}
                            className="w-full appearance-none px-3 py-2 rounded-md border border-stone-200 text-xs bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                            <option value="">請選擇</option>
                            {UNIT_NUMBERS.map(n => <option key={n} value={n}>{n}號</option>)}
                          </select>
                          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-xs text-stone-500">樓層</p>
                        <div className="relative">
                          <select value={floor} onChange={e => setFloor(e.target.value)}
                            className="w-full appearance-none px-3 py-2 rounded-md border border-stone-200 text-xs bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                            <option value="">請選擇</option>
                            {getFloors(building).map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="text-xs text-stone-500">幾之幾</p>
                        <div className="relative">
                          <select value={subUnit} onChange={e => setSubUnit(e.target.value)}
                            className="w-full appearance-none px-3 py-2 rounded-md border border-stone-200 text-xs bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
                            <option value="">請選擇</option>
                            <option value="none">無</option>
                            {SUB_UNITS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                  {roomNumber && (
                    <div className="bg-stone-100 border border-stone-300 rounded-md p-2">
                      <p className="text-[10px] text-stone-500">房號</p>
                      <p className="text-sm font-bold text-stone-700">{roomNumber}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {pendingList.length > 0 && (
            <>
              <div className="border-t border-stone-100" />
              <div className="flex flex-col gap-2 pb-1">
                {pendingList.map(p => (
                  <div key={p.key} className="bg-stone-50 border border-stone-100 rounded-xl p-2 flex gap-3 items-center">
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-stone-700 truncate">{p.name}</p>
                      <p className="text-xs text-stone-500 truncate">{p.roomNumber}</p>
                    </div>
                    <button type="button" onClick={() => removePending(p.key)} aria-label="移除"
                      className="shrink-0 flex items-center justify-center size-[18px] rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-500 pb-1">{error}</p>}
        </div>

        <div className="mt-4 border-t border-stone-100 p-5">
          <button type="button" onClick={handleFooterClick} disabled={saving}
            className="w-full h-[42px] bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium text-sm rounded-lg transition-colors">
            {footerLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
