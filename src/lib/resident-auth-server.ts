import { createHmac, timingSafeEqual } from 'crypto'

// 居民端原本完全沒有伺服器端能驗證的登入憑證：LINE callback 驗證完身份後，
// 只是把 { lineUserId, displayName, pictureUrl } 這包資料原封不動塞進網址參數，
// 前端存進 localStorage 就直接信任。/register 送出報名時，前端又把這個
// 自己宣告的 lineUserId 直接當參數傳給 supabase 寫 users／registrations，
// 等於任何人都能偽造 lineUserId 冒用、竄改別人的居民資料或報名紀錄。
// 比照講師/後台的做法，在 LINE callback 簽出一個綁定 lineUserId 的 token，
// 之後 /api/register 只信任從簽章裡解出來的 lineUserId，不相信前端傳來的任何身份宣告。
const SECRET = process.env.RESIDENT_TOKEN_SECRET || ''

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function signResidentToken(lineUserId: string, ttlMs = 12 * 60 * 60 * 1000): string {
  const expires = Date.now() + ttlMs
  const payload = `${lineUserId}.${expires}`
  return `${payload}.${sign(payload)}`
}

// 驗證通過回傳 lineUserId，否則回傳 null——呼叫端一律用回傳值當作「這個請求真正的居民身份」，
// 絕對不要另外相信 request body 裡任何自稱的 lineUserId。
export function verifyResidentToken(token: string | null | undefined): string | null {
  if (!token || !SECRET) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [lineUserId, expiresStr, sig] = parts
  if (!lineUserId || !expiresStr || !sig) return null

  const payload = `${lineUserId}.${expiresStr}`
  const expected = sign(payload)
  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null

  const expires = Number(expiresStr)
  if (!Number.isFinite(expires) || Date.now() > expires) return null

  return lineUserId
}
