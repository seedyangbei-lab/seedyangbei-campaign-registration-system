import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

// 講師新增課程：原本前端直接用 anon key 寫 courses 表，instructor_id／instructor_ids
// 完全由前端自己宣告，改走這支之後一律以 token 解出來的 instructorId 為準，
// 不相信前端傳來的任何講師 id，避免有人竄改成不屬於自己的講師身份掛名。
export async function POST(req: NextRequest) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await req.json()
  const coInstructorIds = (payload.instructor_ids || []).filter((id: string) => id && id !== instructorId)
  const instructorIds = [instructorId, ...coInstructorIds]

  const supabase = createServerClient()
  const { data, error } = await supabase.from('courses').insert({
    ...payload,
    instructor_id: instructorId,
    instructor_ids: instructorIds,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ course: data })
}
