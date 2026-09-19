import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

type PendingItem = {
  name: string
  roomNumber: string
  isResident: boolean
  existingUserId?: string
  lineMemberId?: string
}

// 現場報到（後台／講師中台共用）：原本前端直接用 anon key 寫 users／registrations 表，
// 任何人都能幫任意課程建立報名紀錄、建立居民資料。這裡跟 /api/attendance 一樣，
// 接受 admin 或 instructor 其中一種 token；講師的話另外檢查這堂課的 instructor_ids
// 裡有沒有自己，不能幫不是自己教的課加報到名單。
export async function POST(req: NextRequest) {
  const isAdmin = verifyAdminToken(req.headers.get('x-admin-token'))
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!isAdmin && !instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { courseId, courseTitle, items } = await req.json() as { courseId: string; courseTitle?: string; items: PendingItem[] }
  if (!courseId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = createServerClient()

  if (!isAdmin && instructorId) {
    const { data: course } = await supabase.from('courses').select('instructor_ids').eq('id', courseId).maybeSingle()
    if (!course || !(course.instructor_ids || []).includes(instructorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const created: any[] = []
  const failedNames: string[] = []

  for (const p of items) {
    let userRow: { id: string; name: string; room_number: string; line_id: string | null } | null = null

    if (p.existingUserId) {
      const { data } = await supabase.from('users').select('id, name, room_number, line_id').eq('id', p.existingUserId).maybeSingle()
      if (!data) { failedNames.push(p.name); continue }
      userRow = data
    } else if (p.lineMemberId) {
      // LINE 會員尚未有 users 紀錄：先查一次避免競態重複建檔，查不到才新建
      const { data: found } = await supabase.from('users').select('id, name, room_number, line_id').eq('line_id', p.lineMemberId).maybeSingle()
      if (found) {
        userRow = found
      } else {
        const { data: newUser, error: userErr } = await supabase.from('users')
          .insert({ name: p.name, room_number: p.roomNumber, line_id: p.lineMemberId })
          .select('id, name, room_number, line_id').single()
        if (userErr || !newUser) { failedNames.push(p.name); continue }
        userRow = newUser
      }
    } else {
      const { data: newUser, error: userErr } = await supabase.from('users')
        .insert({ name: p.name, room_number: p.roomNumber })
        .select('id, name, room_number, line_id').single()
      if (userErr || !newUser) { failedNames.push(p.name); continue }
      userRow = newUser
    }

    const { data: newReg, error: regErr } = await supabase.from('registrations')
      .insert({
        user_id: userRow.id, course_id: courseId, status: 'attended',
        is_social_housing_resident: p.isResident,
        is_walk_in: true,
      })
      .select('id, status, is_walk_in')
      .single()

    if (regErr || !newReg) { failedNames.push(p.name); continue }

    // 現場報到直接視為已出席，發一筆點數紀錄——跟 /api/attendance 的 attend 動作邏輯一致
    if (userRow.line_id) {
      const { data: member } = await supabase.from('line_members').select('id').eq('line_user_id', userRow.line_id).maybeSingle()
      if (member) {
        await supabase.from('point_logs').insert({
          line_member_id: member.id,
          delta: 1,
          reason: `出席課程：${courseTitle || ''}`,
          related_registration_id: newReg.id,
        })
      }
    }

    created.push({ ...newReg, users: userRow })
  }

  return NextResponse.json({ created, failedNames })
}
