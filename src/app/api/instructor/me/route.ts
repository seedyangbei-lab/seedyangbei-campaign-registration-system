import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'
import { INSTRUCTOR_PUBLIC_COLUMNS } from '@/lib/instructorColumns'

// 講師中台「目前登入的講師是誰」：原本各頁面都是拿 localStorage 裡自稱的 lineUserId，
// 用 anon key 查 instructors.line_user_id，這也代表 line_user_id 必須對外公開可讀可篩選。
// 改成從講師 token 解出 instructorId，由伺服器查；line_user_id 從此不必對前端開放。
async function loadSelf(req: NextRequest) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) return null
  const supabase = createServerClient()
  const { data } = await supabase
    .from('instructors')
    .select(`${INSTRUCTOR_PUBLIC_COLUMNS}, line_user_id`)
    .eq('id', instructorId)
    .maybeSingle()
  // 後台解除綁定後，還沒過期的舊 token 也要一併失效
  if (!data || !data.line_user_id) return null
  const { line_user_id: _omit, ...self } = data
  return { supabase, self }
}

export async function GET(req: NextRequest) {
  const ctx = await loadSelf(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(ctx.self)
}

// 講師只能改自己的個人資料與海報樣式設定，其他欄位（啟用狀態、綁定、邀請碼）只有後台能改
const EDITABLE = ['name', 'bio', 'avatar_url', 'phone', 'line_id', 'poster_settings'] as const

export async function PATCH(req: NextRequest) {
  const ctx = await loadSelf(req)
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const update: Record<string, any> = {}
  for (const key of EDITABLE) if (key in body) update[key] = body[key]
  if ('name' in update && !String(update.name || '').trim()) {
    return NextResponse.json({ error: '姓名不能是空白' }, { status: 400 })
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await ctx.supabase.from('instructors').update(update).eq('id', (ctx.self as any).id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
