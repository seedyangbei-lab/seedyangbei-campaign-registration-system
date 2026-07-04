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

  const { error } = await supabase
    .from('instructors')
    .update({ claim_token: token, claim_token_expires_at: expiresAt })
    .eq('id', instructorId)

  if (error) {
    console.error('generate-claim-link error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL
    ? new URL(process.env.NEXT_PUBLIC_LINE_CALLBACK_URL).origin
    : 'https://yangbei-campaign.vercel.app'

  return NextResponse.json({ claimUrl: `${origin}/instructor/claim?token=${token}`, expiresAt })
}
