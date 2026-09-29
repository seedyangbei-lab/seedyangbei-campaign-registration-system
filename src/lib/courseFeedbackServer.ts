import type { SupabaseClient } from '@supabase/supabase-js'
import { computeFeedbackStats, FEEDBACK_ELIGIBLE_STATUSES, type FeedbackStats } from './courseFeedback'

// 講師中台與後台共用：一堂課的回饋明細＋統計。只在 API route 裡用 service_role client 呼叫。
//
// 填寫率的定義：分母 = 已出席人數（含現場報名），分子 = 已出席者當中有填回饋的人數。
// 講師尚未點名（confirmed）就先填的回饋會出現在明細裡，但要等講師確認出席後才計入填寫率與統計，
// 事後被標記未出席（absent）的人，回饋保留在明細但不計入。

export const FEEDBACK_SELECT =
  'id, registration_id, q_admin, q_promotion, q_purpose, q_content, q_community, q_rejoin, comment, submitted_by, submitted_at'

export type FeedbackParticipant = {
  registration_id: string
  status: 'confirmed' | 'attended' | 'absent'
  is_walk_in: boolean
  name: string
  room_number: string | null
  has_line: boolean
  feedback: any | null
}

export type CourseFeedbackSummary = {
  attendedCount: number
  walkInCount: number
  respondedCount: number   // 已出席且有填
  totalFeedbackCount: number // 全部回饋（含未點名、未出席者）
  responseRate: number | null
  stats: FeedbackStats
}

export function summarize(participants: FeedbackParticipant[]): CourseFeedbackSummary {
  const attended = participants.filter(p => p.status === 'attended')
  const counted = attended.filter(p => p.feedback).map(p => p.feedback)
  return {
    attendedCount: attended.length,
    walkInCount: attended.filter(p => p.is_walk_in).length,
    respondedCount: counted.length,
    totalFeedbackCount: participants.filter(p => p.feedback).length,
    responseRate: attended.length ? counted.length / attended.length : null,
    stats: computeFeedbackStats(counted),
  }
}

export async function loadCourseFeedbackDetail(supabase: SupabaseClient, courseId: string) {
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, date, time_start, time_end, location, instructor_ids')
    .eq('id', courseId)
    .maybeSingle()
  if (!course) return null

  const [{ data: regs }, { data: feedbacks }, { data: instructors }] = await Promise.all([
    supabase.from('registrations')
      .select('id, status, is_walk_in, users(name, room_number, line_id)')
      .eq('course_id', courseId)
      .in('status', [...FEEDBACK_ELIGIBLE_STATUSES, 'absent'])
      .order('registered_at'),
    supabase.from('course_feedbacks').select(FEEDBACK_SELECT).eq('course_id', courseId),
    (course.instructor_ids || []).length
      ? supabase.from('instructors').select('id, name').in('id', course.instructor_ids)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const byReg = new Map((feedbacks || []).map((f: any) => [f.registration_id, f]))
  const participants: FeedbackParticipant[] = (regs || [])
    .map((r: any) => ({
      registration_id: r.id,
      status: r.status,
      is_walk_in: !!r.is_walk_in,
      name: r.users?.name || '（未命名）',
      room_number: r.users?.room_number || null,
      has_line: !!r.users?.line_id,
      feedback: byReg.get(r.id) || null,
    }))
    // 未出席又沒填的人跟回饋無關，不必列出
    .filter(p => p.status !== 'absent' || p.feedback)

  return {
    course: { ...course, instructor_names: (instructors || []).map((i: any) => i.name) },
    participants,
    summary: summarize(participants),
  }
}
