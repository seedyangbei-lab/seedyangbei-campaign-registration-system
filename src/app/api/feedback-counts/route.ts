import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'
import { loadFeedbackCounts } from '@/lib/courseFeedbackServer'

// 後台課程管理、講師中台課程卡片、兩邊的出席名單共用：
// 每堂課「已填回饋／已出席」人數，以及已填回饋的 registration_id（出席名單標「已填回饋」用）。
// 跟 /api/attendance 一樣接受 admin 或 instructor token；講師只會拿到自己課程的資料。
export async function POST(req: NextRequest) {
  const isAdmin = verifyAdminToken(req.headers.get('x-admin-token'))
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!isAdmin && !instructorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courseIds } = await req.json().catch(() => ({}))
  if (!Array.isArray(courseIds) || courseIds.some(id => typeof id !== 'string')) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (courseIds.length === 0) return NextResponse.json({ counts: {}, submitted: [] })

  const supabase = createServerClient()
  let ids: string[] = courseIds
  if (!isAdmin && instructorId) {
    const { data } = await supabase.from('courses').select('id').in('id', courseIds).contains('instructor_ids', [instructorId])
    ids = (data || []).map(c => c.id)
  }

  try {
    return NextResponse.json(await loadFeedbackCounts(supabase, ids))
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '讀取失敗' }, { status: 500 })
  }
}
