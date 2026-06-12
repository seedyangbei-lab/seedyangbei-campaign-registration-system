import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { registrationId, lineUserId } = await req.json()
  if (!registrationId || !lineUserId) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  // 確認這筆報名屬於這個 LINE 用戶
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status, course_id, users!inner(line_id), courses(date, time_start)')
    .eq('id', registrationId)
    .maybeSingle()

  if (!reg) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if ((reg.users as any)?.line_id !== lineUserId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 確認課程尚未開始
  const course = reg.courses as any
  if (course) {
    const startDt = new Date(`${course.date}T${course.time_start}`)
    if (startDt <= new Date()) {
      return NextResponse.json({ error: 'course_started' }, { status: 400 })
    }
  }

  await supabase
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('id', registrationId)

  return NextResponse.json({ ok: true })
}
