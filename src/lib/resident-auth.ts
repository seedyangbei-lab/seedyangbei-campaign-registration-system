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
