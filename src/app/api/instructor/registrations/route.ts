import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

// 講師讀取自己課程的報名名單（出席點名、報名紀錄）：原本講師中台是前端用 anon key
// 直接查 registrations＋users，資料庫層沒有任何身份檢查，任何人都能讀到所有課程的居民個資。
// 改成從講師 token 解出 instructorId，確認這堂課的 instructor_ids 包含本人才回傳。
const ALLOWED_STATUSES = ['confirmed', 'attended', 'absent', 'cancelled']
const SELECT = '*, users(id, name, room_number, phone, age_group, line_id), courses(id, title, date)'

export async function GET(req: NextRequest) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const courseId = sp.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'missing courseId' }, { status: 400 })

  const statuses = (sp.get('statuses') || '').split(',').map(s => s.trim()).filter(Boolean)
  if (statuses.some(s => !ALLOWED_STATUSES.includes(s))) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: course } = await supabase.from('courses').select('instructor_ids').eq('id', courseId).maybeSingle()
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  if (!(course.instructor_ids || []).includes(instructorId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabase.from('registrations').select(SELECT).eq('course_id', courseId)
  if (statuses.length > 0) query = query.in('status', statuses)
  const { data, error } = await query.order('registered_at', { ascending: sp.get('order') === 'asc' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
