'use client'

import JSZip from 'jszip'
import {
  PosterCourseData, ExportPosterParams, renderPosterBlob, loadAllGoogleFonts,
  DotShape, DotCoverage, DotArrangement,
  POSTER_SETTINGS_STORAGE_KEY, fetchGlobalPosterSettings,
} from '@/components/posterEditor/shared'

// 海報編輯器「儲存設定」用的全域樣式（scheme／字體／裝飾點……）。
// 講師按下「完成！儲存檔案」時會同步寫入 site_settings（見 shared.tsx 的 saveGlobalPosterSettings），
// 這裡優先讀雲端最新版本，讓中台批次匯出即使跟講師不同裝置／瀏覽器也能拿到最新樣式；
// 讀取失敗（離線等）才退回本機快取，最後才是預設值。

interface SavedPosterSettings {
  customBg: string
  dotShape: DotShape; dotCustomChar: string; dotColor: string
  dotOpacity: number; dotSize: number; dotDensity: number
  dotCoverage: DotCoverage; dotArrangement: DotArrangement
  textColorOverride: string; enTextColorOverride: string
  borderOn: boolean; borderText: string
  zhFontValue: string; enFontValue: string
  zhFontSize: number; enFontSize: number
  letterSpacingPct: number; lineSpacingMult: number
}

const DEFAULT_SCHEME_BG = '#C13A1F' // 對應 shared.tsx SCHEMES 的第一色（熔岩橘）
const ZH_FONT_VALUES = [
  "'Noto Sans TC', sans-serif", "'Zen Kaku Gothic New', sans-serif", "'Noto Serif TC', serif",
  "'Zen Maru Gothic', sans-serif", "'cwTeX Kai', serif", "'cwTeX Yen', sans-serif",
  "'Klee One', sans-serif", "'Zen Old Mincho', serif",
]
const EN_FONT_VALUES = [
  "'Outfit', sans-serif", "'Space Mono', monospace", "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "'Betania Patmos', 'Playfair Display', serif", "'Space Grotesk', sans-serif", "'Instrument Serif', serif",
  "'DM Sans', sans-serif", "'Bricolage Grotesque', sans-serif",
]

function normalizeSavedSettings(s: any, defaults: SavedPosterSettings): SavedPosterSettings {
  return {
    customBg: typeof s.customBg === 'string' ? s.customBg : defaults.customBg,
    dotShape: typeof s.dotShape === 'string' ? s.dotShape : defaults.dotShape,
    dotCustomChar: typeof s.dotCustomChar === 'string' ? s.dotCustomChar : defaults.dotCustomChar,
    dotColor: typeof s.dotColor === 'string' ? s.dotColor : defaults.dotColor,
    dotOpacity: typeof s.dotOpacity === 'number' ? s.dotOpacity : defaults.dotOpacity,
    dotSize: typeof s.dotSize === 'number' ? s.dotSize : defaults.dotSize,
    dotDensity: typeof s.dotDensity === 'number' ? s.dotDensity : defaults.dotDensity,
    dotCoverage: typeof s.dotCoverage === 'string' ? s.dotCoverage : defaults.dotCoverage,
    dotArrangement: typeof s.dotArrangement === 'string' ? s.dotArrangement : defaults.dotArrangement,
    textColorOverride: typeof s.textColorOverride === 'string' ? s.textColorOverride : defaults.textColorOverride,
    enTextColorOverride: typeof s.enTextColorOverride === 'string' ? s.enTextColorOverride : defaults.enTextColorOverride,
    borderOn: typeof s.borderOn === 'boolean' ? s.borderOn : defaults.borderOn,
    borderText: typeof s.borderText === 'string' ? s.borderText : defaults.borderText,
    zhFontValue: typeof s.zhFontIdx === 'number' ? (ZH_FONT_VALUES[s.zhFontIdx] || defaults.zhFontValue) : defaults.zhFontValue,
    enFontValue: typeof s.enFontIdx === 'number' ? (EN_FONT_VALUES[s.enFontIdx] || defaults.enFontValue) : defaults.enFontValue,
    zhFontSize: typeof s.zhFontSize === 'number' ? s.zhFontSize : defaults.zhFontSize,
    enFontSize: typeof s.enFontSize === 'number' ? s.enFontSize : defaults.enFontSize,
    letterSpacingPct: typeof s.letterSpacingPct === 'number' ? s.letterSpacingPct : defaults.letterSpacingPct,
    lineSpacingMult: typeof s.lineSpacingMult === 'number' ? s.lineSpacingMult : defaults.lineSpacingMult,
  }
}

async function loadSavedPosterSettings(): Promise<SavedPosterSettings> {
  const defaults: SavedPosterSettings = {
    customBg: '',
    dotShape: 'circle', dotCustomChar: '央', dotColor: '', dotOpacity: 30, dotSize: 6,
    dotDensity: 50, dotCoverage: 'photo', dotArrangement: 'grid',
    textColorOverride: '', enTextColorOverride: '',
    borderOn: true, borderText: 'YANGBEI COMMUNITY · SEED COURSE · ',
    zhFontValue: ZH_FONT_VALUES[0], enFontValue: EN_FONT_VALUES[0],
    zhFontSize: 17, enFontSize: 9, letterSpacingPct: 2, lineSpacingMult: 1.5,
  }

  const cloud = await fetchGlobalPosterSettings()
  if (cloud) return normalizeSavedSettings(cloud, defaults)

  try {
    const raw = localStorage.getItem(POSTER_SETTINGS_STORAGE_KEY)
    if (!raw) return defaults
    return normalizeSavedSettings(JSON.parse(raw), defaults)
  } catch (_e) {
    return defaults
  }
}

// 依明度決定文字顏色（跟 shared.tsx 的 lum/textCol 邏輯一致，這裡獨立算避免互相 import 造成耦合）
function lum(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function textCol(bg: string) { return lum(bg) > 0.35 ? '#111111' : '#ffffff' }

export interface MonthlyPosterCourse {
  id: string
  title: string
  date: string
  time_start?: string
  time_end?: string
  location?: string
  instructor_names?: string[]
  photo_urls?: string[]
  poster_url?: string | null
}

export interface MonthlyPosterExportResult {
  exportedCount: number
  skippedCount: number // 沒有照片可用而略過的課程數
}

function safeFileName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80) || '未命名課程'
}

export async function exportMonthlyPosters(courses: MonthlyPosterCourse[], month: string): Promise<MonthlyPosterExportResult> {
  loadAllGoogleFonts()
  const settings = await loadSavedPosterSettings()
  const activeBg = settings.customBg || DEFAULT_SCHEME_BG
  const tc = settings.textColorOverride || textCol(activeBg)
  const enTc = settings.enTextColorOverride || tc
  const dotOn = settings.dotShape !== 'none'
  const dotFill = settings.dotColor || activeBg
  const iconColor = settings.dotColor || tc
  const zhLetterPx = settings.zhFontSize * (settings.letterSpacingPct / 100)
  const enLetterPx = settings.enFontSize * (settings.letterSpacingPct / 100)
  const locFontSize = Math.max(8, Math.round(settings.zhFontSize * 0.53))
  const borderFontSize = Math.max(4, +(settings.enFontSize * 0.61).toFixed(1))
  const titleGap = Math.round(6 * settings.lineSpacingMult)

  const target = courses
    .filter(c => month ? c.date?.startsWith(month) : true)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const zip = new JSZip()
  let exportedCount = 0
  let skippedCount = 0

  for (const course of target) {
    const imgSrc = (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls[0] : (course.poster_url || null)
    if (!imgSrc) { skippedCount++; continue }

    const posterCourse: PosterCourseData = {
      id: course.id, title: course.title, date: course.date,
      timeStart: (course.time_start || '').slice(0, 5), timeEnd: (course.time_end || '').slice(0, 5),
      location: course.location, instructor: (course.instructor_names || []).join('、'),
    }
    const params: ExportPosterParams = {
      course: posterCourse, activeBg, tc, enTc, iconColor,
      dotFill, dotOn, dotShape: settings.dotShape, dotCustomChar: settings.dotCustomChar,
      dotOpacity: settings.dotOpacity, dotSize: settings.dotSize, dotDensity: settings.dotDensity,
      dotCoverage: settings.dotCoverage, dotArrangement: settings.dotArrangement, dotSeed: 42,
      borderOn: settings.borderOn, borderText: settings.borderText,
      imgSrc, imgPos: { x: 0, y: 0 }, imgScale: 1,
      enFontValue: settings.enFontValue, zhFontValue: settings.zhFontValue,
      zhFontSize: settings.zhFontSize, enFontSize: settings.enFontSize,
      zhLetterPx, enLetterPx, locFontSize, borderFontSize, titleGap,
    }

    try {
      const blob = await renderPosterBlob(params)
      zip.file(`${safeFileName(`${course.date}_${course.title}`)}.png`, blob)
      exportedCount++
    } catch (_e) {
      skippedCount++
    }
  }

  if (exportedCount === 0) return { exportedCount, skippedCount }

  const blob = await zip.generateAsync({ type: 'blob' })
  const label = month ? month.replace('-', '年') + '月' : '全部'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `央北社宅_${label}課程海報.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)

  return { exportedCount, skippedCount }
}
