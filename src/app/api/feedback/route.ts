import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyResidentToken } from '@/lib/resident-auth-server'
import {
  FEEDBACK_ELIGIBLE_STATUSES, FEEDBACK_FORM_VERSION, feedbackWindow, sanitizeAnswers,
} from '@/lib/courseFeedback'
import { FEEDBACK_SELECT } from '@/lib/courseFeedbackServer'

// 居民填寫課程回饋。身份一律從 x-resident-token 解出 lineUserId，
// 報名紀錄是不是本人的、能不能填，全部在伺服器端檢查，不相信前端傳來的任何狀態。

async function getUserId(supabase: ReturnType<typeof createServerClient>, lineUserId: string) {
  const { data } = await supabase.from('users').select('id').eq('line_id', lineUserId).maybeSingle()
  return data?.id as string | undefined
}

async function loadOwnRegistration(supabase: ReturnType<typeof createServerClient>, registrationId: string, userId: string) {
  const { data } = await supabase
    .from('registrations')
    .select('id, status, user_id, course_id, courses(id, title, date, time_start, time_end, location, instructors(name))')
    .eq('id', registrationId)
    .maybeSingle()
  if (!data || data.user_id !== userId) return null
  return data as any
}

// GET ?registrationId=xxx：單筆報名的課程資訊＋已填內容（問卷畫面用）
// GET（不帶參數）：本人已填過回饋的 registration_id 清單（個人頁顯示按鈕狀態用）
export async function GET(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })

  const supabase = createServerClient()
  const userId = await getUserId(supabase, lineUserId)
  const registrationId = req.nextUrl.searchParams.get('registrationId')

  if (!registrationId) {
    if (!userId) return NextResponse.json({ submitted: [] })
    const { data } = await supabase.from('course_feedbacks').select('registration_id').eq('user_id', userId)
    return NextResponse.json({ submitted: (data || []).map(r => r.registration_id) })
  }

  if (!userId) return NextResponse.json({ error: '找不到這筆報名紀錄' }, { status: 404 })
  const reg = await loadOwnRegistration(supabase, registrationId, userId)
  if (!reg || !reg.courses) return NextResponse.json({ error: '找不到這筆報名紀錄' }, { status: 404 })

  const { data: feedback } = await supabase
    .from('course_feedbacks').select(FEEDBACK_SELECT).eq('registration_id', registrationId).maybeSingle()

  const c = reg.courses
  return NextResponse.json({
    registration: { id: reg.id, status: reg.status },
    course: {
      title: c.title, date: c.date, time_start: c.time_start, time_end: c.time_end,
      location: c.location, instructor_name: c.instructors?.name || null,
    },
    feedback: feedback || null,
    window: feedbackWindow(c),
    eligible: FEEDBACK_ELIGIBLE_STATUSES.includes(reg.status),
  })
}

export async function POST(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })

  const { registrationId, answers } = await req.json().catch(() => ({}))
  const clean = sanitizeAnswers(answers)
  if (!registrationId || !clean) return NextResponse.json({ error: '還有題目沒有填寫' }, { status: 400 })

  const supabase = createServerClient()
  const userId = await getUserId(supabase, lineUserId)
  const reg = userId ? await loadOwnRegistration(supabase, registrationId, userId) : null
  if (!reg || !reg.courses) return NextResponse.json({ error: '找不到這筆報名紀錄' }, { status: 404 })

  if (!FEEDBACK_ELIGIBLE_STATUSES.includes(reg.status)) {
    return NextResponse.json({ error: '這堂課目前無法填寫回饋' }, { status: 403 })
  }
  const win = feedbackWindow(reg.courses)
  if (win === 'not_started') return NextResponse.json({ error: '課程開始後才能填寫回饋' }, { status: 403 })
  if (win === 'closed') return NextResponse.json({ error: '已超過填寫期限' }, { status: 403 })

  const { error } = await supabase.from('course_feedbacks').insert({
    ...clean,
    course_id: reg.course_id,
    registration_id: reg.id,
    user_id: userId,
    submitted_by: 'resident',
    form_version: FEEDBACK_FORM_VERSION,
  })
  // 23505 = registration_id 重複，代表已經填過（例如連點兩下或兩個分頁同時送出）
  if (error?.code === '23505') return NextResponse.json({ error: '這堂課已經填過回饋了' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
