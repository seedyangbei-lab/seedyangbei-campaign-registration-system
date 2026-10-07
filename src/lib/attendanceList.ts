// 點名名單每個人只留一筆：同一人在同一堂課可能有多筆紀錄（例如先被標未出席、後來又現場報到；
// 或資料庫加上唯一限制前留下的重複報名）。名單上出現兩次，講師勾到多出來那筆時，
// 資料庫的 registrations_unique_active 會擋下（同一人只能有一筆已報名／已出席）。
// 與其出錯再提示，不如直接不顯示：優先留已出席，其次已報名，都沒有才留最新一筆未出席。
const RANK: Record<string, number> = { attended: 0, confirmed: 1, absent: 2 }

export function onePerPerson<T extends { id: string; status: string; user_id?: string | null; users?: { id?: string } | null; registered_at?: string }>(regs: T[]): T[] {
  const best = new Map<string, T>()
  for (const r of regs) {
    const key = r.user_id || r.users?.id
    if (!key) continue
    const cur = best.get(key)
    if (!cur) { best.set(key, r); continue }
    const a = RANK[r.status] ?? 9, b = RANK[cur.status] ?? 9
    if (a < b || (a === b && (r.registered_at || '') > (cur.registered_at || ''))) best.set(key, r)
  }
  // 維持原本的排序
  return regs.filter(r => {
    const key = r.user_id || r.users?.id
    return !key || best.get(key) === r
  })
}
