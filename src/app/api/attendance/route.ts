import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { registrationId, courseTitle, lineUserId, action, delta: manualDelta, reason: manualReason } = body

  const delta = action === 'attend' ? 1
    : action === 'unattend' ? -1
    : (manualDelta ?? 1)

  const reason = action === 'attend' ? `出席課程：${courseTitle}`
    : action === 'unattend' ? `撤銷出席：${courseTitle}`
    : (manualReason || '手動調整')

  // 更新報名狀態、查詢 LINE 會員這兩件事互不相依，平行處理縮短單次請求耗時
  const [, memberResult] = await Promise.all([
    registrationId
      ? supabase.from('registrations').update({ status: action === 'attend' ? 'attended' : 'confirmed' }).eq('id', registrationId)
      : Promise.resolve(null),
    lineUserId
      ? supabase.from('line_members').select('id').eq('line_user_id', lineUserId).maybeSingle()
      : Promise.resolve(null),
  ])

  if (lineUserId) {
    const member = memberResult?.data
    if (member) {
      const { error } = await supabase.from('point_logs').insert({
        line_member_id: member.id,
        delta,
        reason,
        related_registration_id: registrationId || null,
      })
      if (error) console.error('point_logs insert error:', error)
    } else {
      console.error('member not found for lineUserId:', lineUserId)
    }
  }

  return NextResponse.json({ ok: true })
}
