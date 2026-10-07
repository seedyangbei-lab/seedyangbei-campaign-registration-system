import { NextRequest, NextResponse } from 'next/server'
import { signResidentToken, verifyResidentToken } from '@/lib/resident-auth-server'

// 居民登入續期：用目前還有效的 resident token 換一張新的（效期重新計算）。
// 只接受簽章正確、尚未過期的 token，所以已過期或偽造的登入無法靠這支延長，只能重新走 LINE 登入。
export async function POST(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })
  return NextResponse.json({ residentToken: signResidentToken(lineUserId) })
}
