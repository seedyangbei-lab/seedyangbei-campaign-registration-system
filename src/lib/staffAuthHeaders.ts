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
