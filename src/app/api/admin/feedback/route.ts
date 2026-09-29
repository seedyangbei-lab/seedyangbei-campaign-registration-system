import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { FEEDBACK_ELIGIBLE_STATUSES, courseStartAt } from '@/lib/courseFeedback'
import { FEEDBACK_SELECT, summarize, fetchAllRows, chunk, type FeedbackParticipant } from '@/lib/courseFeedbackServer'

// 後台課程回饋總覽：每一堂已開始的課程的出席人數、回收份數、填寫率與各題統計。
// ?month=YYYY-MM 只看某個月；&responses=1 另外附上每一份回饋的明細（匯出 CSV 用）。

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const month = req.nextUrl.searchParams.get('month')
  const withResponses = req.nextUrl.searchParams.get('responses') === '1'
  const supabase = createServerClient()

  try {
    let courseQuery = supabase.from('courses').select('id, title, date, time_start, time_end, location, instructor_ids').order('date', { ascending: false })
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      courseQuery = courseQuery.gte('date', `${month}-01`).lt('date', next)
    }
    const { data: courseRows, error: courseErr } = await courseQuery
    if (courseErr) throw courseErr

    const now = new Date()
    const courses = (courseRows || []).filter((c: any) => courseStartAt(c) <= now)
    const ids = courses.map((c: any) => c.id)

    const regs: any[] = []
    const feedbacks: any[] = []
    // .in() 帶太多 id 會讓網址過長，分批查
    for (const part of chunk(ids, 150)) {
      regs.push(...await fetchAllRows((from, to) => supabase.from('registrations')
        .select('id, course_id, status, is_walk_in, users(name, room_number, phone, line_id)')
        .in('course_id', part).in('status', [...FEEDBACK_ELIGIBLE_STATUSES, 'absent'])
        .order('id').range(from, to)))
      feedbacks.push(...await fetchAllRows((from, to) => supabase.from('course_feedbacks')
        .select(`course_id, ${FEEDBACK_SELECT}`)
        .in('course_id', part).order('id').range(from, to)))
    }

    const instructorIds = Array.from(new Set(courses.flatMap((c: any) => c.instructor_ids || [])))
    const { data: instructors } = instructorIds.length
      ? await supabase.from('instructors').select('id, name').in('id', instructorIds)
      : { data: [] as any[] }
    const instructorName = new Map((instructors || []).map((i: any) => [i.id, i.name]))

    const feedbackByReg = new Map(feedbacks.map(f => [f.registration_id, f]))
    const regsByCourse = new Map<string, any[]>()
    regs.forEach(r => {
      if (!regsByCourse.has(r.course_id)) regsByCourse.set(r.course_id, [])
      regsByCourse.get(r.course_id)!.push(r)
    })

    const responses: any[] = []
    const list = courses.map((c: any) => {
      const participants: FeedbackParticipant[] = (regsByCourse.get(c.id) || []).map(r => ({
        registration_id: r.id,
        status: r.status,
        is_walk_in: !!r.is_walk_in,
        name: r.users?.name || '（未命名）',
        room_number: r.users?.room_number || null,
        has_line: !!r.users?.line_id,
        feedback: feedbackByReg.get(r.id) || null,
      }))
      const instructorNames = (c.instructor_ids || []).map((id: string) => instructorName.get(id)).filter(Boolean)
      if (withResponses) {
        (regsByCourse.get(c.id) || []).forEach(r => {
          const f = feedbackByReg.get(r.id)
          if (f) responses.push({
            course_title: c.title, course_date: c.date, instructor_names: instructorNames,
            name: r.users?.name || '', room_number: r.users?.room_number || '', phone: r.users?.phone || '',
            status: r.status, is_walk_in: !!r.is_walk_in, ...f,
          })
        })
      }
      return {
        id: c.id, title: c.title, date: c.date, time_start: c.time_start, time_end: c.time_end,
        location: c.location, instructor_names: instructorNames,
        summary: summarize(participants),
      }
    })

    return NextResponse.json(withResponses ? { courses: list, responses } : { courses: list })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '讀取失敗' }, { status: 500 })
  }
}
