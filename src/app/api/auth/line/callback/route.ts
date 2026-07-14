import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// 系統健康頁的「LINE 登入失敗」偵測用：server 端沒有 client 端的 funnel_session_id，
// 用固定 session_id 標記為系統事件，fire-and-forget 失敗也不影響登入流程本身
async function logLineLoginFail(detail: Record<string, any>) {
  try {
    const supabase = createServerClient()
    await supabase.from('funnel_logs').insert({
      session_id: 'system',
      step: 'line_login_fail',
      course_ids: null,
      detail,
    })
  } catch (e) {
    console.error('logLineLoginFail failed:', e)
  }
}

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
      await logLineLoginFail({ stage: 'token_exchange', reason: tokenData.error_description || 'no_token' })
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
      await logLineLoginFail({ stage: 'profile_fetch', reason: 'no_user_id' })
      return NextResponse.redirect(new URL('/register?error=line_failed', request.url))
    }

    // Step 2.5: 講師中台登入／邀請連結綁定分流（跟居民報名流程互不影響）
    if (state) {
      try {
        const parsedState = JSON.parse(decodeURIComponent(state))
        const origin = new URL(request.url).origin

        if (parsedState.instructorClaim) {
          const supabase = createServerClient()
          const { data: matched } = await supabase
            .from('instructors')
            .select('id, claim_token_expires_at')
            .eq('claim_token', parsedState.instructorClaim)
            .maybeSingle()

          if (!matched) {
            return NextResponse.redirect(new URL('/instructor/claim?error=invalid', origin))
          }
          if (matched.claim_token_expires_at && new Date(matched.claim_token_expires_at) < new Date()) {
            return NextResponse.redirect(new URL('/instructor/claim?error=expired', origin))
          }

          const { error: bindError } = await supabase
            .from('instructors')
            .update({ line_user_id: lineUserId, claim_token: null, claim_token_expires_at: null })
            .eq('id', matched.id)

          if (bindError) {
            console.error('instructor claim bind error:', bindError)
            return NextResponse.redirect(new URL('/instructor/claim?error=invalid', origin))
          }

          const userInfo = encodeURIComponent(JSON.stringify({ lineUserId, displayName, pictureUrl }))
          return NextResponse.redirect(new URL(`/instructor?line_user=${userInfo}&claimed=1`, origin))
        }

        if (parsedState.instructorLogin) {
          const supabase = createServerClient()
          const { data: matched } = await supabase
            .from('instructors')
            .select('id')
            .eq('line_user_id', lineUserId)
            .maybeSingle()

          const userInfo = encodeURIComponent(JSON.stringify({ lineUserId, displayName, pictureUrl }))
          if (!matched) {
            return NextResponse.redirect(new URL('/instructor?error=not_instructor', origin))
          }
          return NextResponse.redirect(new URL(`/instructor?line_user=${userInfo}`, origin))
        }
      } catch {
        // state 不是講師相關 JSON，繼續走原本居民報名流程
      }
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
      })
      if (insertError) console.error('Supabase insert error:', JSON.stringify(insertError))
    } else {
     const { error: updateError } = await supabase.from('line_members').update({
        display_name: displayName,
        picture_url: pictureUrl,
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

   const origin = new URL(request.url).origin
   let redirectUrl = `${origin}/register`
    if (state) {
      try {
        const decoded = decodeURIComponent(state)
        const parsed = JSON.parse(decoded)
        if (parsed.courses) {
          redirectUrl = `${origin}/register?courses=${encodeURIComponent(parsed.courses)}`
        } else if (parsed.url && parsed.url.startsWith('http')) {
          // 相容舊格式（state 直接帶完整網址）
          redirectUrl = parsed.url
        }
      } catch {
        // state 不是 JSON，當作純 URL（舊格式相容）
        try {
          const decoded = decodeURIComponent(state)
          if (decoded.startsWith('http')) redirectUrl = decoded
        } catch {}
      }
    }
    const separator = redirectUrl.includes('?') ? '&' : '?'
    return NextResponse.redirect(
      new URL(`${redirectUrl}${separator}line_user=${userInfo}`, request.url)
    )
  } catch (err: any) {
    console.error('LINE Login unexpected error:', err?.message || err)
    await logLineLoginFail({ stage: 'unexpected', reason: err?.message || String(err) })
    return NextResponse.redirect(new URL('/register?error=line_failed', request.url))
  }
}
