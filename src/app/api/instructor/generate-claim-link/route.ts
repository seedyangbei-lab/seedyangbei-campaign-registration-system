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
  // 注意：這裡一定要 await，Vercel 是 serverless function，response 一送出函式就可能被終止，
  // 不 await 的 insert 常常根本來不及送出就被砍掉（第一版就是這樣悄悄失敗的），
  // 用 try/catch 包起來，就算寫入失敗也不影響邀請連結本身的產生
  try {
    await supabase.from('funnel_logs').insert({
      session_id: 'system',
      step: 'instructor_claim_generated',
      detail: {
        instructorId,
        instructorName: updated?.name ?? null,
        tokenPreview: token.slice(0, 12),
      },
    })
  } catch (logError) {
    console.error('instructor_claim_generated log failed:', logError)
  }

  const origin = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL
    ? new URL(process.env.NEXT_PUBLIC_LINE_CALLBACK_URL).origin
    : 'https://yangbei-campaign.vercel.app'

  return NextResponse.json({ claimUrl: `${origin}/instructor/claim/${token}`, expiresAt })
}
