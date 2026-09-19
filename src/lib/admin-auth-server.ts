import { createHmac, timingSafeEqual } from 'crypto'

// 舊版後台 token 是 `${Date.now()}.${亂數}`，伺服器端從來沒驗證過內容（甚至沒存起來比對），
// 等於誰都能自己捏一個字串當 token 用。這裡改成伺服器簽章：token 內容是「到期時間.HMAC 簽章」，
// 沒有 ADMIN_TOKEN_SECRET 就簽不出合法簽章，其他 API route 才能真的驗證「這確實是登入時發出去的」。
const SECRET = process.env.ADMIN_TOKEN_SECRET || ''

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function signAdminToken(ttlMs = 8 * 60 * 60 * 1000): { token: string; expires: number } {
  const expires = Date.now() + ttlMs
  const payload = String(expires)
  return { token: `${payload}.${sign(payload)}`, expires }
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || !SECRET) return false
  const dot = token.lastIndexOf('.')
  if (dot < 0) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(payload)

  const sigBuf = Buffer.from(sig, 'hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false

  const expires = Number(payload)
  if (!Number.isFinite(expires) || Date.now() > expires) return false
  return true
}
