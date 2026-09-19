import { createHmac, timingSafeEqual } from 'crypto'

// 講師端跟後台一樣，原本完全沒有伺服器端能驗證的登入憑證：LINE callback 驗證完身份後，
// 只是把 { lineUserId, displayName, pictureUrl } 這包資料原封不動塞進網址參數，
// 前端存進 localStorage 就直接信任，之後每個操作都沒有辦法回頭證明「這真的是當初 LINE 登入驗證過的那個人」。
// 這裡比照後台的做法，但額外把 instructorId 簽進 token 裡（而不是讓前端自己宣告要改哪個講師的資料），
// 之後 API route 只信任從簽章裡解出來的 instructorId，不會相信前端傳來的任何講師 id。
const SECRET = process.env.INSTRUCTOR_TOKEN_SECRET || ''

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function signInstructorToken(instructorId: string, ttlMs = 12 * 60 * 60 * 1000): string {
  const expires = Date.now() + ttlMs
  const payload = `${instructorId}.${expires}`
  return `${payload}.${sign(payload)}`
}

// 驗證通過回傳 instructorId，否則回傳 null——呼叫端一律用回傳值當作「這個請求真正的講師身份」，
// 絕對不要另外相信 request body／query 裡任何自稱的 instructorId。
export function verifyInstructorToken(token: string | null | undefined): string | null {
  if (!token || !SECRET) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [instructorId, expiresStr, sig] = parts
  if (!instructorId || !expiresStr || !sig) return null

  const payload = `${instructorId}.${expiresStr}`
  const expected = sign(payload)
  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null

  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null

  return instructorId
}
