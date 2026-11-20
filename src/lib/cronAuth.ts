import { timingSafeEqual } from 'crypto'

// Vercel Cron 會帶 Authorization: Bearer <CRON_SECRET>。
// 原本寫法是 header === `Bearer ${process.env.CRON_SECRET}`：環境變數沒設定時，
// 任何人送 "Bearer undefined" 就能通過。這裡在密鑰沒設定時一律拒絕，並用固定時間比對。
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const actual = Buffer.from(header)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
