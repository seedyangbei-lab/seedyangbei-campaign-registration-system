import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'

// 後台讀取報名紀錄：原本 /admin/*（首頁統計、報名名單、課程出席、會員管理）都是前端用 anon key
// 直接查 registrations＋users，資料庫層沒有任何身份檢查，等於居民個資對所有人公開。
// 集中到這支 API，驗證後台 token 之後才用 service role 查。
//
// 查詢參數（皆可省略、可組合）：
// - courseId：只查某堂課
// - userId：只查某位居民（users.id）
// - lineUserId：只查某位 LINE 會員（伺服器端換成 users.id）
// - statuses：逗號分隔，只接受下面列出的狀態
// - view=participation：會員管理頁統計用的精簡欄位（不含個資），其他情況回傳完整欄位
const ALLOWED_STATUSES = ['confirmed', 'attended', 'absent', 'cancelled']
const FULL_SELECT = '*, users(id, name, room_number, phone, email, age_group, line_id), courses(id, title, date, time_start, time_end, location)'
const PARTICIPATION_SELECT = 'user_id, course_id, registered_at, users(id, line_id), courses(date)'

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const supabase = createServerClient()

  let userId = sp.get('userId')
  const lineUserId = sp.get('lineUserId')
  if (!userId && lineUserId) {
    const { data: user } = await supabase.from('users').select('id').eq('line_id', lineUserId).maybeSingle()
    if (!user) return NextResponse.json([])
    userId = user.id
  }

  const statuses = (sp.get('statuses') || '').split(',').map(s => s.trim()).filter(Boolean)
  if (statuses.some(s => !ALLOWED_STATUSES.includes(s))) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  let query = supabase
    .from('registrations')
    .select(sp.get('view') === 'participation' ? PARTICIPATION_SELECT : FULL_SELECT)
  const courseId = sp.get('courseId')
  if (courseId) query = query.eq('course_id', courseId)
  if (userId) query = query.eq('user_id', userId)
  if (statuses.length > 0) query = query.in('status', statuses)

  const ascending = sp.get('order') === 'asc'
  const { data, error } = await query.order('registered_at', { ascending })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
