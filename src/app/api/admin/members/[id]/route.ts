import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'

// 後台會員管理編輯：原本前端直接用 anon key 寫 users／line_members 表（含姓名、房號等個資）。
// 用 body.table 分流兩種來源（未綁定 LINE 的居民 vs. 已綁定的 LINE 會員），
// 對應原本 admin/members/page.tsx handleSave 的兩個分支。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const supabase = createServerClient()

  if (body.table === 'users') {
    const { error } = await supabase.from('users').update({ room_number: body.room_number ?? null }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.table === 'line_members') {
    const { error } = await supabase.from('line_members').update({
      building: body.building ?? null,
      unit_number: body.unit_number ?? null,
      floor_number: body.floor_number ?? null,
      notes: body.notes ?? null,
    }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
}

// 刪除未綁定 LINE 的居民紀錄（打錯、重複建檔）。只開放刪沒有任何報名紀錄的人，
// 有報名紀錄的應該用「合併到 LINE 會員」，不然出席紀錄會跟著不見
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServerClient()

  const { data: user } = await supabase.from('users').select('id, line_id').eq('id', id).maybeSingle()
  if (!user) return NextResponse.json({ error: '找不到這筆紀錄' }, { status: 404 })
  if (user.line_id) return NextResponse.json({ error: '已綁定 LINE 的會員不能從這裡刪除' }, { status: 400 })

  const { count } = await supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('user_id', id)
  if (count && count > 0) {
    return NextResponse.json({ error: `這筆紀錄還有 ${count} 筆報名紀錄，請改用「合併到 LINE 會員」` }, { status: 400 })
  }

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
