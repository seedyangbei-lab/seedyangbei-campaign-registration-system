import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { instructorId } = await request.json()
  if (!instructorId) {
    return NextResponse.json({ error: 'missing_instructor_id' }, { status: 400 })
  }

  const supabase = createServerClient()
  const token = crypto.randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: updated, error } = await supabase
    .from('instructors')
    .update({ claim_token: token, claim_token_expires_at: expiresAt })
    .eq('id', instructorId)
    .select('name')
    .single()

  if (error) {
    console.error('generate-claim-link error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // 稽核紀錄：以後遇到 claim_token_not_found 可用 tokenPreview 反查是哪位講師產生的連結
  // fire-and-forget，失敗不影響邀請連結產生
  supabase.from('funnel_logs').insert({
    session_id: 'system',
    step: 'instructor_claim_generated',
    detail: {
      instructorId,
      instructorName: updated?.name ?? null,
      tokenPreview: token.slice(0, 12),
    },
  }).then(() => {})

  const origin = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL
    ? new URL(process.env.NEXT_PUBLIC_LINE_CALLBACK_URL).origin
    : 'https://yangbei-campaign.vercel.app'

  return NextResponse.json({ claimUrl: `${origin}/instructor/claim/${token}`, expiresAt })
}
