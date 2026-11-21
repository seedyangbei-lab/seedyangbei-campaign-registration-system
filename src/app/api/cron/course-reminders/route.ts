import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { isAuthorizedCron } from '@/lib/cronAuth'
import {
  buildReminderText,
  groupByRecipient,
  nowInTaipei,
  tomorrowInTaipei,
  type ReminderRegistration,
} from '@/lib/lineReminder'

// 上課前一天 LINE 提醒。Vercel Cron 每天台灣時間 18:00 左右呼叫（vercel.json：UTC 10:00）。
// - 找出明天的課程、仍有效（confirmed）的預先報名，同一人多堂課合併成一則
// - 用 LINE 官方帳號「央北跨世代共居」的 Messaging API push 給個人，不是群發
// - 每人每天只發一次：先在 line_reminder_logs 佔位（unique line_user_id + course_date），重跑不會重複發
// - 發送前查 LINE 當月剩餘額度，不夠就只發得完的部分，其餘記 skipped_quota（免費方案超量只會發不出去，不會扣款）
// 測試：GET ?dry=1（可加 &date=YYYY-MM-DD）只回傳會發給誰、內容是什麼，不會真的發送。
// 發送模式 LINE_REMINDER_MODE（沒設定＝off，什麼都不發，合併上線也安全）：
//   off  — 不發送
//   test — 只發給 LINE_REMINDER_TEST_USER_IDS（逗號分隔的 LINE 使用者 ID），其他人一律略過
//   live — 正式發給所有隔天有報名的學員
// 一次性發送 LINE_REMINDER_ONE_OFF_COURSE_ID（選填）：填課程 ID 時，若那堂課是「今天」且還沒開始，
//   這次執行只發這堂課的「今天」提醒給它的報名者（仍受 test/live 模式限制），不做平常的明天提醒。
//   一過開課時間就自動失效、恢復平常流程，所以不用記得刪掉。
// 需要環境變數：CRON_SECRET、LINE_MESSAGING_CHANNEL_ACCESS_TOKEN；
// 選填：LINE_REMINDER_ADMIN_USER_IDS（逗號分隔的管理員 LINE ID；額度快用完、額度不足時各通知一次，每月最多兩則）
//
// 節省額度／防濫用：
// - 只有帶正確 CRON_SECRET 的請求能觸發（見 lib/cronAuth.ts）；按很多次 Run 也不會重複發（每人每天一筆紀錄）
// - 發送前先查是否為官方帳號好友（查詢不算訊息則數），沒加好友或已封鎖的人不發，記 skipped_not_friend
// - 正式模式略過不公開（is_active=false）的課程；同一人一天最多一則，不論報了幾堂、用了幾個報名
// - 保留 LINE_REMINDER_RESERVE 則（預設 5）不給提醒用，留給管理員通知或臨時公告

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE_URL = 'https://yangbei-campaign.vercel.app'
const LINE_API = 'https://api.line.me/v2/bot'
const LOW_QUOTA_THRESHOLD = 30
const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/
// 這些狀態下次排程重跑時可以再試（例如當天才加好友、月初額度恢復）
const RETRYABLE = new Set(['skipped_not_friend', 'skipped_quota'])

type LineResult = { ok: true } | { ok: false; error: string }

async function lineFetch(path: string, token: string, init?: RequestInit) {
  return fetch(`${LINE_API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
}

/** 當月剩餘可發則數；方案沒有上限時回 Infinity，查不到時回 null。 */
async function remainingQuota(token: string): Promise<number | null> {
  try {
    const [q, c] = await Promise.all([
      lineFetch('/message/quota', token),
      lineFetch('/message/quota/consumption', token),
    ])
    if (!q.ok || !c.ok) return null
    const quota = await q.json() as { type: string; value?: number }
    const used = await c.json() as { totalUsage: number }
    if (quota.type !== 'limited' || quota.value == null) return Infinity
    return Math.max(0, quota.value - used.totalUsage)
  } catch {
    return null
  }
}

/** 是否為官方帳號好友（未加好友或已封鎖會回 404）。查不到時當作是，交給 push 決定。 */
async function isFriend(token: string, userId: string): Promise<boolean> {
  try {
    const res = await lineFetch(`/profile/${userId}`, token)
    return res.status !== 404
  } catch {
    return true
  }
}

async function pushText(token: string, to: string, text: string): Promise<LineResult> {
  try {
    const res = await lineFetch('/message/push', token, {
      method: 'POST',
      headers: { 'X-Line-Retry-Key': randomUUID() },
      body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
    })
    if (res.ok) return { ok: true }
    return { ok: false, error: `${res.status} ${(await res.text()).slice(0, 300)}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry') === '1'
  const dateParam = url.searchParams.get('date')
  // 指定日期只開放給 dry run，避免誤發非隔天的提醒
  const mode = process.env.LINE_REMINDER_MODE || 'off'
  const supabase = createServerClient()

  // 一次性發送：指定的課程是今天、而且還沒開始，才改成只發這堂課
  const oneOffId = (process.env.LINE_REMINDER_ONE_OFF_COURSE_ID || '').trim()
  let oneOff = false
  if (/^[0-9a-f-]{36}$/.test(oneOffId)) {
    const now = nowInTaipei()
    const { data: c } = await supabase.from('courses').select('date, time_start').eq('id', oneOffId).maybeSingle()
    oneOff = !!c && c.date === now.date && (c.time_start ?? '00:00:00') > now.time
  }
  const when: 'today' | 'tomorrow' = oneOff ? 'today' : 'tomorrow'
  const courseDate = oneOff
    ? nowInTaipei().date
    : dryRun && dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : tomorrowInTaipei()

  let courseQuery = supabase
    .from('courses')
    .select('id, title, date, time_start, time_end, location')
    .eq('date', courseDate)
  if (oneOff) courseQuery = courseQuery.eq('id', oneOffId)
  // 正式模式只提醒公開中的課程；測試模式允許不公開的測試課
  if (mode !== 'test') courseQuery = courseQuery.eq('is_active', true)
  const { data: courses, error: courseErr } = await courseQuery
  if (courseErr) return NextResponse.json({ ok: false, error: courseErr.message }, { status: 500 })
  if (!courses?.length) return NextResponse.json({ ok: true, mode, oneOff, courseDate, recipients: 0, note: 'no courses' })

  const { data: regs, error: regErr } = await supabase
    .from('registrations')
    .select('course_id, resident_name, resident_line_id, is_walk_in, users(name, line_id)')
    .in('course_id', courses.map(c => c.id))
    .eq('status', 'confirmed')
  if (regErr) return NextResponse.json({ ok: false, error: regErr.message }, { status: 500 })

  const courseById = new Map(courses.map(c => [c.id, c]))
  const rows: ReminderRegistration[] = (regs ?? [])
    .filter(r => !r.is_walk_in)
    .map(r => {
      const u = (Array.isArray(r.users) ? r.users[0] : r.users) as { name: string | null; line_id: string | null } | null
      const lineUserId = u?.line_id || r.resident_line_id || null
      return {
        // 格式不對的 ID 一定發不出去，直接略過
        lineUserId: lineUserId && LINE_USER_ID_RE.test(lineUserId) ? lineUserId : null,
        name: u?.name || r.resident_name || null,
        course: courseById.get(r.course_id)!,
      }
    })
  const testIds = new Set((process.env.LINE_REMINDER_TEST_USER_IDS || '').split(',').map(x => x.trim()).filter(Boolean))
  const allRecipients = groupByRecipient(rows)
  const recipients = mode === 'test' ? allRecipients.filter(r => testIds.has(r.lineUserId)) : allRecipients

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      mode,
      oneOff,
      courseDate,
      allRecipients: allRecipients.length,
      recipients: recipients.length,
      preview: recipients.map(r => ({
        lineUserId: `${r.lineUserId.slice(0, 6)}…`,
        courses: r.courses.map(c => c.title),
        text: buildReminderText(r, SITE_URL, when),
      })),
    })
  }

  if (mode !== 'test' && mode !== 'live') {
    return NextResponse.json({ ok: true, mode, courseDate, note: 'reminders disabled (LINE_REMINDER_MODE is not test/live)' })
  }

  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 })

  // 已發過、發送中、發送失敗的人跳過；沒加好友／額度不足而略過的人，這次可以再試
  const { data: existing } = await supabase
    .from('line_reminder_logs')
    .select('line_user_id, status')
    .eq('course_date', courseDate)
  const existingStatus = new Map((existing ?? []).map(e => [e.line_user_id, e.status as string]))
  const pending = recipients.filter(r => {
    const st = existingStatus.get(r.lineUserId)
    return st === undefined || RETRYABLE.has(st)
  })

  const reserve = Math.max(0, Number(process.env.LINE_REMINDER_RESERVE ?? 5) || 0)
  const quota = await remainingQuota(token)
  let budget = quota === null ? Infinity : quota - reserve
  const result = {
    sent: 0, failed: 0, skippedNotFriend: 0, skippedQuota: 0,
    alreadyDone: recipients.length - pending.length,
  }

  for (const rec of pending) {
    const courseIds = rec.courses.map(c => c.id)
    const prev = existingStatus.get(rec.lineUserId)

    // 先確認是好友（不耗額度），沒加好友的人不浪費一則
    let status: 'sending' | 'skipped_not_friend' | 'skipped_quota' = 'sending'
    if (!(await isFriend(token, rec.lineUserId))) status = 'skipped_not_friend'
    else if (budget <= 0) status = 'skipped_quota'

    // 佔位：新的一筆用 insert（unique 擋重複）；重試的一筆只在狀態仍是可重試時才改成 sending
    if (prev === undefined) {
      const { error } = await supabase.from('line_reminder_logs').insert({
        course_date: courseDate, line_user_id: rec.lineUserId, course_ids: courseIds, status,
      })
      if (error) { result.alreadyDone++; continue }
    } else {
      const { data: claimed } = await supabase.from('line_reminder_logs')
        .update({ status, course_ids: courseIds, error: null })
        .eq('course_date', courseDate).eq('line_user_id', rec.lineUserId).eq('status', prev)
        .select('id')
      if (!claimed?.length) { result.alreadyDone++; continue }
    }
    if (status === 'skipped_not_friend') { result.skippedNotFriend++; continue }
    if (status === 'skipped_quota') { result.skippedQuota++; continue }

    const r = await pushText(token, rec.lineUserId, buildReminderText(rec, SITE_URL, when))
    await supabase
      .from('line_reminder_logs')
      .update(r.ok ? { status: 'sent' } : { status: 'failed', error: r.error })
      .eq('line_user_id', rec.lineUserId)
      .eq('course_date', courseDate)
    if (r.ok) {
      result.sent++
      budget--
    } else {
      result.failed++
    }
  }

  // 通知管理員，每月最多兩次（各記一筆在當月 1 號，所以不會重複）：
  //   low — 剩不到 LOW_QUOTA_THRESHOLD 則，提早一週左右示警
  //   out — 額度不足、有人沒收到提醒
  // 這兩則從保留額度支出，不會擠掉學員的提醒
  const remaining = quota === null ? null : quota - result.sent
  const adminIds = (process.env.LINE_REMINDER_ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(id => LINE_USER_ID_RE.test(id))
  const alerts: { kind: string; text: string }[] = []
  if (remaining !== null && remaining !== Infinity) {
    if (result.skippedQuota > 0) {
      alerts.push({ kind: 'out', text: `【報名系統】本月 LINE 訊息額度不足，${courseDate.slice(5).replace('-', '/')} 的課程提醒有 ${result.skippedQuota} 人沒收到。下個月額度恢復後會自動繼續，必要時請人工通知。` })
    } else if (remaining < LOW_QUOTA_THRESHOLD) {
      alerts.push({ kind: 'low', text: `【報名系統】本月 LINE 訊息額度剩約 ${remaining} 則，用完後課程提醒會暫停到下個月。這段期間請避免從官方帳號群發訊息。` })
    }
  }
  let alertBudget = remaining === null ? 0 : remaining
  for (const alert of alerts) {
    for (const id of adminIds) {
      if (alertBudget <= 0) break
      const { error } = await supabase.from('line_reminder_logs').insert({
        course_date: `${courseDate.slice(0, 7)}-01`, line_user_id: `admin-${alert.kind}:${id}`, course_ids: [], status: 'admin_alert',
      })
      if (error) continue // 這個月已經通知過
      const r = await pushText(token, id, alert.text)
      if (r.ok) alertBudget--
    }
  }

  return NextResponse.json({ ok: true, mode, oneOff, courseDate, recipients: recipients.length, remaining, reserve, ...result })
}
