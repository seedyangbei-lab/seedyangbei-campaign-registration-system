export function getInstructorToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('instructor_line_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.instructorToken || null
  } catch {
    return null
  }
}

// localStorage 裡的講師登入狀態會一直留著，但伺服器簽的 instructorToken 只有 12 小時效期，
// 而且在改走驗證 API 之前就登入的講師，存的資料根本沒有 token。
// 以前前端只看 lineUserId 就當作已登入，結果畫面一切正常、按儲存才跳「更新失敗：Unauthorized」。
// 這裡只在前端粗略檢查 token 格式跟到期時間（簽章仍由伺服器驗證），過期就請講師重新 LINE 登入。
export function hasValidInstructorToken(): boolean {
  const token = getInstructorToken()
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const expires = Number(parts[1])
  // 預留 5 分鐘緩衝，避免剛好在編輯途中過期
  return Number.isFinite(expires) && Date.now() < expires - 5 * 60 * 1000
}

export function clearInstructorSession() {
  try { localStorage.removeItem('instructor_line_user') } catch { /* ignore */ }
}
