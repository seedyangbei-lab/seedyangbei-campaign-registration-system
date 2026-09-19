import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// line_members 的 RLS 沒有對外開放匿名讀取（跟 admin/members 頁面一樣，都是走 service role），
// 現場報到的搜尋要找「LINE 會員但沒報名過活動」的人，勢必要查 line_members，
// 所以這裡另外開一個用 service role 查詢的 API，給後台/中台的瀏覽器端呼叫。
// 原本完全沒有驗證身份，任何人都能查出居民姓名＋棟別/戶號/樓層，這裡補上跟現場報到共用的身份檢查。
export async function GET(req: NextRequest) {
  const isAdmin = verifyAdminToken(req.headers.get('x-admin-token'))
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!isAdmin && !instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  const { data, error } = await supabase
    .from('line_members')
    .select('line_user_id, display_name, building, unit_number, floor_number')
    .ilike('display_name', `%${q}%`)
    .limit(6)

  if (error) {
    console.error('search-members error:', error)
    return NextResponse.json([], { status: 200 })
  }

  return NextResponse.json(data || [])
}
