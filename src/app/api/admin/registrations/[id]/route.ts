import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'

// 後台取消／永久刪除報名：原本前端直接用 anon key 寫 registrations 表，含真實居民個資的報名紀錄。
// 只接受 status='cancelled'（後台目前唯一會用這支 API 做的狀態異動），縮小誤用/token 外洩時的影響範圍。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { status } = await req.json()
  if (status !== 'cancelled') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const supabase = createServerClient()
  const { error } = await supabase.from('registrations').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServerClient()
  const { error } = await supabase.from('registrations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
