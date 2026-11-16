// 系列課程：同一門課在不同日期各開一堂（courses 每天一筆），用 courses.series_key 串起來。
// 海報上要把這些日期併成一張，這裡只負責「把一堂課的海報資料換成系列版」，不碰資料庫與畫布。

import type { PosterCourseData } from '@/components/posterEditor/shared'

export interface SeriesSibling {
  date?: string | null
  time_start?: string | null
  time_end?: string | null
}

// 日期徽章（海報寬只有 210px、可用約 178px）塞得下的字數上限；超過就不再附時間，避免超出海報邊界
const BADGE_MAX_CHARS = 28

// 「央北散步趣12/3」→「央北散步趣」。講師原本靠標題尾巴的日期區分每一天，併成一張後要拿掉
export function seriesBaseTitle(title: string): string {
  const base = (title || '').replace(/\s*[（(]?\s*\d{1,2}\s*\/\s*\d{1,2}\s*[）)]?\s*$/, '').trim()
  return base || title
}

// ['2026-12-10','2026-12-03'] → '12/3、12/10'
export function formatSeriesDates(dates: string[]): string {
  return Array.from(new Set(dates.filter(Boolean)))
    .sort()
    .map(d => {
      const [, m, day] = d.split('-')
      return `${parseInt(m, 10)}/${parseInt(day, 10)}`
    })
    .join('、')
}

const hhmm = (t?: string | null) => (t || '').slice(0, 5)

// 把單堂課的海報資料換成系列版：標題去掉日期尾巴、日期列出全部日期。
// siblings 要包含這堂課自己；少於 2 堂就原樣回傳（單次課程完全不受影響）。
export function mergeSeriesForPoster(poster: PosterCourseData, siblings: SeriesSibling[]): PosterCourseData {
  const dated = siblings.filter(s => s.date)
  if (new Set(dated.map(s => s.date)).size < 2) return poster

  const dates = formatSeriesDates(dated.map(s => s.date as string))
  const sameTime = dated.every(s => hhmm(s.time_start) === hhmm(dated[0].time_start) && hhmm(s.time_end) === hhmm(dated[0].time_end))
  const withTime = sameTime && `${dates} · ${poster.timeStart || ''} – ${poster.timeEnd || ''}`.length <= BADGE_MAX_CHARS

  return {
    ...poster,
    title: seriesBaseTitle(poster.title),
    date: dates,
    timeStart: withTime ? poster.timeStart : '',
    timeEnd: withTime ? poster.timeEnd : '',
  }
}
