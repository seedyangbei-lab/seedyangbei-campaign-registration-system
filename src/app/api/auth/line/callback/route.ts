import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/register?error=line_denied', request.url))
  }

  // 從 NEXT_PUBLIC_ 或 server-side 環境變數都嘗試讀取
  const channelId = process.env.LINE_CHANNEL_ID || process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
  const channelSecret = process.env.LINE_CHANNEL_SECRET || ''
  const callbackUrl = process.env.LINE_CALLBACK_URL || process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'
  try {
    // Step 1: Exchange code for token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    })

    const tokenData = await tokenRes.json()

    // Token 交換失敗時記錄詳細錯誤
    if (!tokenData.access_token) {
      console.error('LINE token error:', JSON.stringify(tokenData))
      return NextResponse.redirect(new URL(`/register?error=line_failed&detail=${encodeURIComponent(tokenData.error_description || 'no_token')}`, request.url))
    }

    // Step 2: Get user profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    // LINE profile 格式：{ userId, displayName, pictureUrl, statusMessage }
    const lineUserId = profile.userId
    const displayName = profile.displayName || 'LINE 使用者'
    const pictureUrl = profile.pictureUrl || null

    if (!lineUserId) {
      console.error('LINE profile error:', JSON.stringify(profile))
      return NextResponse.redirect(new URL('/register?error=line_failed', request.url))
    }

    // Step 3: Parse email from id_token if available
    let email = ''
    if (tokenData.id_token) {
      try {
        const parts = tokenData.id_token.split('.')
        if (parts.length >= 2) {
          // Base64url decode
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
          const padded = base64 + '='.repeat((4 - base64.length % 4) % 4)
          const decoded = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
          email = decoded.email || ''
        }
      } catch (e) {
        console.log('id_token parse skipped:', e)
      }
    }

    // Step 4: Upsert to Supabase line_members
    const supabase = createServerClient()

    const { data: existingUser, error: selectError } = await supabase
      .from('line_members')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    if (selectError) {
      console.error('Supabase select error:', selectError)
    }

    if (!existingUser) {
      const { error: insertError } = await supabase.from('line_members').insert({
        line_user_id: lineUserId,
        display_name: displayName,
        picture_url: pictureUrl,
        email: email || null,
      })
      if (insertError) console.error('Supabase insert error:', JSON.stringify(insertError))
    } else {
      const { error: updateError } = await supabase.from('line_members').update({
        display_name: displayName,
        picture_url: pictureUrl,
        last_login: new Date().toISOString(),
      }).eq('line_user_id', lineUserId)
      if (updateError) console.error('Supabase update error:', JSON.stringify(updateError))
    }

    // Step 5: Redirect with user info
    const userInfo = encodeURIComponent(JSON.stringify({
      lineUserId,
      displayName,
      pictureUrl,
      email,
    }))

    const redirectUrl = state || `${new URL(request.url).origin}/register`
    const separator = redirectUrl.includes('?') ? '&' : '?'
    return NextResponse.redirect(
      new URL(`${redirectUrl}${separator}line_user=${userInfo}`, request.url)
    )
  } catch (err: any) {
    console.error('LINE Login unexpected error:', err?.message || err)
    return NextResponse.redirect(new URL('/register?error=line_failed', request.url))
  }
}
