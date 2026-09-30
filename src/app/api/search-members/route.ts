import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

// line_members 的 RLS 沒有對外開放匿名讀取（跟 admin/members 頁面一樣，都是走 service role），
// 現場報到的搜尋要找「LINE 會員但沒報名過活動」的人，勢必要查 line_members，
// 所以這裡另外開一個用 service role 查詢的 API，給後台/中台的瀏覽器端呼叫。
// 原本完全沒有驗證身份，任何人都能查出居民姓名＋棟別/戶號/樓層，這裡補上跟現場報到共用的身份檢查。
// 曾報名過的居民（users 表）原本是現場報到彈窗用 anon key 直接查，現在也一併在這裡查，
// 回傳 { users, lineMembers } 兩份候選名單，由前端合併去重。
export async function GET(req: NextRequest) {
  const isAdmin = verifyAdminToken(req.headers.get('x-admin-token'))
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!isAdmin && !instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ users: [], lineMembers: [] })

  const supabase = createServerClient()
  const [userRes, memberRes] = await Promise.all([
    supabase.from('users').select('id, name, room_number, line_id').ilike('name', `%${q}%`).limit(6),
    supabase
      .from('line_members')
      .select('line_user_id, display_name, building, unit_number, floor_number')
      .ilike('display_name', `%${q}%`)
      .limit(6),
  ])

  if (userRes.error) console.error('search-members users error:', userRes.error)
  if (memberRes.error) console.error('search-members line_members error:', memberRes.error)

  return NextResponse.json({ users: userRes.data || [], lineMembers: memberRes.data || [] })
}
