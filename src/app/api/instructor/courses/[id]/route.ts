import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

// 講師編輯課程（含海報照片更新，共用這支）：原本前端直接用 anon key 寫 courses 表，
// 任何講師都能改任何一堂課。這裡先查出這堂課現在的 instructor_ids，
// 確認 token 解出來的 instructorId 在裡面才放行，不在就當作別堂課，一律拒絕。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServerClient()
  const { data: existing } = await supabase.from('courses').select('*').eq('id', id).maybeSingle()
  if (!existing || !(existing.instructor_ids || []).includes(instructorId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await req.json()

  // 課程異動紀錄：原本是前端另外呼叫一次 insert，搬進來一起做，順便也堵掉這張表原本一樣沒驗證的寫入路徑
  if (payload.logChange) {
    await supabase.from('course_edit_logs').insert({
      course_id: id,
      instructor_id: instructorId,
      before_data: existing,
      after_data: { ...existing, ...payload.data },
    })
  }

  const updatePayload = payload.logChange ? payload.data : payload
  const { error } = await supabase.from('courses').update(updatePayload).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
