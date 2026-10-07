// instructors 表可以公開的欄位（首頁課程卡片、講師名單、海報都會用到）。
// line_user_id（綁定的 LINE 帳號）、claim_token／claim_token_expires_at（綁定邀請碼）不在這裡：
// 前端 anon key 讀不到，只能透過驗證過的 API 由伺服器端處理。
// 資料庫的欄位權限（sql/2026-09-30_lock_down_instructors.sql）要跟這份清單保持一致。
export const INSTRUCTOR_PUBLIC_COLUMNS = 'id, name, bio, avatar_url, phone, line_id, is_active, created_at, updated_at, poster_settings'

// 後台講師管理可以改的欄位（綁定的 LINE 帳號、邀請碼不在這裡，只能透過邀請連結流程或「解除綁定」異動）
const ADMIN_EDITABLE = ['name', 'bio', 'avatar_url', 'phone', 'line_id', 'is_active'] as const

export function pickAdminEditable(body: any) {
  const out: Record<string, any> = {}
  for (const key of ADMIN_EDITABLE) if (body && key in body) out[key] = body[key]
  return out
}
