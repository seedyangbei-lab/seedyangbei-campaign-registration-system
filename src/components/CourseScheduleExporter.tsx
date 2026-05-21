'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

interface Course {
  id: string; title: string; date: string
  time_start: string; time_end: string; location: string
  notes?: string; suitable_age?: string
  instructors?: { name: string } | null
  course_categories?: { name: string; color: string } | null
}
interface Props {
  courses: Course[]
  scheduleSettings: Record<string, string>
}

const WEEKDAYS = ['日','一','二','三','四','五','六']
const SITE_URL = 'https://yangbei-campaign.vercel.app'
const QR_API = (url: string, size = 200) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`

// A4 尺寸（px @96dpi）
const A4_W = 1123
const A4_H = 794

function toROC(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return { year: d.getFullYear()-1911, month: d.getMonth()+1, day: d.getDate(), weekday: WEEKDAYS[d.getDay()] }
}
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

type Orientation = 'landscape' | 'portrait'
type PatternType = 'none' | 'dots' | 'lines' | 'grid' | 'waves' | 'diamonds'
type GradientDir = 'to-b' | 'to-r' | 'to-br'

interface EditorState {
  bgImage: string; bgOpacity: number
  accentColor: string; brandBgColor: string
  leftBgColor: string; leftBgOpacity: number
  patternType: PatternType; patternOpacity: number
  gradientEnabled: boolean; gradientDir: GradientDir
  gradientFrom: string; gradientTo: string; gradientOpacity: number
  rightBgColor: string; rightBgOpacity: number
  footerBgColor: string; footerTextColor: string
  communityQr: string
  logo1: string; logo1Name: string
  logo2: string; logo2Name: string
  logo3: string; logo3Name: string
  phone: string; contact: string; hours: string
  titleLine1: string; titleLine2: string
}

const DEFAULT_EDITOR: EditorState = {
  bgImage: '', bgOpacity: 0.22,
  accentColor: '#f97316', brandBgColor: '#1c1917',
  leftBgColor: '#fff7ed', leftBgOpacity: 0.95,
  patternType: 'dots', patternOpacity: 0.12,
  gradientEnabled: true, gradientDir: 'to-b',
  gradientFrom: '#fed7aa', gradientTo: '#fff7ed', gradientOpacity: 0.6,
  rightBgColor: '#ffffff', rightBgOpacity: 0.92,
  footerBgColor: '#18120a', footerTextColor: '#ffffff',
  communityQr: '',
  logo1: '', logo1Name: '新北市政府城鄉發展局',
  logo2: '', logo2Name: '跨世代共居種子計畫',
  logo3: '', logo3Name: '街道案子團隊',
  phone: '', contact: '', hours: '',
  titleLine1: '新店央北社會住宅',
  titleLine2: '跨世代共居種子計畫',
}

// ── SVG Pattern ──────────────────────────────────────────────────────
function getSvgPattern(type: PatternType, color: string, opacity: number): string {
  const c = encodeURIComponent(color)
  const patterns: Record<PatternType, string> = {
    none: '',
    dots: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='2' fill='${c}' opacity='${opacity}'/></svg>`,
    lines: `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><line x1='0' y1='0' x2='20' y2='20' stroke='${c}' stroke-width='1.2' opacity='${opacity}'/></svg>`,
    grid: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M 24 0 L 0 0 0 24' fill='none' stroke='${c}' stroke-width='0.8' opacity='${opacity}'/></svg>`,
    waves: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='16'><path d='M0 8 Q10 0 20 8 Q30 16 40 8' fill='none' stroke='${c}' stroke-width='1.2' opacity='${opacity}'/></svg>`,
    diamonds: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect x='12' y='0' width='8.5' height='8.5' transform='rotate(45 12 4.25)' fill='none' stroke='${c}' stroke-width='0.8' opacity='${opacity}'/></svg>`,
  }
  if (type === 'none') return ''
  return `url("data:image/svg+xml,${patterns[type]}")`
}

const GRADIENT_DIRS: Record<GradientDir, string> = {
  'to-b': 'to bottom',
  'to-r': 'to right',
  'to-br': 'to bottom right',
}

// ── 課表欄位 ──────────────────────────────────────────────────────────
const TABLE_COLS = [
  { label: '日期',   lw: '88px',  pw: '88px' },
  { label: '時間',   lw: '104px', pw: '100px' },
  { label: '活動名稱', lw: '1fr', pw: '1fr'  },
  { label: '授課講師', lw: '140px', pw: '130px' },
  { label: '地點',   lw: '120px', pw: '110px'  },
  { label: '對象',   lw: '96px',  pw: '86px'  },
  { label: '費用',   lw: '68px',  pw: '62px'  },
]

// ── 左欄內容（橫式 + 直式共用） ──────────────────────────────────────
function LeftPanel({
  editor, year, rocMonth, isLandscape,
}: { editor: EditorState; year: number; rocMonth: number; isLandscape: boolean }) {
  const contactItems = [
    editor.phone ? `如有任何問題，請撥打洽詢專線：：${editor.phone}` : '',
    editor.contact || '',
    editor.hours ? `時間：${editor.hours}` : '',
  ].filter(Boolean)

  const patternBg = getSvgPattern(editor.patternType, editor.accentColor, editor.patternOpacity)
  const gradBg = editor.gradientEnabled
    ? `linear-gradient(${GRADIENT_DIRS[editor.gradientDir]}, ${hexToRgba(editor.gradientFrom, editor.gradientOpacity)}, ${hexToRgba(editor.gradientTo, editor.gradientOpacity)})`
    : ''

  const leftW = isLandscape ? 290 : '100%'

  return (
    <div style={{
      width: leftW,
      flexShrink: 0,
      position: 'relative',
      overflow: 'hidden',
      background: hexToRgba(editor.leftBgColor, editor.leftBgOpacity),
      ...(isLandscape ? { display: 'flex', flexDirection: 'column' } : {}),
    }}>
      {/* 漸層層 */}
      {gradBg && (
        <div style={{ position: 'absolute', inset: 0, background: gradBg, zIndex: 0, pointerEvents: 'none' }} />
      )}
      {/* Pattern 層 */}
      {patternBg && (
        <div style={{ position: 'absolute', inset: 0, backgroundImage: patternBg, backgroundRepeat: 'repeat', zIndex: 1, pointerEvents: 'none' }} />
      )}
      {/* 右側裝飾線 */}
      {isLandscape && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom, ${editor.accentColor}00, ${editor.accentColor}60, ${editor.accentColor}00)`, zIndex: 2 }} />
      )}
      {/* 底部裝飾線（直式） */}
      {!isLandscape && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${editor.accentColor}00, ${editor.accentColor}60, ${editor.accentColor}00)`, zIndex: 2 }} />
      )}

      {/* 內容 */}
      <div style={{ position: 'relative', zIndex: 3, padding: isLandscape ? '24px 22px' : '24px 32px', display: 'flex', flexDirection: isLandscape ? 'column' : 'row', gap: isLandscape ? 0 : 32, flex: isLandscape ? 1 : undefined }}>

        {/* 左半：標題區 */}
        <div style={{ flex: isLandscape ? undefined : '0 0 320px' }}>
          {/* 年份小標 */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: editor.accentColor, borderRadius: 6, padding: '3px 10px', marginBottom: 12 }}>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}>{year} 年活動</span>
          </div>

          <p style={{ fontSize: isLandscape ? 22 : 28, fontWeight: 900, color: '#18120a', lineHeight: 1.25, margin: '0 0 4px' }}>{editor.titleLine1}</p>
          <p style={{ fontSize: isLandscape ? 20 : 24, fontWeight: 900, color: editor.accentColor, lineHeight: 1.25, margin: '0 0 12px' }}>{editor.titleLine2}</p>

          {/* 月份大數字 */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: isLandscape ? 14 : 0 }}>
            <span style={{ fontSize: isLandscape ? 52 : 64, fontWeight: 900, color: editor.accentColor, lineHeight: 1 }}>{rocMonth}</span>
            <span style={{ fontSize: isLandscape ? 16 : 20, fontWeight: 700, color: '#6b7280' }}>月份活動表</span>
          </div>

          {isLandscape && (
            <>
              <div style={{ height: 1, background: `${editor.accentColor}25`, margin: '0 0 12px' }} />
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 3px', lineHeight: 1.6 }}>各項活動皆歡迎居民們踴躍報名！</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>（數量有限，額滿為止）</p>
            </>
          )}
        </div>

        {/* 右半（直式才有：QR + 聯繫） / 直式把QR放右邊 */}
        {!isLandscape && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: '活動報名', color: editor.accentColor, img: QR_API(SITE_URL, 200), sub: '線上報名' },
                { label: '種子社區大學', color: '#06C755', img: editor.communityQr, sub: '加入社群' },
              ].map((qr, qi) => (
                <div key={qi} style={{ flex: 1, background: 'rgba(255,255,255,0.88)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ background: qr.color, borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>{qr.label}</span>
                  </div>
                  {qr.img
                    ? <img src={qr.img} alt="" style={{ width: 80, height: 80, objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
                    : <div style={{ width: 80, height: 80, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, color: '#9ca3af' }}>未上傳</span></div>
                  }
                  <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>{qr.sub}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {contactItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06C755', marginTop: 5, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 橫式：QR + 聯繫在下方 */}
        {isLandscape && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: '活動報名', color: editor.accentColor, img: QR_API(SITE_URL, 200), sub: '↑ 線上報名' },
                { label: '種子社區大學', color: '#06C755', img: editor.communityQr, sub: '加入社群' },
              ].map((qr, qi) => (
                <div key={qi} style={{ flex: 1, background: 'rgba(255,255,255,0.88)', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ background: qr.color, borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>{qr.label}</span>
                  </div>
                  {qr.img
                    ? <img src={qr.img} alt="" style={{ width: 88, height: 88, objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
                    : <div style={{ width: 88, height: 88, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, color: '#9ca3af' }}>未上傳</span></div>
                  }
                  <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>{qr.sub}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
              {contactItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06C755', marginTop: 4, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 課表主體 ─────────────────────────────────────────────────────────
function TableSection({
  pageCourses, rowsPerPage, editor, isLandscape,
}: { pageCourses: Course[]; rowsPerPage: number; editor: EditorState; isLandscape: boolean }) {
  const emptyRows = Math.max(0, rowsPerPage - pageCourses.length)
  const gridCols = TABLE_COLS.map(c => isLandscape ? c.lw : c.pw).join(' ')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: hexToRgba(editor.rightBgColor, editor.rightBgOpacity) }}>
      {/* 表頭 */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, background: editor.accentColor, flexShrink: 0 }}>
        {TABLE_COLS.map(col => (
          <div key={col.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, padding: '13px 6px', textAlign: 'center' }}>
            {col.label}
          </div>
        ))}
      </div>

      {/* 課程列 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {pageCourses.map((course, i) => {
          const { month: cm, day, weekday } = toROC(course.date)
          return (
            <div key={course.id} style={{
              display: 'grid', gridTemplateColumns: gridCols,
              flex: 1, minHeight: 0,
              background: i % 2 === 0 ? `rgba(255,255,255,0.9)` : `rgba(255,247,237,0.9)`,
              borderBottom: `1px solid ${editor.accentColor}18`,
              alignItems: 'center',
            }}>
              {/* 日期 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', gap: 5 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#18120a', lineHeight: 1 }}>{cm}/{day}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: editor.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>{weekday}</span>
                </div>
              </div>
              {/* 時間 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', gap: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_start?.slice(0,5)}</span>
                <span style={{ fontSize: 11, color: `${editor.accentColor}80`, lineHeight: 1.2 }}>｜</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_end?.slice(0,5)}</span>
              </div>
              {/* 活動名稱 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 10px', textAlign: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#18120a', lineHeight: 1.45 }}>{course.title}</span>
              </div>
              {/* 講師 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 6px' }}>
                {course.instructors?.name && (
                  <div style={{ background: `${editor.accentColor}1a`, border: `1px solid ${editor.accentColor}35`, borderRadius: 20, padding: '5px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: editor.accentColor, fontWeight: 700, fontSize: 13, lineHeight: 1, whiteSpace: 'nowrap' }}>{course.instructors.name}</span>
                  </div>
                )}
              </div>
              {/* 地點 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 6px', textAlign: 'center' }}>
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{course.location}</span>
              </div>
              {/* 對象 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', textAlign: 'center' }}>
                <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{course.suitable_age || '全年齡'}</span>
              </div>
              {/* 費用 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: editor.accentColor, lineHeight: 1 }}>免費</span>
              </div>
            </div>
          )
        })}
        {Array.from({ length: emptyRows }).map((_, i) => (
          <div key={`e${i}`} style={{
            display: 'grid', gridTemplateColumns: gridCols,
            flex: 1, minHeight: 0,
            background: (pageCourses.length+i) % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,247,237,0.9)',
            borderBottom: `1px solid ${editor.accentColor}18`,
          }}>
            {TABLE_COLS.map((_,ci) => <div key={ci} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 底部夥伴列 ───────────────────────────────────────────────────────
function FooterBar({ editor }: { editor: EditorState }) {
  const partners = [
    { img: editor.logo1, name: editor.logo1Name },
    { img: editor.logo2, name: editor.logo2Name },
    { img: editor.logo3, name: editor.logo3Name },
  ]
  return (
    <div style={{ background: editor.footerBgColor, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 28px', borderTop: `2px solid ${editor.accentColor}50`, flexShrink: 0 }}>
      {partners.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {p.img && <img src={p.img} alt="" style={{ height: 24, width: 'auto', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />}
          <span style={{ color: editor.footerTextColor, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
        </div>
      ))}
    </div>
  )
}

// ── 單頁課表 ─────────────────────────────────────────────────────────
function SchedulePage({
  monthCourses, selectedMonth, rowsPerPage, orientation, editor, pageIdx, totalPages,
}: {
  monthCourses: Course[]; selectedMonth: string; rowsPerPage: number
  orientation: Orientation; editor: EditorState; pageIdx: number; totalPages: number
}) {
  const pageCourses = monthCourses.slice(pageIdx * rowsPerPage, (pageIdx+1) * rowsPerPage)
  const isL = orientation === 'landscape'
  const { year, month: rocMonth } = toROC(selectedMonth + '-01')
  const W = isL ? A4_W : A4_H
  const H = isL ? A4_H : A4_W

  return (
    <div data-schedule-page style={{
      width: W, height: H,
      fontFamily: '"Noto Sans TC","GenSenRounded2TW",sans-serif',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* 底圖 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#fdf4ea' }}>
        {editor.bgImage && (
          <img src={editor.bgImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: editor.bgOpacity }} crossOrigin="anonymous" />
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 頂部品牌列 */}
        <div style={{ background: editor.brandBgColor, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 14, background: editor.accentColor, borderRadius: 2 }} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em' }}>
              XINDIAN · YANGBEI SOCIAL HOUSING
            </span>
          </div>
          {totalPages > 1 && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{pageIdx+1} / {totalPages}</span>}
        </div>

        {/* 橫式：左欄 + 右側表格並排 */}
        {isL && (
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <LeftPanel editor={editor} year={year} rocMonth={rocMonth} isLandscape={true} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <TableSection pageCourses={pageCourses} rowsPerPage={rowsPerPage} editor={editor} isLandscape={true} />
            </div>
          </div>
        )}

        {/* 直式：上半左欄內容，下半表格 */}
        {!isL && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <LeftPanel editor={editor} year={year} rocMonth={rocMonth} isLandscape={false} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <TableSection pageCourses={pageCourses} rowsPerPage={rowsPerPage} editor={editor} isLandscape={false} />
            </div>
          </div>
        )}

        <FooterBar editor={editor} />
      </div>
    </div>
  )
}

// ── 主元件 ───────────────────────────────────────────────────────────
export default function CourseScheduleExporter({ courses, scheduleSettings: ss }: Props) {
  const [step, setStep] = useState<'idle'|'config'|'editor'>('idle')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(4)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [currentPage, setCurrentPage] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR)
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const set = useCallback((key: keyof EditorState, val: any) =>
    setEditor(prev => ({ ...prev, [key]: val })), [])

  const availableMonths = Array.from(
    new Set(courses.map(c => c.date?.slice(0,7)).filter(Boolean))
  ).sort() as string[]

  const monthCourses = selectedMonth
    ? courses.filter(c => c.date?.startsWith(selectedMonth))
        .sort((a,b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start))
    : []
  const totalPages = Math.ceil(monthCourses.length / rowsPerPage) || 1

  const initEditor = () => {
    setEditor(prev => ({
      ...prev,
      bgImage: ss.schedule_bg_image || '',
      bgOpacity: parseFloat(ss.schedule_bg_opacity || '') || 0.22,
      accentColor: ss.schedule_accent_color || '#f97316',
      brandBgColor: ss.schedule_brand_bg || '#1c1917',
      leftBgColor: ss.schedule_left_bg_color || '#fff7ed',
      leftBgOpacity: parseFloat(ss.schedule_left_bg_opacity || '') || 0.95,
      patternType: (ss.schedule_pattern_type as PatternType) || 'dots',
      patternOpacity: parseFloat(ss.schedule_pattern_opacity || '') || 0.12,
      gradientEnabled: ss.schedule_gradient_enabled !== 'false',
      gradientDir: (ss.schedule_gradient_dir as GradientDir) || 'to-b',
      gradientFrom: ss.schedule_gradient_from || '#fed7aa',
      gradientTo: ss.schedule_gradient_to || '#fff7ed',
      gradientOpacity: parseFloat(ss.schedule_gradient_opacity || '') || 0.6,
      rightBgColor: ss.schedule_right_bg_color || '#ffffff',
      rightBgOpacity: parseFloat(ss.schedule_right_bg_opacity || '') || 0.92,
      footerBgColor: ss.schedule_footer_bg || '#18120a',
      footerTextColor: ss.schedule_footer_text || '#ffffff',
      communityQr: ss.schedule_community_qr || '',
      logo1: ss.schedule_logo_1 || '', logo1Name: ss.schedule_logo_1_name || '新北市政府城鄉發展局',
      logo2: ss.schedule_logo_2 || '', logo2Name: ss.schedule_logo_2_name || '跨世代共居種子計畫',
      logo3: ss.schedule_logo_3 || '', logo3Name: ss.schedule_logo_3_name || '街道案子團隊',
      phone: ss.schedule_phone || '',
      contact: ss.schedule_contact || '',
      hours: ss.schedule_hours || '',
      titleLine1: ss.schedule_title_1 || '新店央北社會住宅',
      titleLine2: ss.schedule_title_2 || '跨世代共居種子計畫',
    }))
  }

  const handleImgUpload = (key: keyof EditorState) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const ext = file.name.split('.').pop()
    const path = `schedule/${key}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
      set(key, urlData.publicUrl)
    } else {
      const reader = new FileReader()
      reader.onload = ev => set(key, ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    const toSave: Record<string, string> = {
      schedule_bg_image: editor.bgImage,
      schedule_bg_opacity: String(editor.bgOpacity),
      schedule_accent_color: editor.accentColor,
      schedule_brand_bg: editor.brandBgColor,
      schedule_left_bg_color: editor.leftBgColor,
      schedule_left_bg_opacity: String(editor.leftBgOpacity),
      schedule_pattern_type: editor.patternType,
      schedule_pattern_opacity: String(editor.patternOpacity),
      schedule_gradient_enabled: String(editor.gradientEnabled),
      schedule_gradient_dir: editor.gradientDir,
      schedule_gradient_from: editor.gradientFrom,
      schedule_gradient_to: editor.gradientTo,
      schedule_gradient_opacity: String(editor.gradientOpacity),
      schedule_right_bg_color: editor.rightBgColor,
      schedule_right_bg_opacity: String(editor.rightBgOpacity),
      schedule_footer_bg: editor.footerBgColor,
      schedule_footer_text: editor.footerTextColor,
      schedule_community_qr: editor.communityQr,
      schedule_logo_1: editor.logo1, schedule_logo_1_name: editor.logo1Name,
      schedule_logo_2: editor.logo2, schedule_logo_2_name: editor.logo2Name,
      schedule_logo_3: editor.logo3, schedule_logo_3_name: editor.logo3Name,
      schedule_phone: editor.phone,
      schedule_contact: editor.contact,
      schedule_hours: editor.hours,
      schedule_title_1: editor.titleLine1,
      schedule_title_2: editor.titleLine2,
    }
    await fetch('/api/admin/save-schedule-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: Object.entries(toSave).map(([key, value]) => ({ key, value })) }),
    })
    setSaving(false); setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
  }

  // 下載：截圖前暫時移除 backdropFilter，確保 html2canvas 正確渲染
  const capturePages = async (orient: Orientation): Promise<string[]> => {
    const origOrient = orientation
    const origPage = currentPage
    setOrientation(orient)
    await new Promise(r => setTimeout(r, 200))
    const h2c = (await import('html2canvas')).default
    const urls: string[] = []
    for (let p = 0; p < totalPages; p++) {
      setCurrentPage(p)
      await new Promise(r => setTimeout(r, 150))
      const el = previewRef.current; if (!el) continue
      // 暫時移除 backdropFilter（html2canvas 不支援）
      const allEls = el.querySelectorAll<HTMLElement>('*')
      const saved: string[] = []
      allEls.forEach(el => { saved.push(el.style.backdropFilter || ''); el.style.backdropFilter = '' })
      const canvas = await h2c(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#fdf4ea', logging: false, imageTimeout: 10000 })
      // 還原
      allEls.forEach((el, i) => { el.style.backdropFilter = saved[i] })
      urls.push(canvas.toDataURL('image/png'))
    }
    setOrientation(origOrient); setCurrentPage(origPage)
    return urls
  }

  const downloadVariant = async (orient: Orientation) => {
    const { year, month } = toROC(selectedMonth + '-01')
    const label = orient === 'landscape' ? '橫式' : '直式'
    const pages = await capturePages(orient)
    pages.forEach((url, i) => {
      const link = document.createElement('a')
      link.download = totalPages > 1
        ? `央北社宅_${year}年${month}月活動表_${label}_第${i+1}頁.png`
        : `央北社宅_${year}年${month}月活動表_${label}.png`
      link.href = url; link.click()
    })
  }

  const handleDownload = async (mode: 'landscape'|'portrait'|'both') => {
    setShowDownloadModal(false); setDownloading(true)
    if (mode === 'both') { await downloadVariant('landscape'); await new Promise(r => setTimeout(r,400)); await downloadVariant('portrait') }
    else await downloadVariant(mode)
    setDownloading(false)
  }

  const reset = () => { setStep('idle'); setCurrentPage(0) }

  // ── 控制面板內容（共用於桌機左側 + 手機抽屜）──
  const PanelContent = () => (
    <div className="p-4 space-y-5">
      {/* 標題 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">標題文字</p>
        <div className="space-y-2">
          {(['titleLine1','titleLine2'] as const).map((key, i) => (
            <div key={key}>
              <label className="block text-xs text-stone-400 mb-1">第 {i+1} 行</label>
              <input value={editor[key]} onChange={e => set(key, e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          ))}
        </div>
      </div>

      {/* 顏色 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">顏色</p>
        <div className="space-y-2.5">
          {[
            { key: 'accentColor', label: '主題色' },
            { key: 'brandBgColor', label: '頂部品牌列底色' },
            { key: 'leftBgColor', label: '左欄底色' },
            { key: 'rightBgColor', label: '右欄底色' },
            { key: 'footerBgColor', label: '底部背景' },
            { key: 'footerTextColor', label: '底部文字' },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-sm text-stone-600">{f.label}</span>
              <input type="color" value={(editor as any)[f.key]}
                onChange={e => set(f.key as keyof EditorState, e.target.value)}
                className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer p-0.5" />
            </div>
          ))}
        </div>
      </div>

      {/* 欄位透明度 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">欄位透明度</p>
        {[
          { key: 'leftBgOpacity', label: '左欄', val: editor.leftBgOpacity },
          { key: 'rightBgOpacity', label: '右欄', val: editor.rightBgOpacity },
        ].map(f => (
          <div key={f.key} className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-stone-400">{f.label} {Math.round(f.val * 100)}%</label>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={f.val}
              onChange={e => set(f.key as keyof EditorState, parseFloat(e.target.value))} className="w-full" />
          </div>
        ))}
        <p className="text-xs text-stone-400">調低透明度讓底圖透出</p>
      </div>

      {/* SVG Pattern */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">左欄裝飾 Pattern</p>
        <select value={editor.patternType} onChange={e => set('patternType', e.target.value as PatternType)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3">
          <option value="none">無</option>
          <option value="dots">圓點</option>
          <option value="lines">斜線</option>
          <option value="grid">網格</option>
          <option value="waves">波浪</option>
          <option value="diamonds">菱形</option>
        </select>
        {editor.patternType !== 'none' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-stone-400">Pattern 濃度 {Math.round(editor.patternOpacity * 100)}%</label>
            </div>
            <input type="range" min="0.02" max="0.5" step="0.02" value={editor.patternOpacity}
              onChange={e => set('patternOpacity', parseFloat(e.target.value))} className="w-full" />
          </div>
        )}
      </div>

      {/* 漸層 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">左欄漸層</p>
          <button onClick={() => set('gradientEnabled', !editor.gradientEnabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editor.gradientEnabled ? 'bg-orange-500' : 'bg-stone-200'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${editor.gradientEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {editor.gradientEnabled && (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs text-stone-400 mb-1.5">方向</label>
              <div className="flex gap-2">
                {([['to-b','↓ 上到下'], ['to-r','→ 左到右'], ['to-br','↘ 斜角']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => set('gradientDir', v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${editor.gradientDir === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-stone-400 mb-1">起始色</label>
                <input type="color" value={editor.gradientFrom} onChange={e => set('gradientFrom', e.target.value)}
                  className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer p-0.5" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-stone-400 mb-1">結束色</label>
                <input type="color" value={editor.gradientTo} onChange={e => set('gradientTo', e.target.value)}
                  className="w-full h-9 rounded-lg border border-stone-200 cursor-pointer p-0.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-400">漸層強度 {Math.round(editor.gradientOpacity * 100)}%</label>
              </div>
              <input type="range" min="0.1" max="1" step="0.05" value={editor.gradientOpacity}
                onChange={e => set('gradientOpacity', parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
        )}
      </div>

      {/* 底圖 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">底圖</p>
        <label className="flex items-center gap-2 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2.5 px-3 cursor-pointer transition-colors text-sm text-stone-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {editor.bgImage ? '已上傳，點擊替換' : '上傳底圖（直橫式通用）'}
          <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('bgImage')} />
        </label>
        {editor.bgImage && <img src={editor.bgImage} alt="" className="mt-2 w-full h-14 object-cover rounded-lg border border-stone-200" />}
        <div className="mt-2.5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-stone-400">透明度 {Math.round(editor.bgOpacity * 100)}%</label>
            {editor.bgImage && <button onClick={() => set('bgImage', '')} className="text-xs text-red-400 hover:text-red-600">移除</button>}
          </div>
          <input type="range" min="0" max="1" step="0.05" value={editor.bgOpacity}
            onChange={e => set('bgOpacity', parseFloat(e.target.value))} className="w-full" />
        </div>
      </div>

      {/* QR */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">QR Code</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-stone-400 mb-1.5">報名 QR（自動生成）</p>
            <img src={QR_API(SITE_URL, 80)} alt="" className="w-14 h-14 rounded-lg border border-stone-200" />
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-1.5">社群 QR Code</p>
            <label className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2 px-3 cursor-pointer transition-colors text-xs text-stone-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {editor.communityQr ? '已上傳，點擊替換' : '上傳社群QR'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('communityQr')} />
            </label>
            {editor.communityQr && <img src={editor.communityQr} alt="" className="mt-2 w-14 h-14 object-contain rounded-lg border border-stone-200" />}
          </div>
        </div>
      </div>

      {/* 合作夥伴 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">合作夥伴</p>
        <div className="space-y-4">
          {([
            { logoKey: 'logo1', nameKey: 'logo1Name', label: '1' },
            { logoKey: 'logo2', nameKey: 'logo2Name', label: '2' },
            { logoKey: 'logo3', nameKey: 'logo3Name', label: '3' },
          ] as const).map(f => (
            <div key={f.logoKey}>
              <label className="block text-xs text-stone-400 mb-1">夥伴 {f.label}</label>
              <input value={editor[f.nameKey]} onChange={e => set(f.nameKey, e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 mb-1.5" />
              <label className="flex items-center gap-1.5 border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-1.5 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {editor[f.logoKey] ? '已上傳' : '上傳 Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload(f.logoKey)} />
              </label>
              {editor[f.logoKey] && (
                <div className="mt-1.5 flex items-center gap-2">
                  <img src={editor[f.logoKey]} alt="" className="h-7 w-auto object-contain rounded border border-stone-200" />
                  <button onClick={() => set(f.logoKey, '')} className="text-xs text-red-400 hover:text-red-600">移除</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 聯繫資訊 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">聯繫資訊</p>
        <div className="space-y-2">
          {[
            { key: 'phone', label: '電話' },
            { key: 'contact', label: '聯絡窗口' },
            { key: 'hours', label: '服務時間' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-stone-400 mb-1">{f.label}</label>
              <input value={(editor as any)[f.key]} onChange={e => set(f.key as keyof EditorState, e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (step === 'idle') return (
    <button onClick={() => setStep('config')}
      className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      匯出課表
    </button>
  )

  if (step === 'config') return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) reset() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500 to-orange-400 px-6 py-5">
          <h3 className="font-bold text-white text-xl">匯出課表</h3>
          <p className="text-orange-100 text-sm mt-1">選擇月份與版面設定</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">月份</label>
            {availableMonths.length === 0
              ? <p className="text-stone-400 text-sm">目前無課程月份</p>
              : <div className="grid grid-cols-3 gap-2">
                  {availableMonths.map(m => {
                    const [y, mo] = m.split('-')
                    return (
                      <button key={m} onClick={() => setSelectedMonth(m)}
                        className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedMonth === m ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                        {parseInt(y)-1911}/{parseInt(mo)}月
                      </button>
                    )
                  })}
                </div>
            }
          </div>
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">每頁列數</label>
            <div className="flex gap-2">
              {[2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setRowsPerPage(n)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${rowsPerPage === n ? 'bg-orange-500 text-white border-orange-500' : 'text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {selectedMonth && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-stone-600">
              {(() => {
                const [y, mo] = selectedMonth.split('-')
                return `${parseInt(y)-1911} 年 ${parseInt(mo)} 月 · 共 ${monthCourses.length} 堂 · 分 ${totalPages} 頁`
              })()}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm">取消</button>
            <button onClick={() => { initEditor(); setStep('editor') }} disabled={!selectedMonth}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold py-3 rounded-xl text-sm">
              進入編輯器
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Editor ──
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100">

      {/* 頂部工具列 */}
      <div className="bg-white border-b border-stone-200 flex items-center gap-2 px-3 py-2.5 flex-shrink-0 shadow-sm">
        <button onClick={() => setStep('config')} className="flex items-center gap-1 text-stone-500 hover:text-stone-800 text-sm transition-colors p-1.5 rounded-lg hover:bg-stone-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="hidden sm:inline text-sm">返回</span>
        </button>

        <div className="w-px h-4 bg-stone-200 hidden sm:block" />
        <span className="font-bold text-stone-700 text-sm hidden sm:inline">課表編輯器</span>

        {/* 頁面切換 */}
        {totalPages > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${currentPage === i ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                {i+1}
              </button>
            ))}
          </div>
        )}

        {/* 方向 */}
        <div className="flex rounded-xl overflow-hidden border border-stone-200">
          {([['landscape','橫'] as const, ['portrait','直'] as const]).map(([v, label]) => (
            <button key={v} onClick={() => setOrientation(v)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${orientation === v ? 'bg-orange-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}>
              {label}式
            </button>
          ))}
        </div>

        {/* 手機版：面板開關 */}
        <button onClick={() => setShowMobilePanel(true)}
          className="md:hidden p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 ml-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-xl text-sm font-medium border border-stone-200 transition-colors">
            {saving ? <div className="w-3.5 h-3.5 border-2 border-stone-400/40 border-t-stone-500 rounded-full animate-spin" />
              : savedOk ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            }
            <span className="hidden sm:inline">{savedOk ? '已儲存' : '儲存'}</span>
          </button>
          <button onClick={() => setShowDownloadModal(true)} disabled={downloading}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-3 py-2 rounded-xl text-sm font-bold transition-colors">
            {downloading
              ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            }
            下載
          </button>
          <button onClick={reset} className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 主體 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 桌機左側面板 */}
        <div className="hidden md:block w-64 bg-white border-r border-stone-200 overflow-y-auto flex-shrink-0">
          <PanelContent />
        </div>

        {/* 預覽區 */}
        <div className="flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-3">
            {/* 縮放容器：手機版縮小預覽 */}
            <div className="overflow-hidden" style={{ maxWidth: '100%' }}>
              <div style={{ transformOrigin: 'top left' }}
                className="scale-[0.35] sm:scale-[0.5] md:scale-[0.6] lg:scale-75 xl:scale-90 2xl:scale-100 origin-top-left">
                <div ref={previewRef}>
                  <SchedulePage
                    monthCourses={monthCourses}
                    selectedMonth={selectedMonth}
                    rowsPerPage={rowsPerPage}
                    orientation={orientation}
                    editor={editor}
                    pageIdx={currentPage}
                    totalPages={totalPages}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-400">
              {orientation === 'landscape' ? `橫式 A4 (${A4_W}×${A4_H}px)` : `直式 A4 (${A4_H}×${A4_W}px)`} · 下載 @2x
            </p>
          </div>
        </div>
      </div>

      {/* 手機版側邊抽屜 */}
      {showMobilePanel && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowMobilePanel(false)} />
          <div className="w-80 bg-white overflow-y-auto flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 sticky top-0 bg-white z-10">
              <span className="font-bold text-stone-700">編輯設定</span>
              <button onClick={() => setShowMobilePanel(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <PanelContent />
          </div>
        </div>
      )}

      {/* 下載彈窗 */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" style={{ zIndex: 9999 }}
          onClick={e => { if (e.target === e.currentTarget) setShowDownloadModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-stone-800 text-lg">選擇下載格式</h3>
            <div className="space-y-2">
              {[
                { mode: 'landscape' as const, label: '橫式（A4 橫向）', desc: '適合簡報、電子佈告欄' },
                { mode: 'portrait' as const, label: '直式（A4 直向）', desc: '適合印刷、張貼公告' },
                { mode: 'both' as const, label: '橫式＋直式', desc: '一次下載兩種版本' },
              ].map(opt => (
                <button key={opt.mode} onClick={() => handleDownload(opt.mode)}
                  className="w-full flex items-center justify-between bg-stone-50 hover:bg-orange-50 hover:border-orange-300 border border-stone-200 rounded-xl px-4 py-3.5 transition-colors text-left">
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{opt.label}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              ))}
            </div>
            <button onClick={() => setShowDownloadModal(false)}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-2.5 rounded-xl text-sm">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
