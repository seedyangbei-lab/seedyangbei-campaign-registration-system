import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken } from '@/lib/admin-auth-server'

export async function POST(req: NextRequest) {
  const { account, password } = await req.json()

  const validAccount = process.env.ADMIN_ACCOUNT
  const validPassword = process.env.ADMIN_PASSWORD

  if (!validAccount || !validPassword) {
    return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 })
  }

  if (account !== validAccount || password !== validPassword) {
    return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
  }

  const { token, expires } = signAdminToken()

  return NextResponse.json({ token, expires })
}
