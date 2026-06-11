import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
const body = await req.json()
  const { registrationId, courseTitle, lineUserId, action } = body
  // action: 'attend' | 'unattend'

  const delta = action === 'attend' ? 1 : action === 'unattend' ? -1 : (body.delta ?? 1)
  const reason = action === 'attend'
    ? `出席課程：${courseTitle}`
    : action === 'unattend'
    ? `撤銷出席：${courseTitle}`
    : body.reason || '手動調整'

  await supabase.from('registrations')
    .update({ status: action === 'attend' ? 'attended' : 'confirmed' })
    .eq('id', registrationId)

  if (lineUserId) {
    const { data: member } = await supabase
      .from('line_members')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (member) {
      await supabase.from('point_logs').insert({
        line_member_id: member.id,
        delta,
        reason,
        related_registration_id: registrationId,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
