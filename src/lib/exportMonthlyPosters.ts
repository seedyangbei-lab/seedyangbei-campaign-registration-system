'use client'

import JSZip from 'jszip'
import {
  PosterCourseData, ExportPosterParams, renderPosterBlob, loadAllGoogleFonts, SCHEMES,
  DotShape, DotCoverage, DotArrangement,
  fetchInstructorsPosterSettings,
} from '@/components/posterEditor/shared'

// 海報編輯器「儲存設定」是每位講師各自獨立的（見 shared.tsx 的 fetchInstructorsPosterSettings／
// saveInstructorPosterSettings，存在 instructors.poster_settings）。批次匯出時依每堂課的講師
// （instructor_ids[0]）分別套用該講師自己儲存的樣式，講師之間不會互相覆蓋；
// 講師若從未儲存過設定，該堂課的海報就套用預設樣式。

interface SavedPosterSettings {
  schemeId: string
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
    schemeId: typeof s.schemeId === 'string' ? s.schemeId : defaults.schemeId,
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

const DEFAULT_POSTER_SETTINGS: SavedPosterSettings = {
  schemeId: SCHEMES[0].id,
  customBg: '',
  dotShape: 'circle', dotCustomChar: '央', dotColor: '', dotOpacity: 30, dotSize: 6,
  dotDensity: 50, dotCoverage: 'photo', dotArrangement: 'grid',
  textColorOverride: '', enTextColorOverride: '',
  borderOn: true, borderText: 'YANGBEI COMMUNITY · SEED COURSE · ',
  zhFontValue: ZH_FONT_VALUES[0], enFontValue: EN_FONT_VALUES[0],
  zhFontSize: 17, enFontSize: 9, letterSpacingPct: 2, lineSpacingMult: 1.5,
}

interface ResolvedPosterStyle {
  activeBg: string; tc: string; enTc: string; dotOn: boolean; dotFill: string; iconColor: string
  dotShape: DotShape; dotCustomChar: string; dotOpacity: number; dotSize: number; dotDensity: number
  dotCoverage: DotCoverage; dotArrangement: DotArrangement
  borderOn: boolean; borderText: string
  enFontValue: string; zhFontValue: string; zhFontSize: number; enFontSize: number
  zhLetterPx: number; enLetterPx: number; locFontSize: number; borderFontSize: number; titleGap: number
}

function resolvePosterStyle(raw: any): ResolvedPosterStyle {
  const settings = normalizeSavedSettings(raw || {}, DEFAULT_POSTER_SETTINGS)
  const activeBg = settings.customBg || SCHEMES.find(s => s.id === settings.schemeId)?.bg || DEFAULT_SCHEME_BG
  const tc = settings.textColorOverride || textCol(activeBg)
  const enTc = settings.enTextColorOverride || tc
  return {
    activeBg, tc, enTc,
    dotOn: settings.dotShape !== 'none',
    dotFill: settings.dotColor || activeBg,
    iconColor: settings.dotColor || tc,
    dotShape: settings.dotShape, dotCustomChar: settings.dotCustomChar,
    dotOpacity: settings.dotOpacity, dotSize: settings.dotSize, dotDensity: settings.dotDensity,
    dotCoverage: settings.dotCoverage, dotArrangement: settings.dotArrangement,
    borderOn: settings.borderOn, borderText: settings.borderText,
    enFontValue: settings.enFontValue, zhFontValue: settings.zhFontValue,
    zhFontSize: settings.zhFontSize, enFontSize: settings.enFontSize,
    zhLetterPx: settings.zhFontSize * (settings.letterSpacingPct / 100),
    enLetterPx: settings.enFontSize * (settings.letterSpacingPct / 100),
    locFontSize: Math.max(8, Math.round(settings.zhFontSize * 0.53)),
    borderFontSize: Math.max(4, +(settings.enFontSize * 0.61).toFixed(1)),
    titleGap: Math.round(6 * settings.lineSpacingMult),
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
  instructor_ids?: string[]
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

  const target = courses
    .filter(c => month ? c.date?.startsWith(month) : true)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  // 每堂課以「主要講師」（instructor_ids[0]）的已儲存設定為準；一次批次查詢，避免逐堂課各打一次 API
  const instructorIds = target.map(c => c.instructor_ids?.[0]).filter((id): id is string => !!id)
  const settingsByInstructor = await fetchInstructorsPosterSettings(instructorIds)

  const zip = new JSZip()
  let exportedCount = 0
  let skippedCount = 0

  for (const course of target) {
    const imgSrc = (course.photo_urls && course.photo_urls.length > 0) ? course.photo_urls[0] : (course.poster_url || null)
    if (!imgSrc) { skippedCount++; continue }

    const instructorId = course.instructor_ids?.[0]
    const style = resolvePosterStyle(instructorId ? settingsByInstructor[instructorId] : null)

    const posterCourse: PosterCourseData = {
      id: course.id, title: course.title, date: course.date,
      timeStart: (course.time_start || '').slice(0, 5), timeEnd: (course.time_end || '').slice(0, 5),
      location: course.location, instructor: (course.instructor_names || []).join('、'),
    }
    const params: ExportPosterParams = {
      course: posterCourse, activeBg: style.activeBg, tc: style.tc, enTc: style.enTc, iconColor: style.iconColor,
      dotFill: style.dotFill, dotOn: style.dotOn, dotShape: style.dotShape, dotCustomChar: style.dotCustomChar,
      dotOpacity: style.dotOpacity, dotSize: style.dotSize, dotDensity: style.dotDensity,
      dotCoverage: style.dotCoverage, dotArrangement: style.dotArrangement, dotSeed: 42,
      borderOn: style.borderOn, borderText: style.borderText,
      imgSrc, imgPos: { x: 0, y: 0 }, imgScale: 1,
      enFontValue: style.enFontValue, zhFontValue: style.zhFontValue,
      zhFontSize: style.zhFontSize, enFontSize: style.enFontSize,
      zhLetterPx: style.zhLetterPx, enLetterPx: style.enLetterPx,
      locFontSize: style.locFontSize, borderFontSize: style.borderFontSize, titleGap: style.titleGap,
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
