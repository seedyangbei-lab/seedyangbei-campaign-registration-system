import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

// 講師取消／永久刪除學員報名：原本前端直接用 anon key 寫 registrations 表，
// 任何講師都能改任何一堂課的報名紀錄。這裡先查這筆報名屬於哪堂課，
// 確認該課程的 instructor_ids 裡有 token 解出來的 instructorId 才放行。
async function assertOwnsRegistration(instructorId: string, registrationId: string) {
  const supabase = createServerClient()
  const { data: reg } = await supabase.from('registrations').select('course_id').eq('id', registrationId).maybeSingle()
  if (!reg) return { ok: false as const, status: 404, error: 'Registration not found' }
  const { data: course } = await supabase.from('courses').select('instructor_ids').eq('id', reg.course_id).maybeSingle()
  if (!course || !(course.instructor_ids || []).includes(instructorId)) {
    return { ok: false as const, status: 403, error: 'Forbidden' }
  }
  return { ok: true as const, supabase }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()
  if (status !== 'cancelled') return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const check = await assertOwnsRegistration(instructorId, id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { error } = await check.supabase.from('registrations').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const check = await assertOwnsRegistration(instructorId, id)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const { error } = await check.supabase.from('registrations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
