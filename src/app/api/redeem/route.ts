import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyResidentToken } from '@/lib/resident-auth-server'

// 居民申請兌換獎勵：原本前端用 anon key 依 localStorage 自稱的 lineUserId 查 line_members，
// 再直接 insert redemptions，點數夠不夠也只在前端判斷。改成身份從 x-resident-token 解出，
// 點數、品項是否上架／有庫存、是否已有同品項待審申請，全部在伺服器端檢查。
// （點數實際扣除仍在後台核准兌換時處理，這裡只建立 pending 申請，跟原本流程一致）
export async function POST(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })

  const { rewardItemId } = await req.json().catch(() => ({})) as { rewardItemId?: string }
  if (!rewardItemId) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const supabase = createServerClient()

  const [{ data: member }, { data: reward }] = await Promise.all([
    supabase.from('line_members').select('id, points').eq('line_user_id', lineUserId).maybeSingle(),
    supabase.from('reward_items').select('id, points_required, stock, is_active').eq('id', rewardItemId).maybeSingle(),
  ])

  if (!reward || !reward.is_active || (reward.stock ?? 0) <= 0) {
    return NextResponse.json({ error: 'reward_unavailable' }, { status: 400 })
  }
  if (!member || (member.points ?? 0) < reward.points_required) {
    return NextResponse.json({ error: 'insufficient_points' }, { status: 400 })
  }

  const { data: pending } = await supabase
    .from('redemptions').select('id')
    .eq('line_member_id', member.id).eq('reward_item_id', reward.id).eq('status', 'pending')
    .limit(1)
  if (pending && pending.length > 0) {
    return NextResponse.json({ error: 'already_pending' }, { status: 409 })
  }

  const { error } = await supabase.from('redemptions').insert({
    line_member_id: member.id,
    reward_item_id: reward.id,
    status: 'pending',
  })
  if (error) {
    console.error('redeem insert error:', error)
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
