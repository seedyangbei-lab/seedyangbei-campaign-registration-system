import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyResidentToken } from '@/lib/resident-auth-server'
import { displayInstructorIds } from '@/lib/courseInstructors'

// 居民個人頁（/profile）的資料：原本前端只信任 localStorage 裡自稱的 lineUserId，
// 直接用 anon key 查 users／registrations／redemptions／point_logs，
// 再呼叫只收 ?line_user_id= 的 /api/member-points 拿點數——等於任何人換一個 lineUserId 就能看別人的報名紀錄與點數。
// 改成身份一律從 x-resident-token 解出來，只回傳本人的資料。
export async function GET(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })

  const supabase = createServerClient()

  const [{ data: user }, { data: member }] = await Promise.all([
    supabase.from('users').select('id').eq('line_id', lineUserId).maybeSingle(),
    supabase.from('line_members').select('id, points').eq('line_user_id', lineUserId).maybeSingle(),
  ])

  const [regsRes, redemptionsRes, logsRes] = await Promise.all([
    user
      ? supabase
          .from('registrations')
          .select('*, courses(title, date, time_start, time_end, location, instructor_id, instructor_ids, instructor_mode, display_instructor_ids, instructors(name))')
          .eq('user_id', user.id)
          // 已出席（attended）的也要列出來；講師標記未出席（absent）的則不顯示
          .in('status', ['confirmed', 'attended'])
          .order('registered_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    member
      ? supabase
          .from('redemptions')
          .select('*, reward_items(name, points_required)')
          .eq('line_member_id', member.id)
          .order('requested_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    member
      ? supabase
          .from('point_logs')
          .select('id, delta, reason, created_at')
          .eq('line_member_id', member.id)
          .gt('delta', 0)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // 報名紀錄上的講師：照課程的「海報／課程卡顯示講師」顯示，跟首頁課程卡一致
  // （原本只抓 instructor_id 那一位，幫其他種子戶開的課會變成顯示開課者）
  const registrations: any[] = regsRes.data || []
  const shownIds = Array.from(new Set(registrations.flatMap(r => (r.courses && r.courses.instructor_mode !== 'community') ? displayInstructorIds(r.courses) : [])))
  if (shownIds.length > 0) {
    const { data: instructors } = await supabase.from('instructors').select('id, name').in('id', shownIds)
    const nameById = new Map((instructors || []).map((i: any) => [i.id, i.name]))
    for (const r of registrations) {
      if (!r.courses || r.courses.instructor_mode === 'community') continue
      const name = displayInstructorIds(r.courses).map(id => nameById.get(id)).filter(Boolean).join('、')
      if (name) r.courses.instructors = { name }
    }
  }

  return NextResponse.json({
    registrations,
    member: member ? { id: member.id, points: member.points ?? 0 } : null,
    redemptions: redemptionsRes.data || [],
    pointLogs: logsRes.data || [],
  })
}
