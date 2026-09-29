import { getAdminToken } from './admin-auth'
import { getInstructorToken } from './instructor-auth'

// /api/attendance 後台跟講師中台共用，呼叫端不確定當下是哪一邊在用，
// 兩個 token 只要存在就一起帶，伺服器端會自己驗證、擇一採信。
export function staffAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  const adminToken = getAdminToken()
  const instructorToken = getInstructorToken()
  if (adminToken) headers['x-admin-token'] = adminToken
  if (instructorToken) headers['x-instructor-token'] = instructorToken
  return headers
}

export type FeedbackCounts = { counts: Record<string, { responded: number; attended: number }>; submitted: string[] }

// 課程回饋人數（已填／出席）＋已填回饋的報名 id。讀不到（例如資料表還沒建）就回傳空結果，不影響原本畫面
export async function fetchFeedbackCounts(courseIds: string[]): Promise<FeedbackCounts> {
  const empty = { counts: {}, submitted: [] }
  if (courseIds.length === 0) return empty
  try {
    const res = await fetch('/api/feedback-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...staffAuthHeaders() },
      body: JSON.stringify({ courseIds }),
    })
    if (!res.ok) return empty
    const body = await res.json()
    return { counts: body?.counts || {}, submitted: Array.isArray(body?.submitted) ? body.submitted : [] }
  } catch {
    return empty
  }
}
