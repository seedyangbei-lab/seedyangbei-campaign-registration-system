import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyResidentToken } from '@/lib/resident-auth-server'

// 首頁課程卡片標示「已報名」用。原本只收 ?line_user_id=，任何人帶別人的 lineUserId 就能查到對方報了哪些課；
// 改成身份從 x-resident-token 解出來。沒登入或 token 過期就回空陣列（只是不顯示已報名標記，不影響瀏覽）。
export async function GET(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json([])

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('line_id', lineUserId)
    .maybeSingle()

  if (!user) return NextResponse.json([])

  const { data: regs } = await supabase
    .from('registrations')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')

  return NextResponse.json(regs ?? [])
}
