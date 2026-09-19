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
