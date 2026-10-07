import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyResidentToken } from '@/lib/resident-auth-server'

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
          .select('*, courses(title, date, time_start, time_end, location, instructors(name))')
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

  return NextResponse.json({
    registrations: regsRes.data || [],
    member: member ? { id: member.id, points: member.points ?? 0 } : null,
    redemptions: redemptionsRes.data || [],
    pointLogs: logsRes.data || [],
  })
}
