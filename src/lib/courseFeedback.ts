// 課程回饋問卷：題目定義、填寫期限、統計計算。前台／中台／後台與 API route 共用，
// 題目文字、選項順序、期限規則只在這裡改一次，三端跟伺服器檢查才不會對不起來。

export const FEEDBACK_FORM_VERSION = 1

export type ScaleKey = 'q_admin' | 'q_promotion' | 'q_purpose' | 'q_content'
export type YesNoKey = 'q_community' | 'q_rejoin'

export type FeedbackAnswers = {
  q_admin: number | null
  q_promotion: number | null
  q_purpose: number | null
  q_content: number | null
  q_community: boolean | null
  q_rejoin: boolean | null
  comment: string
}

export const EMPTY_ANSWERS: FeedbackAnswers = {
  q_admin: null, q_promotion: null, q_purpose: null, q_content: null,
  q_community: null, q_rejoin: null, comment: '',
}

const SATISFACTION = ['非常滿意', '滿意', '尚可', '不滿意', '非常不滿意']
const SUFFICIENCY = ['非常足夠', '足夠', '尚可', '不足', '非常不足']

// 選項由正向排到負向（畫面上由上而下），存進資料庫的分數是 5 → 1
export type ScaleQuestion = { key: ScaleKey; type: 'scale'; label: string; shortLabel: string; options: string[] }
export type YesNoQuestion = { key: YesNoKey; type: 'yesno'; label: string; shortLabel: string }
export type FeedbackQuestion = ScaleQuestion | YesNoQuestion

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  { key: 'q_admin', type: 'scale', label: '您滿意種子行動活動的行政作業（含報名、行前通知等）嗎？', shortLabel: '行政作業', options: SATISFACTION },
  { key: 'q_promotion', type: 'scale', label: '您覺得種子行動活動的宣傳是否足夠？', shortLabel: '活動宣傳', options: SUFFICIENCY },
  { key: 'q_purpose', type: 'scale', label: '您清楚種子行動活動目的，與希望為社區帶來的影響嗎？', shortLabel: '活動目的', options: SATISFACTION },
  { key: 'q_content', type: 'scale', label: '您認為活動內容規劃安排（含講解內容、活動時間等）是否合適？', shortLabel: '內容安排', options: SATISFACTION },
  { key: 'q_community', type: 'yesno', label: '您認為種子行動活動是否有助於增加社區居民的互動性，進而達到活絡社區的效益？', shortLabel: '活絡社區' },
  { key: 'q_rejoin', type: 'yesno', label: '未來若舉辦相關類型的活動是否願意參與？', shortLabel: '願意再參與' },
]

export const SCALE_QUESTIONS = FEEDBACK_QUESTIONS.filter((q): q is ScaleQuestion => q.type === 'scale')
export const YESNO_QUESTIONS = FEEDBACK_QUESTIONS.filter((q): q is YesNoQuestion => q.type === 'yesno')

export const COMMENT_LABEL = '其他建議與回饋'
export const COMMENT_HINT = '開放填寫，如：參與心得、其他建議、對種子行動活動或社區發展的期許。'
export const COMMENT_MAX = 1000

// 分數（5~1）轉回畫面上的選項文字
export function scaleLabel(q: ScaleQuestion, score: number | null | undefined): string {
  if (!score) return '—'
  return q.options[5 - score] ?? '—'
}

// 回傳尚未作答的必填題 key（依題號順序），全部答完回傳空陣列
export function missingAnswers(a: FeedbackAnswers): (ScaleKey | YesNoKey)[] {
  return FEEDBACK_QUESTIONS.filter(q => a[q.key] === null || a[q.key] === undefined).map(q => q.key)
}

// 伺服器端用：把前端送來的答案整理成可寫入資料庫的欄位，格式不對回傳 null
export function sanitizeAnswers(raw: any): Omit<FeedbackAnswers, 'comment'> & { comment: string | null } | null {
  if (!raw || typeof raw !== 'object') return null
  const out: any = {}
  for (const q of SCALE_QUESTIONS) {
    const v = raw[q.key]
    if (!Number.isInteger(v) || v < 1 || v > 5) return null
    out[q.key] = v
  }
  for (const q of YESNO_QUESTIONS) {
    if (typeof raw[q.key] !== 'boolean') return null
    out[q.key] = raw[q.key]
  }
  const comment = typeof raw.comment === 'string' ? raw.comment.trim().slice(0, COMMENT_MAX) : ''
  out.comment = comment || null
  return out
}

/* ---------- 填寫期限 ---------- */

// 課程時間在資料庫存的是台灣當地的日期／時間（沒有時區）。伺服器跑在 UTC，
// 直接 new Date(`${date}T${time}`) 在伺服器端會差 8 小時，這裡一律明確加上 +08:00。
const TW_OFFSET = '+08:00'

export function courseStartAt(course: { date: string; time_start?: string | null }): Date {
  const time = (course.time_start || '00:00').slice(0, 5)
  return new Date(`${course.date}T${time}:00${TW_OFFSET}`)
}

// 期限：課程日期所在月份的最後一天 23:59:59（台灣時間）。例如 8/12 的課 → 8/31 23:59:59
function lastDayOfMonth(date: string): { y: number; m: number; lastDay: number } {
  const [y, m] = date.split('-').map(Number)
  return { y, m, lastDay: new Date(Date.UTC(y, m, 0)).getUTCDate() }
}

export function feedbackDeadline(course: { date: string }): Date {
  const { y, m, lastDay } = lastDayOfMonth(course.date)
  return new Date(`${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59${TW_OFFSET}`)
}

export type FeedbackWindow = 'not_started' | 'open' | 'closed'

export function feedbackWindow(course: { date: string; time_start?: string | null }, now = new Date()): FeedbackWindow {
  if (now < courseStartAt(course)) return 'not_started'
  if (now > feedbackDeadline(course)) return 'closed'
  return 'open'
}

// 只有這兩種報名狀態可以填（absent 代表講師確認沒來、cancelled 已取消）
export const FEEDBACK_ELIGIBLE_STATUSES = ['confirmed', 'attended']

export function formatDeadline(course: { date: string }): string {
  const { m, lastDay } = lastDayOfMonth(course.date)
  return `${m}/${lastDay}`
}

/* ---------- 統計 ---------- */

export type FeedbackRow = FeedbackAnswers & {
  id: string
  registration_id: string
  submitted_by: 'resident' | 'instructor'
  submitted_at: string
}

export type ScaleStat = { key: ScaleKey; average: number | null; positiveRate: number | null; distribution: number[] }
export type YesNoStat = { key: YesNoKey; yesCount: number; yesRate: number | null }
export type FeedbackStats = { count: number; scale: ScaleStat[]; yesno: YesNoStat[] }

// distribution 依畫面選項順序排列（index 0 = 非常滿意／非常足夠）。
// positiveRate = 前兩項（非常滿意＋滿意）佔比，是結案報告常用的「滿意度」。
export function computeFeedbackStats(rows: Pick<FeedbackAnswers, ScaleKey | YesNoKey>[]): FeedbackStats {
  const count = rows.length
  const scale = SCALE_QUESTIONS.map(q => {
    const distribution = [0, 0, 0, 0, 0]
    let sum = 0
    rows.forEach(r => {
      const v = r[q.key]
      if (v) { distribution[5 - v]++; sum += v }
    })
    return {
      key: q.key,
      average: count ? Math.round((sum / count) * 100) / 100 : null,
      positiveRate: count ? (distribution[0] + distribution[1]) / count : null,
      distribution,
    }
  })
  const yesno = YESNO_QUESTIONS.map(q => {
    const yesCount = rows.filter(r => r[q.key] === true).length
    return { key: q.key, yesCount, yesRate: count ? yesCount / count : null }
  })
  return { count, scale, yesno }
}

export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—'
  return `${Math.round(rate * 100)}%`
}
