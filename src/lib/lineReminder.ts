// 上課前一天 LINE 提醒：純函式（日期計算、分組、訊息內容），給 /api/cron/course-reminders 使用。

export type ReminderCourse = {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time_start: string | null // HH:MM:SS
  time_end: string | null
  location: string | null
}

export type ReminderRecipient = {
  lineUserId: string
  name: string | null
  courses: ReminderCourse[]
}

export type ReminderRegistration = {
  lineUserId: string | null
  name: string | null
  course: ReminderCourse
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 台灣時間的「明天」，YYYY-MM-DD。Vercel 排程跑在 UTC，不能直接用 new Date() 的日期。 */
/** 台灣時間的今天（YYYY-MM-DD）與現在時刻（HH:MM:SS），一次性發送判斷「課程開始了沒」用 */
export function nowInTaipei(now: Date = new Date()): { date: string; time: string } {
  const iso = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString()
  return { date: iso.slice(0, 10), time: iso.slice(11, 19) }
}

export function tomorrowInTaipei(now: Date = new Date()): string {
  const taipei = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  taipei.setUTCDate(taipei.getUTCDate() + 1)
  return taipei.toISOString().slice(0, 10)
}

/** 同一個 LINE 帳號隔天有多堂課 → 合併成一位收件人；沒有 LINE ID 的報名直接略過。 */
export function groupByRecipient(regs: ReminderRegistration[]): ReminderRecipient[] {
  const map = new Map<string, ReminderRecipient>()
  for (const r of regs) {
    if (!r.lineUserId) continue
    const existing = map.get(r.lineUserId)
    if (existing) {
      if (!existing.name && r.name) existing.name = r.name
      if (!existing.courses.some(c => c.id === r.course.id)) existing.courses.push(r.course)
    } else {
      map.set(r.lineUserId, { lineUserId: r.lineUserId, name: r.name, courses: [r.course] })
    }
  }
  const recipients = Array.from(map.values())
  for (const rec of recipients) {
    rec.courses.sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? ''))
  }
  return recipients
}

function hhmm(t: string | null): string {
  return t ? t.slice(0, 5) : ''
}

function courseBlock(c: ReminderCourse): string {
  const time = [hhmm(c.time_start), hhmm(c.time_end)].filter(Boolean).join('–')
  const lines = [`【${c.title}】`]
  if (time) lines.push(`時間：${time}`)
  if (c.location) lines.push(`地點：${c.location}`)
  return lines.join('\n')
}

export function buildReminderText(rec: ReminderRecipient, siteUrl: string, when: 'today' | 'tomorrow' = 'tomorrow'): string {
  const dayWord = when === 'today' ? '今天' : '明天'
  const date = rec.courses[0].date
  const [, m, d] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]
  const greeting = rec.name ? `${rec.name} 您好` : '您好'
  const count = rec.courses.length
  const intro = count > 1
    ? `${greeting}，提醒您${dayWord} ${m}/${d}（${weekday}）有 ${count} 堂報名的課程：`
    : `${greeting}，提醒您${dayWord} ${m}/${d}（${weekday}）有報名的課程：`
  return [
    intro,
    rec.courses.map(courseBlock).join('\n\n'),
    `若無法出席，請點下方連結取消報名，把名額留給其他鄰居，謝謝！\n${siteUrl}/profile?from=line_reminder`,
  ].join('\n\n')
}
