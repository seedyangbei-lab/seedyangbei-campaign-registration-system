import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { INSTRUCTOR_PUBLIC_COLUMNS, pickAdminEditable } from '@/lib/instructorColumns'

// 後台講師管理：原本前端用 anon key 直接讀寫 instructors 表，任何人都能新增／刪除講師、
// 或把某位講師的 line_user_id 改成自己的 LINE 帳號冒充講師登入中台。改成必須帶後台 token。
// 讀取時不回傳邀請碼本身，只回傳「是否已綁定」「是否有未過期的邀請連結」，邀請碼只在產生當下給一次。
export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('instructors')
    .select(`${INSTRUCTOR_PUBLIC_COLUMNS}, line_user_id, claim_token, claim_token_expires_at`)
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  return NextResponse.json((data || []).map(({ line_user_id, claim_token, claim_token_expires_at, ...rest }) => ({
    ...rest,
    is_bound: !!line_user_id,
    has_active_claim: !!claim_token && !!claim_token_expires_at && new Date(claim_token_expires_at).getTime() > now,
  })))
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = pickAdminEditable(await req.json().catch(() => ({})))
  if (!String(payload.name || '').trim()) return NextResponse.json({ error: '姓名不能是空白' }, { status: 400 })
  const supabase = createServerClient()
  const { error } = await supabase.from('instructors').insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
