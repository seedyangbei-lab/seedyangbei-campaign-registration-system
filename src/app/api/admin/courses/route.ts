import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'

// 後台新增課程：原本後台直接用瀏覽器的 anon key 寫 courses 表，
// 這裡改成先驗證後台登入 token，再用 service_role key 代寫，
// 之後 courses 表才能把 anon 的寫入權限收掉（前提是講師端也搬完，courses 目前還被講師端直接寫）。
export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await req.json()
  const supabase = createServerClient()
  const { data, error } = await supabase.from('courses').insert(payload).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ course: data })
}
