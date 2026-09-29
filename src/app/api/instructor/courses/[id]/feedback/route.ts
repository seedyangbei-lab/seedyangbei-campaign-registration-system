import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'
import { FEEDBACK_ELIGIBLE_STATUSES, FEEDBACK_FORM_VERSION, feedbackWindow, sanitizeAnswers } from '@/lib/courseFeedback'
import { loadCourseFeedbackDetail } from '@/lib/courseFeedbackServer'

// 講師中台：查看自己課程的回饋（含填寫者姓名），以及幫沒有 LINE 帳號的學員代填。
// 跟其他講師 API 一樣，只信任 token 解出來的 instructorId，並確認這堂課的 instructor_ids 裡有自己。

async function authorize(req: NextRequest, courseId: string) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const supabase = createServerClient()
  const { data: course } = await supabase.from('courses').select('id, date, time_start, instructor_ids').eq('id', courseId).maybeSingle()
  if (!course || !(course.instructor_ids || []).includes(instructorId)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { instructorId, supabase, course }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorize(req, id)
  if ('error' in auth) return auth.error

  const detail = await loadCourseFeedbackDetail(auth.supabase, id)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ...detail, window: feedbackWindow(auth.course) })
}

// 代填：只開放給「沒有 LINE 帳號」的學員（有 LINE 的請本人登入填寫，避免講師替居民作答）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await authorize(req, id)
  if ('error' in auth) return auth.error

  const { registrationId, answers } = await req.json().catch(() => ({}))
  const clean = sanitizeAnswers(answers)
  if (!registrationId || !clean) return NextResponse.json({ error: '還有題目沒有填寫' }, { status: 400 })

  const win = feedbackWindow(auth.course)
  if (win === 'not_started') return NextResponse.json({ error: '課程開始後才能填寫回饋' }, { status: 403 })
  if (win === 'closed') return NextResponse.json({ error: '已超過填寫期限' }, { status: 403 })

  const { data: reg } = await auth.supabase
    .from('registrations')
    .select('id, status, course_id, user_id, users(line_id)')
    .eq('id', registrationId)
    .maybeSingle()
  if (!reg || reg.course_id !== id) return NextResponse.json({ error: '找不到這筆報名紀錄' }, { status: 404 })
  if (!FEEDBACK_ELIGIBLE_STATUSES.includes(reg.status)) {
    return NextResponse.json({ error: '這位學員目前無法填寫回饋' }, { status: 403 })
  }
  if ((reg.users as any)?.line_id) {
    return NextResponse.json({ error: '這位學員有 LINE 帳號，請本人登入填寫' }, { status: 403 })
  }

  const { error } = await auth.supabase.from('course_feedbacks').insert({
    ...clean,
    course_id: id,
    registration_id: reg.id,
    user_id: reg.user_id,
    submitted_by: 'instructor',
    proxy_instructor_id: auth.instructorId,
    form_version: FEEDBACK_FORM_VERSION,
  })
  if (error?.code === '23505') return NextResponse.json({ error: '這位學員已經填過回饋了' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
