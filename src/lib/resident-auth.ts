// 居民登入效期 180 天：居民很多是長輩，重新走 LINE 登入對他們是負擔。
// 拿到居民 token 只能看／改「本人」的報名紀錄，碰不到其他人的資料或後台，所以可以放寬；
// 另外只要有在使用，前台每天會自動換一張新的 180 天 token（見 refreshResidentTokenIfNeeded），
// 等於半年內來過一次就不用重新登入。後台／講師端的效期不受影響。
export const RESIDENT_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000 // token 簽出超過一天就在使用時續期，避免每次開頁面都打 API

export function getResidentToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('line_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.residentToken || null
  } catch {
    return null
  }
}

// 伺服器簽的 residentToken 只有 12 小時效期（格式：lineUserId.到期時間.簽章），但 localStorage 裡的
// line_user 會一直留著，而且在 resident token 上線前登入的居民，存的資料根本沒有 token。
// 以前前台只看 localStorage 有沒有 line_user 就當作已登入：導覽列一直顯示已登入，
// 選完課也直接跳過 LINE 登入進報名表，填完送出才被伺服器擋下「登入已過期」。
// 這裡只在前端粗略檢查 token 格式跟到期時間（簽章仍由伺服器驗證），過期就當作已登出。
const EXPIRY_BUFFER_MS = 5 * 60 * 1000 // 預留 5 分鐘緩衝，避免剛好在填表途中過期

export function residentTokenExpiresAt(token: string | null | undefined): number | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const expires = Number(parts[1])
  return Number.isFinite(expires) ? expires : null
}

function isStoredUserValid(user: any): boolean {
  const expires = residentTokenExpiresAt(user?.residentToken)
  return expires !== null && Date.now() < expires - EXPIRY_BUFFER_MS
}

// 取得目前有效的居民登入資料；登入已過期（或舊登入沒有 token）就直接清掉本機登入狀態並回傳 null
export function getStoredLineUser(): any | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('line_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    if (isStoredUserValid(user)) return user
    localStorage.removeItem('line_user')
    return null
  } catch {
    try { localStorage.removeItem('line_user') } catch { /* ignore */ }
    return null
  }
}

// 距離登入過期（含緩衝）還有多少毫秒；沒有有效登入時回傳 null。導覽列用來排程自動登出
export function msUntilResidentLogout(): number | null {
  const user = getStoredLineUser()
  if (!user) return null
  const expires = residentTokenExpiresAt(user.residentToken)
  return expires === null ? null : Math.max(0, expires - EXPIRY_BUFFER_MS - Date.now())
}

// 有在使用就續期：token 簽出超過一天，就用目前的 token 向伺服器換一張新的 180 天 token。
// 伺服器會先驗證舊 token 仍有效才簽新的，所以不會延長已過期或偽造的登入。回傳是否有更新
export async function refreshResidentTokenIfNeeded(): Promise<boolean> {
  const user = getStoredLineUser()
  if (!user) return false
  const expires = residentTokenExpiresAt(user.residentToken)
  if (expires === null || expires - Date.now() > RESIDENT_TOKEN_TTL_MS - REFRESH_AFTER_MS) return false
  try {
    const res = await fetch('/api/resident/refresh', { method: 'POST', headers: { 'x-resident-token': user.residentToken } })
    if (!res.ok) return false
    const { residentToken } = await res.json()
    if (!residentToken) return false
    localStorage.setItem('line_user', JSON.stringify({ ...user, residentToken }))
    return true
  } catch {
    return false
  }
}
