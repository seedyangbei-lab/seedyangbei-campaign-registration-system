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

// 判斷這次 LINE 登入屬於哪個流程：講師綁定邀請連結 / 講師登入中台 /
// 居民為了報名某堂課而登入（CourseCard，state 帶 courses）/ 居民一般登入（首次訪問彈窗、導覽列，state 只帶 url）
// 提早在拿到 state 當下就判斷，這樣連 token 交換失敗這種最早期的錯誤也能分類，
// 不用等到 profile 拿到之後才知道是誰在用
function detectFlow(state: string | null): 'instructor_claim' | 'instructor_login' | 'resident_register' | 'resident_general' {
  if (!state) return 'resident_general'
  try {
    const parsed = JSON.parse(decodeURIComponent(state))
    if (parsed.instructorClaim) return 'instructor_claim'
    if (parsed.instructorLogin) return 'instructor_login'
    if (parsed.courses) return 'resident_register'
  } catch {}
  return 'resident_general'
}

// 登入失敗／被取消時要導去哪裡：
// - 講師點邀請連結綁定途中失敗（state 帶 instructorClaim）→ 導回 /instructor/claim，跟 Step 2.5
//   裡其他 claim 相關錯誤用同一個目的地，讓講師看到「綁定失敗」而不是報名頁
// - 講師登入中台途中失敗（state 帶 instructorLogin）→ 導回 /instructor，讓講師看到登入按鈕重新嘗試
// - 報名某堂課途中登入（state 帶 courses）→ 導回 /register，帶著 courses 讓表單知道要顯示哪些課程
// - 一般居民登入（導覽列、首次訪問彈窗，state 只帶 url，通常是當下那一頁）→ 導回原本那一頁，並帶 error 參數
//   （這裡以前不管是哪種登入，失敗一律導去 /register；但一般登入的 state.url 常常是首頁，
//   /register 沒有 courses 資訊時前台會直接判定「課程資訊遺失」整頁彈回首頁，
//   使用者完全看不到任何錯誤訊息，登入失敗變成「按了沒反應」，這裡改成尊重 state.url）
// - 都沒有 state（理論上不會發生）→ 保底導去 /register
//
// 這一段以前只認得 courses / url 這兩種 state 形狀，講師綁定／登入失敗在 token 交換這種最早期
// 就出錯時（還沒進到 Step 2.5 專屬的講師分流邏輯），會被這裡的預設值撈走、誤導去 /register，
// 又因為沒帶 courses 資訊，緊接著在前台又被判定一次「課程資訊遺失」——後台系統健康頁常看到的
// 「LINE 登入失敗」＋「課程資訊遺失」常常是同一次講師登入失敗連續觸發的兩筆記錄
function buildFailureRedirect(origin: string, state: string | null, errorCode: string, detail?: string) {
  let targetBase = `${origin}/register`
  let coursesParam = ''
  if (state) {
    try {
      const parsedState = JSON.parse(decodeURIComponent(state))
      if (parsedState.instructorClaim) {
        targetBase = `${origin}/instructor/claim`
      } else if (parsedState.instructorLogin) {
        targetBase = `${origin}/instructor`
      } else if (parsedState.courses) {
        coursesParam = `&courses=${encodeURIComponent(parsedState.courses)}`
      } else if (parsedState.url && parsedState.url.startsWith('http')) {
        targetBase = parsedState.url
      }
    } catch {}
  }
  const sep = targetBase.includes('?') ? '&' : '?'
  const detailParam = detail ? `&detail=${encodeURIComponent(detail)}` : ''
  return `${targetBase}${sep}error=${errorCode}${detailParam}${coursesParam}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const flow = detectFlow(state)
  const origin = new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(new URL(buildFailureRedirect(origin, state, 'line_denied'), request.url))
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

    // Token 交換失敗時記錄詳細錯誤（順便記錄 error code + state 內容，方便之後判斷是哪個流程／裝置觸發的）
    if (!tokenData.access_token) {
      console.error('LINE token error:', JSON.stringify(tokenData))
      await logLineLoginFail({
        stage: 'token_exchange',
        reason: tokenData.error_description || 'no_token',
        errorCode: tokenData.error || null,
        hasState: !!state,
        userAgent: request.headers.get('user-agent') || null,
        flow,
      })
      return NextResponse.redirect(new URL(buildFailureRedirect(origin, state, 'line_failed', tokenData.error_description || 'no_token'), request.url))
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
      await logLineLoginFail({ stage: 'profile_fetch', reason: 'no_user_id', flow })
      return NextResponse.redirect(new URL(buildFailureRedirect(origin, state, 'line_failed'), request.url))
    }

    // Step 2.5: 講師中台登入／邀請連結綁定分流（跟居民報名流程互不影響）
    if (state) {
      try {
        const parsedState = JSON.parse(decodeURIComponent(state))

        if (parsedState.instructorClaim) {
          const supabase = createServerClient()
          const claimTokenPreview = typeof parsedState.instructorClaim === 'string'
            ? parsedState.instructorClaim.slice(0, 12)
            : String(parsedState.instructorClaim)
          const { data: matched, error: claimLookupError } = await supabase
            .from('instructors')
            .select('id, claim_token_expires_at')
            .eq('claim_token', parsedState.instructorClaim)
            .maybeSingle()

          // 之前這裡完全沒檢查 error，查詢本身失敗（例如權限、連線問題）會跟「單純沒配對到」
          // 混在一起變成同一種「無效」訊息，完全查不出真正原因 —— 這裡分開記錄
          if (claimLookupError) {
            console.error('instructor claim token lookup error:', claimLookupError)
            await logLineLoginFail({
              stage: 'instructor_claim_token_mismatch',
              reason: 'lookup_error',
              dbError: claimLookupError.message,
              tokenPreview: claimTokenPreview,
            })
            return NextResponse.redirect(new URL('/instructor/claim?error=invalid', origin))
          }

          if (!matched) {
            // 常見原因：講師登入 LINE 授權期間，後台又重新產生了一次邀請連結，
            // 舊的 claim_token 瞬間被覆蓋掉，導致這裡查不到對應的講師 —— 補上記錄方便日後對照
            console.error('instructor claim token not found, tokenPreview:', claimTokenPreview)
            await logLineLoginFail({ stage: 'instructor_claim_token_mismatch', reason: 'claim_token_not_found', tokenPreview: claimTokenPreview })
            return NextResponse.redirect(new URL('/instructor/claim?error=invalid', origin))
          }
          if (matched.claim_token_expires_at && new Date(matched.claim_token_expires_at) < new Date()) {
            await logLineLoginFail({ stage: 'instructor_claim_token_mismatch', reason: 'claim_token_expired', instructorId: matched.id, tokenPreview: claimTokenPreview })
            return NextResponse.redirect(new URL('/instructor/claim?error=expired', origin))
          }

          const { error: bindError } = await supabase
            .from('instructors')
            .update({ line_user_id: lineUserId, claim_token: null, claim_token_expires_at: null })
            .eq('id', matched.id)

          if (bindError) {
            // 這裡之前完全沒有寫入 funnel_logs，只有 console.error（看不到），
            // 是這幾次講師綁定一直查不到任何紀錄的真正原因。
            // 最常見成因：這個 LINE 帳號已經綁定在「別的」講師資料上（line_user_id 有 UNIQUE constraint），
            // 例如同一個人有兩筆講師資料（一筆用中文名、一筆用英文名），其中一筆已經綁過了
            console.error('instructor claim bind error:', bindError)
            await logLineLoginFail({
              stage: 'instructor_claim_bind_error',
              reason: bindError.message,
              instructorId: matched.id,
              lineUserId,
            })
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
    await logLineLoginFail({ stage: 'unexpected', reason: err?.message || String(err), flow })
    return NextResponse.redirect(new URL(buildFailureRedirect(origin, state, 'line_failed'), request.url))
  }
}
