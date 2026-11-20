import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import {
  buildReminderText,
  groupByRecipient,
  tomorrowInTaipei,
  type ReminderRegistration,
} from '@/lib/lineReminder'

// 上課前一天 LINE 提醒。Vercel Cron 每天台灣時間 18:00 左右呼叫（vercel.json：UTC 10:00）。
// - 找出明天的課程、仍有效（confirmed）的預先報名，同一人多堂課合併成一則
// - 用 LINE 官方帳號「央北跨世代共居」的 Messaging API push 給個人，不是群發
// - 每人每天只發一次：先在 line_reminder_logs 佔位（unique line_user_id + course_date），重跑不會重複發
// - 發送前查 LINE 當月剩餘額度，不夠就只發得完的部分，其餘記 skipped_quota（免費方案超量只會發不出去，不會扣款）
// 測試：GET ?dry=1（可加 &date=YYYY-MM-DD）只回傳會發給誰、內容是什麼，不會真的發送。
// 需要環境變數：CRON_SECRET、LINE_MESSAGING_CHANNEL_ACCESS_TOKEN；
// 選填：LINE_REMINDER_ADMIN_USER_IDS（逗號分隔，額度剩不到 LOW_QUOTA_THRESHOLD 時通知這些管理員）

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE_URL = 'https://yangbei-campaign.vercel.app'
const LINE_API = 'https://api.line.me/v2/bot'
const LOW_QUOTA_THRESHOLD = 30

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
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry') === '1'
  const dateParam = url.searchParams.get('date')
  // 指定日期只開放給 dry run，避免誤發非隔天的提醒
  const courseDate = dryRun && dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : tomorrowInTaipei()

  const supabase = createServerClient()
  const { data: courses, error: courseErr } = await supabase
    .from('courses')
    .select('id, title, date, time_start, time_end, location')
    .eq('date', courseDate)
  if (courseErr) return NextResponse.json({ ok: false, error: courseErr.message }, { status: 500 })
  if (!courses?.length) return NextResponse.json({ ok: true, courseDate, recipients: 0, note: 'no courses' })

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
      return {
        lineUserId: u?.line_id || r.resident_line_id || null,
        name: u?.name || r.resident_name || null,
        course: courseById.get(r.course_id)!,
      }
    })
  const recipients = groupByRecipient(rows)

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      courseDate,
      recipients: recipients.length,
      preview: recipients.map(r => ({
        lineUserId: `${r.lineUserId.slice(0, 6)}…`,
        courses: r.courses.map(c => c.title),
        text: buildReminderText(r, SITE_URL),
      })),
    })
  }

  const token = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
  if (!token) return NextResponse.json({ ok: false, error: 'LINE_MESSAGING_CHANNEL_ACCESS_TOKEN not set' }, { status: 500 })

  // 已經處理過的人（重跑排程時）直接跳過
  const { data: done } = await supabase
    .from('line_reminder_logs')
    .select('line_user_id')
    .eq('course_date', courseDate)
  const doneIds = new Set((done ?? []).map(d => d.line_user_id))
  const pending = recipients.filter(r => !doneIds.has(r.lineUserId))

  let remaining = await remainingQuota(token)
  const result = { sent: 0, failed: 0, skippedQuota: 0, alreadyDone: recipients.length - pending.length }

  for (const rec of pending) {
    const courseIds = rec.courses.map(c => c.id)
    const quotaOut = remaining !== null && remaining <= 0
    // 佔位：unique (line_user_id, course_date)，同時跑兩次也只有一邊能插入
    const { error: claimErr } = await supabase.from('line_reminder_logs').insert({
      course_date: courseDate,
      line_user_id: rec.lineUserId,
      course_ids: courseIds,
      status: quotaOut ? 'skipped_quota' : 'sending',
    })
    if (claimErr) { result.alreadyDone++; continue }
    if (quotaOut) { result.skippedQuota++; continue }

    const r = await pushText(token, rec.lineUserId, buildReminderText(rec, SITE_URL))
    await supabase
      .from('line_reminder_logs')
      .update(r.ok ? { status: 'sent' } : { status: 'failed', error: r.error })
      .eq('line_user_id', rec.lineUserId)
      .eq('course_date', courseDate)
    if (r.ok) {
      result.sent++
      if (remaining !== null) remaining--
    } else {
      result.failed++
    }
  }

  // 額度快用完時通知管理員（這則本身也會用掉額度，所以只在真的偏低時發）
  const adminIds = (process.env.LINE_REMINDER_ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (adminIds.length && remaining !== null && remaining !== Infinity && remaining < LOW_QUOTA_THRESHOLD && remaining > 0) {
    const note = result.skippedQuota
      ? `【報名系統】本月 LINE 訊息額度已用完，明天的課程提醒有 ${result.skippedQuota} 人沒發出去。`
      : `【報名系統】本月 LINE 訊息額度剩約 ${remaining - adminIds.length} 則，額度用完後課程提醒會暫停發送。`
    for (const id of adminIds.slice(0, remaining)) await pushText(token, id, note)
  }

  return NextResponse.json({ ok: true, courseDate, recipients: recipients.length, remaining, ...result })
}
