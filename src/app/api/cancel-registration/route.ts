import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { courseStartAt } from '@/lib/courseFeedback'
import { verifyResidentToken } from '@/lib/resident-auth-server'

// 居民取消自己的報名。原本只信任 request body 傳來的 lineUserId，任何人帶別人的 lineUserId
// 就能取消對方的報名；改成身份一律從 x-resident-token 解出來。
export async function POST(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) {
    return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })
  }

  const { registrationId } = await req.json().catch(() => ({}))
  if (!registrationId) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 確認這筆報名屬於這個 LINE 用戶
  const { data: reg } = await supabase
    .from('registrations')
    .select('id, status, course_id, users!inner(line_id), courses(date, time_start)')
    .eq('id', registrationId)
    .maybeSingle()

  if (!reg) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if ((reg.users as any)?.line_id !== lineUserId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 確認課程尚未開始。課程時間存的是台灣當地時間，伺服器跑在 UTC，
  // 直接 new Date(`${date}T${time}`) 會被當成 UTC 解讀，變成開課後 8 小時內還能取消；
  // 改用 courseStartAt 明確以 +08:00 解讀
  const course = reg.courses as any
  if (course?.date) {
    if (courseStartAt(course) <= new Date()) {
      return NextResponse.json({ error: 'course_started' }, { status: 400 })
    }
  }

  await supabase
    .from('registrations')
    .update({ status: 'cancelled' })
    .eq('id', registrationId)

  return NextResponse.json({ ok: true })
}
