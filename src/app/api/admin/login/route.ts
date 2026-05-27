import { NextRequest, NextResponse } from 'next/server'

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

  const token = `${Date.now()}.${Math.random().toString(36).slice(2)}`
  const expires = Date.now() + 8 * 60 * 60 * 1000 // 8 小時

  return NextResponse.json({ token, expires })
}
