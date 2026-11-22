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

  // 筆數抓寬一點：已在這堂課名單上的人前端會排到後面，常見姓氏（陳、林）只抓 6 筆容易把要找的人擠掉
  const supabase = createServerClient()
  const [userRes, memberRes] = await Promise.all([
    supabase.from('users').select('id, name, room_number, line_id').ilike('name', `%${q}%`).limit(15),
    supabase
      .from('line_members')
      .select('line_user_id, display_name, building, unit_number, floor_number')
      .ilike('display_name', `%${q}%`)
      .limit(15),
  ])

  if (userRes.error) console.error('search-members users error:', userRes.error)
  if (memberRes.error) console.error('search-members line_members error:', memberRes.error)

  // 「本名（LINE 名稱）」：用 LINE 名稱搜到、但其實已經有 users 紀錄（填過本名）的人，改用 users 紀錄回傳，
  // 現場就會看到本名；反過來用本名搜到的人，補上 LINE 名稱。兩邊都要對得上，種子戶才認得出是誰
  const users: { id: string; name: string; room_number: string; line_id: string | null; line_name?: string | null }[] = [...(userRes.data || [])]
  const memberRows = memberRes.data || []
  const matchedLineIds = memberRows.map(m => m.line_user_id).filter(Boolean)
  if (matchedLineIds.length > 0) {
    const { data: linked } = await supabase
      .from('users').select('id, name, room_number, line_id').in('line_id', matchedLineIds)
    const have = new Set(users.map(u => u.id))
    for (const u of linked || []) if (!have.has(u.id)) users.push(u)
  }

  const userLineIds = users.map(u => u.line_id).filter((x): x is string => !!x)
  const lineNameById = new Map<string, string | null>(memberRows.map(m => [m.line_user_id, m.display_name]))
  const missing = userLineIds.filter(id => !lineNameById.has(id))
  if (missing.length > 0) {
    const { data: extra } = await supabase.from('line_members').select('line_user_id, display_name').in('line_user_id', missing)
    for (const m of extra || []) lineNameById.set(m.line_user_id, m.display_name)
  }
  for (const u of users) u.line_name = u.line_id ? (lineNameById.get(u.line_id) ?? null) : null

  const linkedSet = new Set(userLineIds)
  const lineMembers = memberRows.filter(m => !linkedSet.has(m.line_user_id))

  return NextResponse.json({ users, lineMembers })
}
