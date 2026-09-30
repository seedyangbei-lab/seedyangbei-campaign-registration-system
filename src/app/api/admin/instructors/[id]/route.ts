import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { pickAdminEditable } from '@/lib/instructorColumns'

// 後台編輯講師資料／解除綁定。解除綁定只接受 { unbind: true }，
// 不接受任意指定 line_user_id，綁定一律只能透過邀請連結 + LINE 登入完成。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const update = pickAdminEditable(body)
  if (body?.unbind === true) update.line_user_id = null
  if ('name' in update && !String(update.name || '').trim()) {
    return NextResponse.json({ error: '姓名不能是空白' }, { status: 400 })
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase.from('instructors').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServerClient()
  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
