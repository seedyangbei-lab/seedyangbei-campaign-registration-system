import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { pickAdminEditable } from '@/lib/instructorColumns'

// 後台編輯講師資料／解除綁定。解除綁定只接受 { unbind: true }，
// 不接受任意指定 line_user_id，綁定一律只能透過邀請連結 + LINE 登入完成。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const update = pickAdminEditable(body)
  if (body?.unbind === true) update.line_user_id = null
  if ('name' in update && !String(update.name || '').trim()) {
    return NextResponse.json({ error: '姓名不能是空白' }, { status: 400 })
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const supabase = createServerClient()
  const { error } = await supabase.from('instructors').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const supabase = createServerClient()

  // 種子戶退出時刪除講師：
  //   - 他自己主辦的課程（courses.instructor_id = 他）一併刪除，報名／回饋／成果回報會跟著 cascade 刪掉
  //   - 「央北種子戶聯合主辦」的集合型活動不刪，只把他移出名單、主辦改成名單上下一位
  //   - 他只是合作講師的課程保留，只把他從 instructor_ids 移除
  //   - course_edit_logs.instructor_id 的外鍵沒有設 ON DELETE，不先清掉會擋住刪除
  // 每一步都可以重跑，中途失敗再按一次刪除即可
  const { data: related, error: relatedError } = await supabase
    .from('courses')
    .select('id, instructor_id, instructor_ids, instructor_mode')
    .or(`instructor_id.eq.${id},instructor_ids.cs.{${id}}`)
  if (relatedError) return NextResponse.json({ error: relatedError.message }, { status: 500 })

  const hostedIds: string[] = []
  for (const course of related || []) {
    const remaining = (course.instructor_ids || []).filter((x: string) => x !== id)
    if (course.instructor_id === id && course.instructor_mode !== 'community') {
      hostedIds.push(course.id)
      continue
    }
    const update: Record<string, any> = { instructor_ids: remaining }
    if (course.instructor_id === id) update.instructor_id = remaining[0] || null
    const { error } = await supabase.from('courses').update(update).eq('id', course.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (hostedIds.length > 0) {
    const { error } = await supabase.from('courses').delete().in('id', hostedIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { error: logError } = await supabase.from('course_edit_logs').update({ instructor_id: null }).eq('instructor_id', id)
  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deletedCourses: hostedIds.length })
}
