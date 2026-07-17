'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { HexColorPicker } from 'react-colorful'

interface Course {
  id: string; title: string; date: string
  time_start: string; time_end: string; location: string
  notes?: string; suitable_age?: string
  instructors?: { name: string } | null
  instructor_names?: string[]
  course_categories?: { name: string; color: string } | null
}

interface Props {
  courses: Course[]
  scheduleSettings: Record<string, string>
  hideTrigger?: boolean
  openSignal?: number
}

const WEEKDAYS = ['日','一','二','三','四','五','六']
const SITE_URL = 'https://yangbei-campaign.vercel.app'
const QR_API = (url: string, size = 200) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`

const A4L_W = 1123; const A4L_H = 794
const A4P_W = 794;  const A4P_H = 1123

function toROC(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return { year: d.getFullYear()-1911, month: d.getMonth()+1, day: d.getDate(), weekday: WEEKDAYS[d.getDay()] }
}
function hexToRgba(hex: string, alpha: number) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

type Orientation = 'landscape'|'portrait'
type PatternType = 'none'|'dots'|'lines'|'grid'|'waves'|'diamonds'
type GradientDir = 'to-b'|'to-r'|'to-br'

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
  titleFontSize: number
  subtitleFontSize: number
  monthFontSize: number
  gapTitleToQr: number
  gapQrToContact: number
  bgPositionX: number
  bgPositionY: number
  bgPositionXP: number
  bgPositionYP: number
  registrationQrMode: 'auto' | 'upload'
  registrationQrUpload: string
  pTitleFontSize: number
  pSubtitleFontSize: number
  pMonthFontSize: number
  pQrSize: number
  pLeftWidth: number
  pGapMonth: number
  courseDateFontSize: number
  courseTimeFontSize: number
  courseTitleFontSize: number
  courseInstructorFontSize: number
  courseLocationFontSize: number
  courseFeeFontSize: number
  pCourseDateFontSize: number
  pCourseTimeFontSize: number
  pCourseTitleFontSize: number
  pCourseInstructorFontSize: number
  pCourseLocationFontSize: number
  pCourseFeeFontSize: number
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
  titleFontSize: 30,
  subtitleFontSize: 26,
  monthFontSize: 64,
  gapTitleToQr: 16,
  gapQrToContact: 12,
  bgPositionX: 50,
  bgPositionY: 50,
  bgPositionXP: 50,
  bgPositionYP: 50,
  registrationQrMode: 'auto',
  registrationQrUpload: '',
  pTitleFontSize:22,
  pSubtitleFontSize: 18,
  pMonthFontSize: 36,
  pQrSize: 80,
  pLeftWidth: 52,
  pGapMonth: 8,
  courseDateFontSize: 16,
  courseTimeFontSize: 13,
  courseTitleFontSize: 14,
  courseInstructorFontSize: 12,
  courseLocationFontSize: 12,
  courseFeeFontSize: 13,
  pCourseDateFontSize: 14,
  pCourseTimeFontSize: 12,
  pCourseTitleFontSize: 13,
  pCourseInstructorFontSize: 11,
  pCourseLocationFontSize: 11,
  pCourseFeeFontSize: 12,
}

// ── 色盤元件 ──────────────────────────────────────────────────────
function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const openPicker = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const POPOVER_H = 320
    const POPOVER_W = 224
    const spaceBelow = window.innerHeight - r.bottom
    const spaceAbove = r.top
    let top = spaceBelow >= POPOVER_H + 8
      ? r.bottom + 8
      : (spaceAbove >= POPOVER_H + 8 ? r.top - POPOVER_H - 8 : Math.max(8, window.innerHeight - POPOVER_H - 8))
    top = Math.min(Math.max(8, top), window.innerHeight - 8)
    const left = Math.min(Math.max(8, r.right - POPOVER_W), window.innerWidth - POPOVER_W - 8)
    setPos({ top, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (popRef.current && popRef.current.contains(e.target as Node)) return
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [open])

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-stone-600">{label}</span>
        <div className="flex items-center gap-2">
          <button
            ref={btnRef}
            onClick={openPicker}
            style={{ width: 32, height: 32, borderRadius: 8, background: value, border: '2px solid #e7e5e4', cursor: 'pointer', flexShrink: 0 }}
          />
          <span className="text-xs text-stone-400 font-mono w-16">{value}</span>
        </div>
      </div>
      {open && typeof window !== 'undefined' && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 99999, background: 'white', borderRadius: 12, padding: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', border: '1px solid #e7e5e4', width: 224 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <HexColorPicker color={value} onChange={onChange} style={{ width: 200 }} />
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#78716c' }}>HEX</span>
            <input
              value={value}
              onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v) }}
              style={{ flex: 1, border: '1px solid #e7e5e4', borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'monospace' }}
            />
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ marginTop: 8, width: '100%', padding: '6px 0', background: '#f5f5f4', border: '1px solid #e7e5e4', borderRadius: 8, fontSize: 12, color: '#57534e', cursor: 'pointer' }}
          >
            確認
          </button>
        </div>
      )}
    </>
  )
}

function getSvgPattern(type: PatternType, color: string, opacity: number): string {
  if (type === 'none') return ''
  const c = encodeURIComponent(color)
  const o = opacity
  const patterns: Record<Exclude<PatternType,'none'>, string> = {
    dots:     `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><circle cx='10' cy='10' r='2' fill='${c}' opacity='${o}'/></svg>`,
    lines:    `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><line x1='0' y1='0' x2='20' y2='20' stroke='${c}' stroke-width='1.2' opacity='${o}'/></svg>`,
    grid:     `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M 24 0 L 0 0 0 24' fill='none' stroke='${c}' stroke-width='0.8' opacity='${o}'/></svg>`,
    waves:    `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='16'><path d='M0 8 Q10 0 20 8 Q30 16 40 8' fill='none' stroke='${c}' stroke-width='1.2' opacity='${o}'/></svg>`,
    diamonds: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><rect x='12' y='0' width='8.5' height='8.5' transform='rotate(45 12 4.25)' fill='none' stroke='${c}' stroke-width='0.8' opacity='${o}'/></svg>`,
  }
  return `url("data:image/svg+xml,${patterns[type as Exclude<PatternType,'none'>]}")`
}

const GRADIENT_CSS: Record<GradientDir, string> = {
  'to-b': 'to bottom', 'to-r': 'to right', 'to-br': 'to bottom right',
}

function FooterSeparator({ color = 'rgba(255,255,255,0.35)' }: { color?: string }) {
  return (
    <svg width="6" height="28" viewBox="0 0 6 28" fill="none" style={{ flexShrink: 0 }}>
      <line x1="3" y1="0" x2="3" y2="10" stroke={color} strokeWidth="1" />
      <circle cx="3" cy="14" r="2.5" fill={color} />
      <line x1="3" y1="18" x2="3" y2="28" stroke={color} strokeWidth="1" />
    </svg>
  )
}

function ContactLine({ item, dotSize = 6 }: { item: string; dotSize?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
      <div style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: '#06C755', marginTop: 5, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{item}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 預覽版
// ═══════════════════════════════════════════════════════════════════
function PreviewPage({
  monthCourses, selectedMonth, rowsPerPage, orientation, editor, pageIdx, totalPages,
}: {
  monthCourses: Course[]; selectedMonth: string; rowsPerPage: number
  orientation: Orientation; editor: EditorState; pageIdx: number; totalPages: number
}) {
  const pageCourses = monthCourses.slice(pageIdx * rowsPerPage, (pageIdx+1) * rowsPerPage)
  const isL = orientation === 'landscape'
  const { year, month: rocMonth } = toROC(selectedMonth + '-01')
  const W = isL ? A4L_W : A4P_W
  const H = isL ? A4L_H : A4P_H
  const e = editor
  const emptyRows = Math.max(0, rowsPerPage - pageCourses.length)

  const leftBg = hexToRgba(e.leftBgColor, e.leftBgOpacity)
  const rightBg = hexToRgba(e.rightBgColor, e.rightBgOpacity)
  const patternBg = getSvgPattern(e.patternType, e.accentColor, e.patternOpacity)
  const gradBg = e.gradientEnabled ? `linear-gradient(${GRADIENT_CSS[e.gradientDir]}, ${hexToRgba(e.gradientFrom, e.gradientOpacity)}, ${hexToRgba(e.gradientTo, e.gradientOpacity)})` : ''

  const colDefs = [
    { label:'日期', w: isL?'88px':'78px' }, { label:'時間', w: isL?'104px':'90px' }, { label:'活動名稱', w:'1fr' },
    { label:'授課講師', w: isL?'140px':'130px' }, { label:'地點', w: isL?'130px':'120px' }, { label:'對象', w: isL?'96px':'86px' }, { label:'費用', w: isL?'68px':'62px' },
  ]
  const gridCols = colDefs.map(c => c.w).join(' ')

  const contactItems = [
    e.phone ? `如有任何問題，請撥打洽詢專線：${e.phone}` : '',
    e.contact || '', e.hours ? `時間：${e.hours}` : '',
  ].filter(Boolean)

  const partners = [
    { img: e.logo1, name: e.logo1Name },
    { img: e.logo2, name: e.logo2Name },
    { img: e.logo3, name: e.logo3Name },
  ]

  const QrBox = ({ label, color, imgSrc, sub }: { label:string; color:string; imgSrc:string; sub:string }) => (
    <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <span style={{ color: color, fontSize: isL?10:9, fontWeight: 800, lineHeight: 1.4 }}>{label}</span>
      {imgSrc
        ? <img src={imgSrc} alt="" crossOrigin="anonymous" style={{ width: isL?88:e.pQrSize, height: isL?88:e.pQrSize, objectFit: 'contain', display: 'block' }} />
        : <div style={{ width: isL?88:e.pQrSize, height: isL?88:e.pQrSize, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#9ca3af' }}>未上傳</span></div>
      }
      <span style={{ fontSize: isL?10:9, color: '#6b7280', textAlign: 'center' }}>{sub}</span>
    </div>
  )

  return (
    <div style={{ width: W, height: H, fontFamily: '"Noto Sans TC","GenSenRounded2TW",sans-serif', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#fdf4ea', zIndex: 0 }}>
        {e.bgImage && (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(${e.bgImage})`, backgroundSize: 'cover', backgroundPosition: orientation === 'portrait' ? `${e.bgPositionXP}% ${e.bgPositionYP}%` : `${e.bgPositionX}% ${e.bgPositionY}%`, opacity: e.bgOpacity }} />
      )}
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 品牌列 */}
        <div style={{ background: e.brandBgColor, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 14, background: e.accentColor, borderRadius: 2 }} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em' }}>XINDIAN · YANGBEI SOCIAL HOUSING</span>
          </div>
          {totalPages > 1 && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{pageIdx+1} / {totalPages}</span>}
        </div>

        {/* 主體 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: isL ? 'row' : 'column', minHeight: 0 }}>
          {/* 左欄 */}
          <div style={{ width: isL?290:'100%', flexShrink: 0, position: 'relative', overflow: 'hidden', background: leftBg, ...(isL ? { display: 'flex', flexDirection: 'column' } : { height: 240, flexShrink: 0 }) }}>
            {gradBg && <div style={{ position: 'absolute', inset: 0, background: gradBg, zIndex: 0 }} />}
            {patternBg && <div style={{ position: 'absolute', inset: 0, backgroundImage: patternBg, backgroundRepeat: 'repeat', zIndex: 1 }} />}
            {isL && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom,${e.accentColor}00,${e.accentColor}60,${e.accentColor}00)`, zIndex: 2 }} />}
            {!isL && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right,${e.accentColor}00,${e.accentColor}60,${e.accentColor}00)`, zIndex: 2 }} />}

            {/* 橫式左欄內容 */}
            {isL && (
              <div style={{ position: 'relative', zIndex: 3, padding: '18px 20px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' }}>
                  <span style={{ color: e.accentColor, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}>{year} 年活動</span>
                </div>
                <p style={{ margin: '0 0 2px', fontSize: e.titleFontSize, fontWeight: 900, color: '#18120a', lineHeight: 1.25 }}>{e.titleLine1}</p>
                <p style={{ margin: '4px 0 8px', fontSize: e.subtitleFontSize, fontWeight: 900, color: e.accentColor, lineHeight: 1.25 }}>{e.titleLine2}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                  <span style={{ fontSize: e.monthFontSize, fontWeight: 900, color: e.accentColor, lineHeight: 1 }}>{rocMonth}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>月份活動表</span>
                </div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>各項活動皆歡迎居民們踴躍報名！</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>（數量有限，額滿為止）</p>
                <div style={{ height: e.gapTitleToQr }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <QrBox label="活動報名" color={e.accentColor} imgSrc={e.registrationQrMode === 'upload' && e.registrationQrUpload ? e.registrationQrUpload : QR_API(SITE_URL,200)} sub="線上報名" />
                  <QrBox label="種子社區大學" color="#06C755" imgSrc={e.communityQr} sub="加入社群" />
                </div>
                <div style={{ height: e.gapQrToContact }} />
                <div style={{ marginTop: 'auto' }}>
                  {contactItems.map((item,i) => <ContactLine key={i} item={item} dotSize={6} />)}
                </div>
              </div>
            )}

            {/* 直式左欄內容 */}
            {!isL && (
              <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', padding: '28px 32px', gap: 24 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'inline-block', marginBottom: 6 }}>
                    <span style={{ color: e.accentColor, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', lineHeight: 1.4 }}>{year} 年活動</span>
                  </div>
                  <p style={{ margin: '0 0 1px', fontSize: e.pTitleFontSize, fontWeight: 900, color: '#18120a', lineHeight: 1.2 }}>{e.titleLine1}</p>
                  <p style={{ margin: '0 0 4px', fontSize: e.pSubtitleFontSize, fontWeight: 900, color: e.accentColor, lineHeight: 1.2 }}>{e.titleLine2}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: e.pGapMonth }}>
                    <span style={{ fontSize: e.pMonthFontSize, fontWeight: 900, color: e.accentColor, lineHeight: 1 }}>{rocMonth}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280' }}>月份活動表</span>
                  </div>
                  {contactItems.map((item,i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 2 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#06C755', marginTop: 5, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                 <QrBox label="活動報名" color={e.accentColor} imgSrc={e.registrationQrMode === 'upload' && e.registrationQrUpload ? e.registrationQrUpload : QR_API(SITE_URL,200)} sub="線上報名" />
                  <QrBox label="種子社區大學" color="#06C755" imgSrc={e.communityQr} sub="加入社群" />
                </div>
              </div>
            )}
          </div>
          
          {/* 右側課表 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: rightBg, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', minWidth: 0, minHeight: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, background: e.accentColor, flexShrink: 0 }}>
              {colDefs.map(col => (
                <div key={col.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, padding: '13px 6px', textAlign: 'center' }}>{col.label}</div>
              ))}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {pageCourses.map((course,i) => {
                const { month:cm, day, weekday } = toROC(course.date)
                const fsDate = isL ? e.courseDateFontSize : e.pCourseDateFontSize
                const fsTime = isL ? e.courseTimeFontSize : e.pCourseTimeFontSize
                const fsTitle = isL ? e.courseTitleFontSize : e.pCourseTitleFontSize
                const fsInstructor = isL ? e.courseInstructorFontSize : e.pCourseInstructorFontSize
                const fsLocation = isL ? e.courseLocationFontSize : e.pCourseLocationFontSize
                const fsFee = isL ? e.courseFeeFontSize : e.pCourseFeeFontSize
                return (
                  <div key={course.id} style={{ display: 'grid', gridTemplateColumns: gridCols, flex: 1, minHeight: 0, background: i%2===0 ? '#ffffff' : '#fff7ed', borderBottom: `1px solid ${e.accentColor}18`, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 4 }}>
                      <span style={{ fontSize: fsDate, fontWeight: 800, color: '#18120a', lineHeight: 1 }}>{cm}/{day}</span>
                      <span style={{ fontWeight: 800, fontSize: Math.max(9, fsDate - 3), color: e.accentColor, lineHeight: 1 }}>{weekday}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 1 }}>
                      <span style={{ fontSize: fsTime, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_start?.slice(0,5)}</span>
                      <span style={{ fontSize: Math.max(8, fsTime - 3), color: `${e.accentColor}80`, lineHeight: 1.2 }}>|</span>
                      <span style={{ fontSize: fsTime, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_end?.slice(0,5)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', textAlign: 'center' }}><span style={{ fontSize: fsTitle, fontWeight: 700, color: '#18120a', lineHeight: 1.4 }}>{course.title}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px' }}>
                      {(course.instructor_names?.length ? course.instructor_names.join('、') : course.instructors?.name) && <span style={{ color: e.accentColor, fontWeight: 700, fontSize: fsInstructor, lineHeight: 1 }}>{course.instructor_names?.length ? course.instructor_names.join('、') : course.instructors?.name}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', textAlign: 'center' }}><span style={{ fontSize: fsLocation, color: '#374151', lineHeight: 1.4 }}>{course.location}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', textAlign: 'center' }}><span style={{ fontSize: Math.max(9, fsLocation - 1), color: '#374151', lineHeight: 1.4 }}>{course.suitable_age||'全年齡'}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}><span style={{ fontSize: fsFee, fontWeight: 800, color: e.accentColor, lineHeight: 1 }}>免費</span></div>
                  </div>
                )
              })}
              {Array.from({ length: emptyRows }).map((_,i) => (
                <div key={`e${i}`} style={{ display: 'grid', gridTemplateColumns: gridCols, flex: 1, minHeight: 40, background: (pageCourses.length+i)%2===0 ? '#ffffff' : '#fff7ed', borderBottom: `1px solid ${e.accentColor}18` }}>
                  {colDefs.map((_,ci) => <div key={ci} />)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div style={{ background: e.footerBgColor, height: 52, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {partners.map((p,i) => (
            <React.Fragment key={i}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%' }}>
                {p.img && <img src={p.img} alt="" crossOrigin="anonymous" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />}
                <span style={{ color: e.footerTextColor, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
              </div>
              {i < partners.length-1 && <FooterSeparator />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Panel 面板（獨立元件，避免主元件 re-render 時重建）
// ═══════════════════════════════════════════════════════════════════
type PanelTab = '文字' | '色彩' | '圖片' | '資訊'
const PANEL_TABS: PanelTab[] = ['文字', '色彩', '圖片', '資訊']

interface PanelProps {
  editor: EditorState
  set: (key: keyof EditorState, val: any) => void
  setEditor: React.Dispatch<React.SetStateAction<EditorState>>
  handleImgUpload: (key: keyof EditorState) => (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  activeTab: PanelTab
  setActiveTab: (t: PanelTab) => void
}

// 分頁列（桌機側欄 / 手機底部抽屜共用）
function PanelTabBar({ activeTab, setActiveTab }: { activeTab: PanelTab; setActiveTab: (t: PanelTab) => void }) {
  return (
    <div className="flex border-b border-stone-200 px-1">
      {PANEL_TABS.map(tab => (
        <button key={tab} onClick={() => setActiveTab(tab)}
          className={`flex-1 md:flex-none px-3 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === tab ? 'text-orange-500 font-bold border-orange-500 bg-stone-50' : 'text-stone-500 border-transparent hover:text-stone-700'
          }`}>
          {tab}
        </button>
      ))}
    </div>
  )
}

// 密度預設按鈕組（緊湊／標準／寬鬆）
function DensityPresets({ active, onPick }: { active: 'tight'|'standard'|'loose'; onPick: (p: 'tight'|'standard'|'loose') => void }) {
  return (
    <div className="flex gap-2 mb-3">
      {([['tight','緊湊'],['standard','標準'],['loose','寬鬆']] as const).map(([v, label]) => (
        <button key={v} onClick={() => onPick(v)}
          className={`flex-1 h-8 rounded-lg text-xs transition-colors ${
            active === v ? 'bg-orange-500 text-white font-bold' : 'bg-stone-100 border border-stone-200 text-stone-600 font-medium hover:border-orange-300'
          }`}>
          {label}
        </button>
      ))}
    </div>
  )
}

const PRESET_MAIN_L = {
  tight:    { titleFontSize: 24, subtitleFontSize: 20, monthFontSize: 52 },
  standard: { titleFontSize: 30, subtitleFontSize: 26, monthFontSize: 64 },
  loose:    { titleFontSize: 38, subtitleFontSize: 32, monthFontSize: 80 },
} as const
const PRESET_MAIN_P = {
  tight:    { pTitleFontSize: 18, pSubtitleFontSize: 14, pMonthFontSize: 28 },
  standard: { pTitleFontSize: 22, pSubtitleFontSize: 18, pMonthFontSize: 36 },
  loose:    { pTitleFontSize: 28, pSubtitleFontSize: 22, pMonthFontSize: 46 },
} as const
const PRESET_COURSE_L = {
  tight:    { courseDateFontSize: 14, courseTimeFontSize: 11, courseTitleFontSize: 12, courseInstructorFontSize: 10, courseLocationFontSize: 10, courseFeeFontSize: 11 },
  standard: { courseDateFontSize: 16, courseTimeFontSize: 13, courseTitleFontSize: 14, courseInstructorFontSize: 12, courseLocationFontSize: 12, courseFeeFontSize: 13 },
  loose:    { courseDateFontSize: 18, courseTimeFontSize: 15, courseTitleFontSize: 16, courseInstructorFontSize: 14, courseLocationFontSize: 14, courseFeeFontSize: 15 },
} as const
const PRESET_COURSE_P = {
  tight:    { pCourseDateFontSize: 12, pCourseTimeFontSize: 10, pCourseTitleFontSize: 11, pCourseInstructorFontSize: 9,  pCourseLocationFontSize: 9,  pCourseFeeFontSize: 10 },
  standard: { pCourseDateFontSize: 14, pCourseTimeFontSize: 12, pCourseTitleFontSize: 13, pCourseInstructorFontSize: 11, pCourseLocationFontSize: 11, pCourseFeeFontSize: 12 },
  loose:    { pCourseDateFontSize: 16, pCourseTimeFontSize: 14, pCourseTitleFontSize: 15, pCourseInstructorFontSize: 13, pCourseLocationFontSize: 13, pCourseFeeFontSize: 14 },
} as const

function FontSlider({ label, val, min, max, onChange }: { label: string; val: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-stone-400">{label}</label>
        <span className="text-xs font-bold text-stone-700">{val}px</span>
      </div>
      <input type="range" min={min} max={max} step="1" value={val}
        onChange={ev => onChange(parseInt(ev.target.value))} className="w-full accent-orange-500" />
    </div>
  )
}
  function BgCropPicker({ imgSrc, posX, posY, isLandscape, onChange }: {
  imgSrc: string; posX: number; posY: number; isLandscape: boolean
  onChange: (x: number, y: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const CONTAINER_W = isLandscape ? 192 : 136
  const CONTAINER_H = isLandscape ? 136 : 192

  const getXY = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    onChangeRef.current(Math.round(x), Math.round(y))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let active = false
    const onDown = (e: MouseEvent) => { active = true; getXY(e.clientX, e.clientY) }
    const onMove = (e: MouseEvent) => { if (active) getXY(e.clientX, e.clientY) }
    const onUp = () => { active = false }
    const onTouchStart = (e: TouchEvent) => { getXY(e.touches[0].clientX, e.touches[0].clientY) }
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); getXY(e.touches[0].clientX, e.touches[0].clientY) }
    el.addEventListener('mousedown', onDown)
    el.addEventListener('touchstart', onTouchStart)
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [getXY])

  const dotX = (posX / 100) * CONTAINER_W
  const dotY = (posY / 100) * CONTAINER_H

  return (
    <div>
      <div
        ref={containerRef}
        style={{
          width: CONTAINER_W, height: CONTAINER_H, borderRadius: 8, overflow: 'hidden',
          position: 'relative', cursor: 'crosshair',
          border: '1.5px solid #e7e5e4', userSelect: 'none',
          backgroundImage: imgSrc ? `url(${imgSrc})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: `${posX}% ${posY}%`,
          backgroundColor: imgSrc ? undefined : '#f3f4f6',
        }}
      >
        {!imgSrc && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#a8a29e' }}>尚未上傳底圖</span>}
        <div style={{
          position: 'absolute',
          left: dotX - 10, top: dotY - 10,
          width: 20, height: 20,
          borderRadius: '50%',
          background: 'white',
          border: '2.5px solid #f97316',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          left: Math.max(0, Math.min(CONTAINER_W - 40, dotX - 20)),
          top: Math.max(0, Math.min(CONTAINER_H - 14, dotY + 12)),
          fontSize: 10, color: 'white', background: 'rgba(0,0,0,0.55)',
          borderRadius: 4, padding: '1px 5px', pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>{posX}% / {posY}%</div>
      </div>
      <p className="text-xs text-stone-400 mt-1.5">在縮圖上點擊或拖曳，調整背景顯示位置</p>
    </div>
  )
}

function PanelContent({ editor, set, setEditor, handleImgUpload, activeTab, setActiveTab }: PanelProps): React.ReactElement {
  const e = editor
  const layoutTab: 0 | 1 = ((e as any)._layoutTab ?? 0) as 0 | 1 // 0=橫式 1=直式（主視覺字級用）
  const courseLayoutTab: 0 | 1 = ((e as any)._courseLayoutTab ?? 0) as 0 | 1 // 0=橫式 1=直式（課程資訊字級用）
  const mainPreset = (e as any)._mainPreset ?? 'standard'
  const coursePreset = (e as any)._coursePreset ?? 'standard'

  const pickMainPreset = (p: 'tight'|'standard'|'loose') => {
    const vals = layoutTab === 0 ? PRESET_MAIN_L[p] : PRESET_MAIN_P[p]
    setEditor(prev => ({ ...prev, ...vals, _mainPreset: p } as any))
  }
  const pickCoursePreset = (p: 'tight'|'standard'|'loose') => {
    const vals = courseLayoutTab === 0 ? PRESET_COURSE_L[p] : PRESET_COURSE_P[p]
    setEditor(prev => ({ ...prev, ...vals, _coursePreset: p } as any))
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PanelTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="p-4 space-y-5 overflow-y-auto flex-1" onWheel={ev => ev.stopPropagation()}>

      {/* ══════════ 文字 Tab ══════════ */}
      {activeTab === '文字' && (<>
        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">1. 標題文字</p>
          <div className="space-y-2">
            {(['titleLine1','titleLine2'] as const).map((key, i) => (
              <div key={key}>
                <label className="block text-xs text-stone-400 mb-1">第 {i+1} 行</label>
                <input value={e[key]} onChange={ev => set(key, ev.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-1">2. 主視覺字級</p>
          <p className="text-[11px] text-stone-400 mb-2">左欄標題與月份資訊</p>
          <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-3">
            {(['橫式','直式'] as const).map((t, ti) => (
              <button key={t} onClick={() => set('_layoutTab' as any, ti)}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${layoutTab === ti ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <DensityPresets active={mainPreset} onPick={pickMainPreset} />
          {layoutTab === 0 ? (
            <>
              <FontSlider label="主標題" val={e.titleFontSize} min={16} max={48} onChange={v => set('titleFontSize', v)} />
              <FontSlider label="副標題" val={e.subtitleFontSize} min={14} max={40} onChange={v => set('subtitleFontSize', v)} />
              <FontSlider label="月份數字" val={e.monthFontSize} min={32} max={96} onChange={v => set('monthFontSize', v)} />
            </>
          ) : (
            <>
              <FontSlider label="主標題" val={e.pTitleFontSize} min={12} max={36} onChange={v => set('pTitleFontSize', v)} />
              <FontSlider label="副標題" val={e.pSubtitleFontSize} min={10} max={30} onChange={v => set('pSubtitleFontSize', v)} />
              <FontSlider label="月份數字" val={e.pMonthFontSize} min={20} max={60} onChange={v => set('pMonthFontSize', v)} />
              <FontSlider label="QR 大小" val={e.pQrSize} min={50} max={120} onChange={v => set('pQrSize', v)} />
              <FontSlider label="左欄高度 %" val={e.pLeftWidth} min={20} max={60} onChange={v => set('pLeftWidth', v)} />
              <FontSlider label="月份→文案間距" val={e.pGapMonth} min={0} max={40} onChange={v => set('pGapMonth', v)} />
            </>
          )}
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-1">3. 課程資訊字級</p>
          <p className="text-[11px] text-stone-400 mb-2">表格內各欄位文字</p>
          <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-3">
            {(['橫式','直式'] as const).map((t, ti) => (
              <button key={t} onClick={() => set('_courseLayoutTab' as any, ti)}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${courseLayoutTab === ti ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>
                {t}
              </button>
            ))}
          </div>
          <DensityPresets active={coursePreset} onPick={pickCoursePreset} />
          {courseLayoutTab === 0 ? (
            <>
              <FontSlider label="日期" val={e.courseDateFontSize} min={10} max={24} onChange={v => set('courseDateFontSize', v)} />
              <FontSlider label="時間" val={e.courseTimeFontSize} min={9} max={20} onChange={v => set('courseTimeFontSize', v)} />
              <FontSlider label="活動名稱" val={e.courseTitleFontSize} min={10} max={22} onChange={v => set('courseTitleFontSize', v)} />
              <FontSlider label="授課講師" val={e.courseInstructorFontSize} min={8} max={18} onChange={v => set('courseInstructorFontSize', v)} />
              <FontSlider label="地點" val={e.courseLocationFontSize} min={8} max={18} onChange={v => set('courseLocationFontSize', v)} />
              <FontSlider label="費用" val={e.courseFeeFontSize} min={9} max={20} onChange={v => set('courseFeeFontSize', v)} />
            </>
          ) : (
            <>
              <FontSlider label="日期" val={e.pCourseDateFontSize} min={9} max={20} onChange={v => set('pCourseDateFontSize', v)} />
              <FontSlider label="時間" val={e.pCourseTimeFontSize} min={8} max={18} onChange={v => set('pCourseTimeFontSize', v)} />
              <FontSlider label="活動名稱" val={e.pCourseTitleFontSize} min={9} max={20} onChange={v => set('pCourseTitleFontSize', v)} />
              <FontSlider label="授課講師" val={e.pCourseInstructorFontSize} min={7} max={16} onChange={v => set('pCourseInstructorFontSize', v)} />
              <FontSlider label="地點" val={e.pCourseLocationFontSize} min={7} max={16} onChange={v => set('pCourseLocationFontSize', v)} />
              <FontSlider label="費用" val={e.pCourseFeeFontSize} min={8} max={18} onChange={v => set('pCourseFeeFontSize', v)} />
            </>
          )}
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">4. 間距</p>
          {[
            { key:'gapTitleToQr' as const, label:'標題 → QR Code', val:e.gapTitleToQr, min:0, max:60 },
            { key:'gapQrToContact' as const, label:'QR Code → 聯繫資訊', val:e.gapQrToContact, min:0, max:40 },
          ].map(f => (
            <div key={f.key} className="mb-3">
              <label className="text-xs text-stone-400">{f.label} {f.val}px</label>
              <input type="range" min={f.min} max={f.max} step="2" value={f.val}
                onChange={ev => set(f.key, parseInt(ev.target.value))} className="w-full accent-orange-500" />
            </div>
          ))}
        </div>
      </>)}

      {/* ══════════ 色彩 Tab ══════════ */}
      {activeTab === '色彩' && (<>
        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">1. 顏色</p>
          <div className="space-y-2.5">
            {[
              { key:'accentColor', label:'主題色' }, { key:'brandBgColor', label:'頂部品牌列底色' },
              { key:'leftBgColor', label:'左欄底色' }, { key:'rightBgColor', label:'右欄底色' },
              { key:'footerBgColor', label:'底部背景' }, { key:'footerTextColor', label:'底部文字' },
            ].map(f => (
              <ColorPicker key={f.key} label={f.label} value={(e as any)[f.key]}
                onChange={v => set(f.key as keyof EditorState, v)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">2. 欄位透明度</p>
          {[
            { key:'leftBgOpacity' as const, label:'左欄', val:e.leftBgOpacity },
            { key:'rightBgOpacity' as const, label:'右欄', val:e.rightBgOpacity },
          ].map(f => (
            <div key={f.key} className="mb-3">
              <label className="text-xs text-stone-400">{f.label} {Math.round(f.val*100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={f.val}
                onChange={ev => set(f.key, parseFloat(ev.target.value))} className="w-full accent-orange-500" />
            </div>
          ))}
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">3. 左欄 Pattern</p>
          <div className="relative mb-3">
            <select value={e.patternType} onChange={ev => set('patternType', ev.target.value as PatternType)}
              className="w-full appearance-none border border-stone-200 rounded-lg pl-3 pr-9 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="none">無</option><option value="dots">圓點</option><option value="lines">斜線</option>
              <option value="grid">網格</option><option value="waves">波浪</option><option value="diamonds">菱形</option>
            </select>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {e.patternType !== 'none' && (
            <div>
              <label className="text-xs text-stone-400">濃度 {Math.round(e.patternOpacity*100)}%</label>
              <input type="range" min="0.02" max="0.5" step="0.02" value={e.patternOpacity}
                onChange={ev => set('patternOpacity', parseFloat(ev.target.value))} className="w-full accent-orange-500" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-bold text-stone-400">4. 左欄漸層</p>
            <button onClick={() => set('gradientEnabled', !e.gradientEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${e.gradientEnabled?'bg-orange-500':'bg-stone-200'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${e.gradientEnabled?'translate-x-5':'translate-x-0.5'}`} />
            </button>
          </div>
          {e.gradientEnabled && (
            <div className="space-y-2.5">
              <div className="flex gap-2">
                {([['to-b','上到下'],['to-r','左到右'],['to-br','斜角']] as const).map(([v,label]) => (
                  <button key={v} onClick={() => set('gradientDir', v)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${e.gradientDir===v?'bg-orange-500 text-white border-orange-500':'text-stone-600 border-stone-200 hover:border-orange-300'}`}>{label}</button>
                ))}
              </div>
              <ColorPicker label="起始色" value={e.gradientFrom} onChange={v => set('gradientFrom', v)} />
              <ColorPicker label="結束色" value={e.gradientTo} onChange={v => set('gradientTo', v)} />
              <div>
                <label className="text-xs text-stone-400">強度 {Math.round(e.gradientOpacity*100)}%</label>
                <input type="range" min="0.1" max="1" step="0.05" value={e.gradientOpacity}
                  onChange={ev => set('gradientOpacity', parseFloat(ev.target.value))} className="w-full accent-orange-500" />
              </div>
            </div>
          )}
        </div>
      </>)}

      {/* ══════════ 圖片 Tab ══════════ */}
      {activeTab === '圖片' && (<>
        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">1. 底圖</p>
          <label className="flex items-center gap-2 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2.5 px-3 cursor-pointer transition-colors text-sm text-stone-500">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {e.bgImage ? '已上傳，點擊替換' : '上傳底圖'}
            <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('bgImage')} />
          </label>
          {e.bgImage && <img src={e.bgImage} alt="" className="mt-2 w-full h-14 object-cover rounded-lg border border-stone-200" />}
          <div className="mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-stone-400">透明度 {Math.round(e.bgOpacity*100)}%</label>
              {e.bgImage && <button onClick={() => set('bgImage','')} className="text-xs text-red-400 hover:text-red-600">移除</button>}
            </div>
            <input type="range" min="0" max="1" step="0.05" value={e.bgOpacity}
              onChange={ev => set('bgOpacity', parseFloat(ev.target.value))} className="w-full accent-orange-500" />
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-stone-500 font-medium mb-1.5">橫式位置</p>
              <BgCropPicker imgSrc={e.bgImage} posX={e.bgPositionX} posY={e.bgPositionY} isLandscape={true}
                onChange={(x, y) => { setEditor(prev => ({ ...prev, bgPositionX: x, bgPositionY: y })) }} />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium mb-1.5">直式位置</p>
              <BgCropPicker imgSrc={e.bgImage} posX={e.bgPositionXP} posY={e.bgPositionYP} isLandscape={false}
                onChange={(x, y) => { setEditor(prev => ({ ...prev, bgPositionXP: x, bgPositionYP: y })) }} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">2. QR Code</p>
          <div className="space-y-3">
            <div>
            <p className="text-xs text-stone-500 font-medium mb-2">報名 QR</p>
            <div className="flex gap-1 p-0.5 bg-stone-100 rounded-lg mb-2.5">
              {([['auto','自動生成'] as const, ['upload','手動上傳'] as const]).map(([v, label]) => (
                <button key={v} onClick={() => set('registrationQrMode', v)}
                  className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${e.registrationQrMode === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>
                  {label}
                </button>
              ))}
            </div>
            {e.registrationQrMode === 'auto' ? (
              <div className="flex items-center gap-2">
                <img src={QR_API(SITE_URL, 80)} alt="" className="w-14 h-14 rounded-lg border border-stone-200" />
                <span className="text-xs text-stone-400 leading-relaxed">自動依平台網址<br/>生成 QR Code</span>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {e.registrationQrUpload ? '已上傳，點擊替換' : '上傳報名 QR'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('registrationQrUpload')} />
                </label>
                {e.registrationQrUpload && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={e.registrationQrUpload} alt="" className="w-14 h-14 object-contain rounded-lg border border-stone-200" />
                    <button onClick={() => set('registrationQrUpload', '')} className="text-xs text-red-400 hover:text-red-600">移除</button>
                  </div>
                )}
              </>
            )}
          </div>
            <div>
              <p className="text-xs text-stone-400 mb-1.5">社群 QR Code</p>
              <label className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {e.communityQr ? '已上傳，點擊替換' : '上傳社群QR'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('communityQr')} />
              </label>
              {e.communityQr && <img src={e.communityQr} alt="" className="mt-2 w-14 h-14 object-contain rounded-lg border border-stone-200" />}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">3. 合作夥伴</p>
          <div className="space-y-4">
            {([
              { logoKey:'logo1' as const, nameKey:'logo1Name' as const, label:'1' },
              { logoKey:'logo2' as const, nameKey:'logo2Name' as const, label:'2' },
              { logoKey:'logo3' as const, nameKey:'logo3Name' as const, label:'3' },
            ]).map(f => (
              <div key={f.logoKey}>
                <label className="block text-xs text-stone-400 mb-1">夥伴 {f.label}</label>
                <input value={e[f.nameKey]} onChange={ev => set(f.nameKey, ev.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 mb-1.5" />
                <label className="flex items-center gap-1.5 border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-1.5 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {e[f.logoKey] ? '已上傳' : '上傳 Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload(f.logoKey)} />
                </label>
                {e[f.logoKey] && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <img src={e[f.logoKey]} alt="" className="h-7 w-auto object-contain rounded border border-stone-200" />
                    <button onClick={() => set(f.logoKey,'')} className="text-xs text-red-400 hover:text-red-600">移除</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* ══════════ 資訊 Tab ══════════ */}
      {activeTab === '資訊' && (<>
        <div>
          <p className="text-[13px] font-bold text-stone-400 mb-3">1. 聯繫資訊</p>
          <div className="space-y-2">
            {[
              { key:'phone' as const, label:'電話' },
              { key:'contact' as const, label:'聯絡窗口' },
              { key:'hours' as const, label:'服務時間' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-stone-400 mb-1">{f.label}</label>
                <input value={e[f.key]} onChange={ev => set(f.key, ev.target.value)}
                  className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-stone-200 pt-4">
          <p className="text-xs text-stone-400 leading-relaxed">
            * 聯繫資訊將會自動呈現在直式及橫式海報的最底部區塊。您可以隨時返回此分頁進行文字調整。
          </p>
        </div>
      </>)}

      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 主元件
// ═══════════════════════════════════════════════════════════════════
export default function CourseScheduleExporter({ courses, scheduleSettings: ss, hideTrigger, openSignal }: Props) {
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
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('文字')
  const previewRef = useRef<HTMLDivElement>(null)

  // 外部（後台頁面頂部的「匯出」選單）觸發：signal 每變一次就跳去月份選擇畫面，
  // 不用在這個元件裡再顯示一顆自己的觸發按鈕
  useEffect(() => {
    if (openSignal) setStep('config')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal])
  const supabase = createClient()

  const set = useCallback((key: keyof EditorState, val: any) =>
    setEditor(prev => ({ ...prev, [key]: val })), [])

  const availableMonths = Array.from(
    new Set(courses.map(c => c.date?.slice(0,7)).filter(Boolean))
  ).sort() as string[]

  const monthCourses = selectedMonth
    ? courses.filter(c => c.date?.startsWith(selectedMonth))
        .sort((a,b) => a.date.localeCompare(b.date)||a.time_start.localeCompare(b.time_start))
    : []
  const totalPages = Math.ceil(monthCourses.length / rowsPerPage) || 1

  const initEditor = () => {
    setEditor(prev => ({
      ...prev,
      bgImage: ss.schedule_bg_image || '',
      bgOpacity: parseFloat(ss.schedule_bg_opacity||'') || 0.22,
      accentColor: ss.schedule_accent_color || '#f97316',
      brandBgColor: ss.schedule_brand_bg || '#1c1917',
      leftBgColor: ss.schedule_left_bg_color || '#fff7ed',
      leftBgOpacity: parseFloat(ss.schedule_left_bg_opacity||'') || 0.95,
      patternType: (ss.schedule_pattern_type as PatternType) || 'dots',
      patternOpacity: parseFloat(ss.schedule_pattern_opacity||'') || 0.12,
      gradientEnabled: ss.schedule_gradient_enabled !== 'false',
      gradientDir: (ss.schedule_gradient_dir as GradientDir) || 'to-b',
      gradientFrom: ss.schedule_gradient_from || '#fed7aa',
      gradientTo: ss.schedule_gradient_to || '#fff7ed',
      gradientOpacity: parseFloat(ss.schedule_gradient_opacity||'') || 0.6,
      rightBgColor: ss.schedule_right_bg_color || '#ffffff',
      rightBgOpacity: parseFloat(ss.schedule_right_bg_opacity||'') || 0.92,
      footerBgColor: ss.schedule_footer_bg || '#18120a',
      footerTextColor: ss.schedule_footer_text || '#ffffff',
      communityQr: ss.schedule_community_qr || '',
      logo1: ss.schedule_logo_1 || '', logo1Name: ss.schedule_logo_1_name || '新北市政府城鄉發展局',
      logo2: ss.schedule_logo_2 || '', logo2Name: ss.schedule_logo_2_name || '跨世代共居種子計畫',
      logo3: ss.schedule_logo_3 || '', logo3Name: ss.schedule_logo_3_name || '街道案子團隊',
      phone: ss.schedule_phone || '', contact: ss.schedule_contact || '', hours: ss.schedule_hours || '',
      titleLine1: ss.schedule_title_1 || '新店央北社會住宅',
      titleLine2: ss.schedule_title_2 || '跨世代共居種子計畫',
      titleFontSize: parseInt(ss.schedule_title_font_size||'') || 30,
      subtitleFontSize: parseInt(ss.schedule_subtitle_font_size||'') || 26,
      monthFontSize: parseInt(ss.schedule_month_font_size||'') || 64,
      gapTitleToQr: parseInt(ss.schedule_gap_title_qr||'') || 16,
      gapQrToContact: parseInt(ss.schedule_gap_qr_contact||'') || 12,
      bgPositionX: parseInt(ss.schedule_bg_pos_x||'') || 50,
      bgPositionY: parseInt(ss.schedule_bg_pos_y||'') || 50,
      bgPositionXP: parseInt(ss.schedule_bg_pos_xp||'') || 50,
      bgPositionYP: parseInt(ss.schedule_bg_pos_yp||'') || 50,
      registrationQrMode: (ss.schedule_reg_qr_mode as 'auto'|'upload') || 'auto',
      registrationQrUpload: ss.schedule_reg_qr_upload || '',
      pTitleFontSize: parseInt(ss.schedule_p_title_fs||'') || 22,
      pSubtitleFontSize: parseInt(ss.schedule_p_sub_fs||'') || 18,
      pMonthFontSize: parseInt(ss.schedule_p_month_fs||'') || 36,
      pQrSize: parseInt(ss.schedule_p_qr_size||'') || 80,
      pLeftWidth: parseInt(ss.schedule_p_left_width||'') || 52,
      pGapMonth: parseInt(ss.schedule_p_gap_month||'') || 8,
      courseDateFontSize: parseInt(ss.schedule_course_date_fs||'') || 16,
      courseTimeFontSize: parseInt(ss.schedule_course_time_fs||'') || 13,
      courseTitleFontSize: parseInt(ss.schedule_course_title_fs||'') || 14,
      courseInstructorFontSize: parseInt(ss.schedule_course_instructor_fs||'') || 12,
      courseLocationFontSize: parseInt(ss.schedule_course_location_fs||'') || 12,
      courseFeeFontSize: parseInt(ss.schedule_course_fee_fs||'') || 13,
      pCourseDateFontSize: parseInt(ss.schedule_p_course_date_fs||'') || 14,
      pCourseTimeFontSize: parseInt(ss.schedule_p_course_time_fs||'') || 12,
      pCourseTitleFontSize: parseInt(ss.schedule_p_course_title_fs||'') || 13,
      pCourseInstructorFontSize: parseInt(ss.schedule_p_course_instructor_fs||'') || 11,
      pCourseLocationFontSize: parseInt(ss.schedule_p_course_location_fs||'') || 11,
      pCourseFeeFontSize: parseInt(ss.schedule_p_course_fee_fs||'') || 12,
    }))
  }

  const handleImgUpload = useCallback((key: keyof EditorState) => async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [set, supabase])

  const saveSettings = async () => {
    setSaving(true)
    const toSave: Record<string,string> = {
      schedule_bg_image: editor.bgImage, schedule_bg_opacity: String(editor.bgOpacity),
      schedule_accent_color: editor.accentColor, schedule_brand_bg: editor.brandBgColor,
      schedule_left_bg_color: editor.leftBgColor, schedule_left_bg_opacity: String(editor.leftBgOpacity),
      schedule_pattern_type: editor.patternType, schedule_pattern_opacity: String(editor.patternOpacity),
      schedule_gradient_enabled: String(editor.gradientEnabled), schedule_gradient_dir: editor.gradientDir,
      schedule_gradient_from: editor.gradientFrom, schedule_gradient_to: editor.gradientTo,
      schedule_gradient_opacity: String(editor.gradientOpacity),
      schedule_right_bg_color: editor.rightBgColor, schedule_right_bg_opacity: String(editor.rightBgOpacity),
      schedule_footer_bg: editor.footerBgColor, schedule_footer_text: editor.footerTextColor,
      schedule_community_qr: editor.communityQr,
      schedule_logo_1: editor.logo1, schedule_logo_1_name: editor.logo1Name,
      schedule_logo_2: editor.logo2, schedule_logo_2_name: editor.logo2Name,
      schedule_logo_3: editor.logo3, schedule_logo_3_name: editor.logo3Name,
      schedule_phone: editor.phone, schedule_contact: editor.contact, schedule_hours: editor.hours,
      schedule_title_1: editor.titleLine1, schedule_title_2: editor.titleLine2,
      schedule_title_font_size: String(editor.titleFontSize),
      schedule_subtitle_font_size: String(editor.subtitleFontSize),
      schedule_month_font_size: String(editor.monthFontSize),
      schedule_gap_title_qr: String(editor.gapTitleToQr),
      schedule_gap_qr_contact: String(editor.gapQrToContact),
      schedule_bg_pos_x: String(editor.bgPositionX),
      schedule_bg_pos_y: String(editor.bgPositionY),
      schedule_bg_pos_xp: String(editor.bgPositionXP),
      schedule_bg_pos_yp: String(editor.bgPositionYP),
      schedule_reg_qr_mode: editor.registrationQrMode,
      schedule_reg_qr_upload: editor.registrationQrUpload,
      schedule_p_title_fs: String(editor.pTitleFontSize),
      schedule_p_sub_fs: String(editor.pSubtitleFontSize),
      schedule_p_month_fs: String(editor.pMonthFontSize),
      schedule_p_qr_size: String(editor.pQrSize),
      schedule_p_left_width: String(editor.pLeftWidth),
      schedule_p_gap_month: String(editor.pGapMonth),
      schedule_course_date_fs: String(editor.courseDateFontSize),
      schedule_course_time_fs: String(editor.courseTimeFontSize),
      schedule_course_title_fs: String(editor.courseTitleFontSize),
      schedule_course_instructor_fs: String(editor.courseInstructorFontSize),
      schedule_course_location_fs: String(editor.courseLocationFontSize),
      schedule_course_fee_fs: String(editor.courseFeeFontSize),
      schedule_p_course_date_fs: String(editor.pCourseDateFontSize),
      schedule_p_course_time_fs: String(editor.pCourseTimeFontSize),
      schedule_p_course_title_fs: String(editor.pCourseTitleFontSize),
      schedule_p_course_instructor_fs: String(editor.pCourseInstructorFontSize),
      schedule_p_course_location_fs: String(editor.pCourseLocationFontSize),
      schedule_p_course_fee_fs: String(editor.pCourseFeeFontSize),
    }

    const raw = localStorage.getItem('admin_auth')
    const token = raw ? JSON.parse(raw).token : ''
    await fetch('/api/admin/save-schedule-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ settings: Object.entries(toSave).map(([key,value]) => ({ key, value })) }),
    })
    setSaving(false); setSavedOk(true); setTimeout(() => setSavedOk(false), 2500)
  }
  
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
      img.src = src
    })

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const chars = text.split('')
    const lines: string[] = []
    let current = ''
    for (const ch of chars) {
      const test = current + ch
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current)
        current = ch
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines
  }

  const drawScheduleCanvas = async (
    canvas: HTMLCanvasElement,
    pageCourses: Course[],
    isLandscape: boolean,
    rocYear: number,
    rocMonth: number,
    pageIdx: number,
    totalPgs: number,
    e: EditorState
  ) => {
    await document.fonts.ready

    const W = isLandscape ? A4L_W : A4P_W
    const H = isLandscape ? A4L_H : A4P_H
    const SCALE = 2.5
    canvas.width = W * SCALE
    canvas.height = H * SCALE
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    const ctx = canvas.getContext('2d')!
    ctx.scale(SCALE, SCALE)

    const BRAND_H = 44
    const FOOTER_H = 52
    const LEFT_W = isLandscape ? 290 : W
    const LEFT_H = isLandscape ? H - BRAND_H - FOOTER_H : 240
    const TABLE_TOP = isLandscape ? BRAND_H : BRAND_H + LEFT_H
    const TABLE_W = isLandscape ? W - LEFT_W : W
    const TABLE_H = H - TABLE_TOP - FOOTER_H
    const TABLE_HEADER_H = 44
    const ROW_H = Math.floor((TABLE_H - TABLE_HEADER_H) / (rowsPerPage))
    const emptyRows = Math.max(0, rowsPerPage - pageCourses.length)

    const font = (size: number, weight: number | string = 400) =>
      `${weight} ${size}px "Noto Sans TC","GenSenRounded2TW",sans-serif`

    const fillRoundRect = (x: number, y: number, w: number, h: number, r: number, color: string) => {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
      ctx.fill()
    }

    // ── 背景 ──
    ctx.fillStyle = '#fdf4ea'
    ctx.fillRect(0, 0, W, H)

    if (e.bgImage) {
      try {
        const bgImg = await loadImage(e.bgImage)
        ctx.save()
        ctx.globalAlpha = e.bgOpacity
        const ratio = Math.max(W / bgImg.width, H / bgImg.height)
        const dw = bgImg.width * ratio
        const dh = bgImg.height * ratio
        const bpx = isLandscape ? e.bgPositionX : e.bgPositionXP
        const bpy = isLandscape ? e.bgPositionY : e.bgPositionYP
        const dx = (W - dw) * (bpx / 100)
        const dy = (H - dh) * (bpy / 100)
        ctx.drawImage(bgImg, dx, dy, dw, dh)
        ctx.globalAlpha = 1
        ctx.restore()
      } catch {}
    }

    // ── 左欄背景 ──
    const leftTop = BRAND_H
    ctx.fillStyle = hexToRgba(e.leftBgColor, e.leftBgOpacity)
    ctx.fillRect(0, leftTop, LEFT_W, LEFT_H)

    if (e.gradientEnabled) {
      const gd = e.gradientDir
      let gx0 = 0, gy0 = leftTop, gx1 = 0, gy1 = leftTop + LEFT_H
      if (gd === 'to-r') { gx1 = LEFT_W; gy1 = leftTop }
      if (gd === 'to-br') { gx1 = LEFT_W; gy1 = leftTop + LEFT_H }
      const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
      grad.addColorStop(0, hexToRgba(e.gradientFrom, e.gradientOpacity))
      grad.addColorStop(1, hexToRgba(e.gradientTo, e.gradientOpacity))
      ctx.fillStyle = grad
      ctx.fillRect(0, leftTop, LEFT_W, LEFT_H)
    }

    if (e.patternType !== 'none') {
      const patCanvas = document.createElement('canvas')
      const patSize = e.patternType === 'waves' ? 40 : 24
      patCanvas.width = patSize; patCanvas.height = patSize
      const pc = patCanvas.getContext('2d')!
      pc.globalAlpha = e.patternOpacity
      pc.strokeStyle = e.accentColor
      pc.fillStyle = e.accentColor
      pc.lineWidth = 1.2
      if (e.patternType === 'dots') { pc.beginPath(); pc.arc(patSize/2, patSize/2, 2, 0, Math.PI*2); pc.fill() }
      else if (e.patternType === 'lines') { pc.beginPath(); pc.moveTo(0,0); pc.lineTo(patSize,patSize); pc.stroke() }
      else if (e.patternType === 'grid') { pc.beginPath(); pc.moveTo(0,0); pc.lineTo(patSize,0); pc.moveTo(0,0); pc.lineTo(0,patSize); pc.stroke() }
      else if (e.patternType === 'waves') { pc.beginPath(); pc.moveTo(0,patSize/2); pc.quadraticCurveTo(10,0,20,patSize/2); pc.quadraticCurveTo(30,patSize,40,patSize/2); pc.stroke() }
      else if (e.patternType === 'diamonds') { pc.beginPath(); pc.moveTo(patSize/2,2); pc.lineTo(patSize-2,patSize/2); pc.lineTo(patSize/2,patSize-2); pc.lineTo(2,patSize/2); pc.closePath(); pc.stroke() }
      const pat = ctx.createPattern(patCanvas, 'repeat')
      if (pat) { ctx.save(); ctx.fillStyle = pat; ctx.fillRect(0, leftTop, LEFT_W, LEFT_H); ctx.restore() }
    }

    // 左欄邊線
    if (isLandscape) {
      const grad2 = ctx.createLinearGradient(LEFT_W-1, leftTop, LEFT_W-1, leftTop+LEFT_H)
      grad2.addColorStop(0, hexToRgba(e.accentColor, 0)); grad2.addColorStop(0.5, hexToRgba(e.accentColor, 0.6)); grad2.addColorStop(1, hexToRgba(e.accentColor, 0))
      ctx.fillStyle = grad2; ctx.fillRect(LEFT_W-2, leftTop, 3, LEFT_H)
    } else {
      const grad2 = ctx.createLinearGradient(0, leftTop+LEFT_H-1, LEFT_W, leftTop+LEFT_H-1)
      grad2.addColorStop(0, hexToRgba(e.accentColor, 0)); grad2.addColorStop(0.5, hexToRgba(e.accentColor, 0.6)); grad2.addColorStop(1, hexToRgba(e.accentColor, 0))
      ctx.fillStyle = grad2; ctx.fillRect(0, leftTop+LEFT_H-2, LEFT_W, 3)
    }

   // ── 左欄文字 ──
    const drawLeftContent = async () => {
      const PAD_X = 22
      const qrSize = isLandscape ? 88 : e.pQrSize
      const contactItems = [
        e.phone ? `洽詢專線：${e.phone}` : '',
        e.contact || '',
        e.hours ? `時間：${e.hours}` : '',
      ].filter(Boolean)
      const qrItems = [
        { label: '活動報名', color: e.accentColor, src: e.registrationQrMode === 'upload' && e.registrationQrUpload ? e.registrationQrUpload : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(SITE_URL)}`, sub: '線上報名' },
        { label: '種子社區大學', color: '#06C755', src: e.communityQr, sub: '加入社群' },
      ]

      if (isLandscape) {
        // ── 橫式左欄 ──
        let cy = leftTop + 18

        ctx.font = font(10, 800); ctx.fillStyle = e.accentColor
        ctx.fillText(`${rocYear} 年活動`, PAD_X, cy + 10); cy += 24

        ctx.font = font(e.titleFontSize, 900); ctx.fillStyle = '#18120a'
        const title1Lines = wrapText(ctx, e.titleLine1, LEFT_W - PAD_X * 2)
        title1Lines.forEach((line, li) => {
          ctx.fillText(line, PAD_X, cy + e.titleFontSize + li * e.titleFontSize * 1.2)
        })
        cy += e.titleFontSize * 1.2 * title1Lines.length + 4

        ctx.font = font(e.subtitleFontSize, 900); ctx.fillStyle = e.accentColor
        const title2Lines = wrapText(ctx, e.titleLine2, LEFT_W - PAD_X * 2)
        title2Lines.forEach((line, li) => {
          ctx.fillText(line, PAD_X, cy + e.subtitleFontSize + li * e.subtitleFontSize * 1.2)
        })
        cy += e.subtitleFontSize * 1.2 * title2Lines.length + 6
        // 月份大字
        ctx.font = font(e.monthFontSize, 900); ctx.fillStyle = e.accentColor
        const monthStr = String(rocMonth)
        const monthW = ctx.measureText(monthStr).width
        ctx.fillText(monthStr, PAD_X, cy + e.monthFontSize)
        ctx.font = font(18, 700); ctx.fillStyle = '#6b7280'
        ctx.fillText('月份活動表', PAD_X + monthW + 6, cy + e.monthFontSize)
        cy += e.monthFontSize * 1.2

        ctx.font = font(12, 400); ctx.fillStyle = '#6b7280'
        ctx.fillText('各項活動皆歡迎居民們踴躍報名！', PAD_X, cy + 14); cy += 20
        ctx.font = font(11, 400); ctx.fillStyle = '#9ca3af'
        ctx.fillText('（數量有限，額滿為止）', PAD_X, cy + 13); cy += 20

        cy += e.gapTitleToQr

        // QR boxes
        const qrBoxW = (LEFT_W - PAD_X * 2 - 8) / 2
        const bh = qrSize + 48
        let qrX = PAD_X
        for (const qr of qrItems) {
          fillRoundRect(qrX, cy, qrBoxW, bh, 10, '#ffffff')
          ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1
          ctx.beginPath(); ctx.roundRect(qrX, cy, qrBoxW, bh, 10); ctx.stroke()
          ctx.font = font(9, 800); ctx.fillStyle = qr.color; ctx.textAlign = 'center'
          ctx.fillText(qr.label, qrX + qrBoxW/2, cy + 14)
          ctx.textAlign = 'left'
          if (qr.src) {
            try {
              const qrImg = await loadImage(qr.src)
              ctx.drawImage(qrImg, qrX + (qrBoxW - qrSize)/2, cy + 20, qrSize, qrSize)
            } catch {}
          } else {
            ctx.fillStyle = '#f3f4f6'
            ctx.fillRect(qrX + (qrBoxW-qrSize)/2, cy + 20, qrSize, qrSize)
            ctx.font = font(9, 400); ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center'
            ctx.fillText('未上傳', qrX + qrBoxW/2, cy + 20 + qrSize/2 + 4)
            ctx.textAlign = 'left'
          }
          ctx.font = font(9, 400); ctx.fillStyle = '#6b7280'; ctx.textAlign = 'center'
          ctx.fillText(qr.sub, qrX + qrBoxW/2, cy + 20 + qrSize + 14)
          ctx.textAlign = 'left'
          qrX += qrBoxW + 8
        }
        cy += bh + e.gapQrToContact

        for (const item of contactItems) {
          ctx.fillStyle = '#06C755'
          ctx.beginPath(); ctx.arc(PAD_X + 3, cy + 5, 3, 0, Math.PI*2); ctx.fill()
          ctx.font = font(11, 400); ctx.fillStyle = '#374151'
          const lines = wrapText(ctx, item, LEFT_W - PAD_X * 2 - 12)
          for (const line of lines) { ctx.fillText(line, PAD_X + 10, cy + 13); cy += 16 }
          cy += 2
        }

      } else {
        // ── 直式左欄（橫向分左右兩區） ──
        const leftAreaW = W * (e.pLeftWidth / 100)
        const rightAreaX = leftAreaW + 16
        const rightAreaW = W - rightAreaX - PAD_X
        let cy = leftTop + 28

        // 左側文字區
        ctx.font = font(9, 800); ctx.fillStyle = e.accentColor
        ctx.fillText(`${rocYear} 年活動`, PAD_X, cy + 9); cy += 20

        ctx.font = font(e.pTitleFontSize, 900); ctx.fillStyle = '#18120a'
        ctx.fillText(e.titleLine1, PAD_X, cy + e.pTitleFontSize); cy += e.pTitleFontSize * 1.3

        ctx.font = font(e.pSubtitleFontSize, 900); ctx.fillStyle = e.accentColor
        ctx.fillText(e.titleLine2, PAD_X, cy + e.pSubtitleFontSize); cy += e.pSubtitleFontSize * 1.3

        // 月份大字
        ctx.font = font(e.pMonthFontSize, 900); ctx.fillStyle = e.accentColor
        const monthStr = String(rocMonth)
        const monthW = ctx.measureText(monthStr).width
        ctx.fillText(monthStr, PAD_X, cy + e.pMonthFontSize)
        ctx.font = font(12, 700); ctx.fillStyle = '#6b7280'
        ctx.fillText('月份活動表', PAD_X + monthW + 4, cy + e.pMonthFontSize)
        cy += e.pMonthFontSize * 1.2 + e.pGapMonth

        for (const item of contactItems) {
          ctx.fillStyle = '#06C755'
          ctx.beginPath(); ctx.arc(PAD_X + 2, cy + 4, 2, 0, Math.PI*2); ctx.fill()
          ctx.font = font(9, 400); ctx.fillStyle = '#374151'
          const lines = wrapText(ctx, item, leftAreaW - PAD_X - 12)
          for (const line of lines) { ctx.fillText(line, PAD_X + 8, cy + 10); cy += 14 }
          cy += 2
        }

        // 右側 QR 區
        const qrBoxW = (rightAreaW - 8) / 2
        const bh = qrSize + 42
        const qrStartY = leftTop + (LEFT_H - bh) / 2
        let qrX = rightAreaX
        for (const qr of qrItems) {
          fillRoundRect(qrX, qrStartY, qrBoxW, bh, 8, '#ffffff')
          ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1
          ctx.beginPath(); ctx.roundRect(qrX, qrStartY, qrBoxW, bh, 8); ctx.stroke()
          ctx.font = font(9, 800); ctx.fillStyle = qr.color; ctx.textAlign = 'center'
          ctx.fillText(qr.label, qrX + qrBoxW/2, qrStartY + 13)
          ctx.textAlign = 'left'
          if (qr.src) {
            try {
              const qrImg = await loadImage(qr.src)
              ctx.drawImage(qrImg, qrX + (qrBoxW - qrSize)/2, qrStartY + 18, qrSize, qrSize)
            } catch {}
          } else {
            ctx.fillStyle = '#f3f4f6'
            ctx.fillRect(qrX + (qrBoxW-qrSize)/2, qrStartY + 18, qrSize, qrSize)
            ctx.font = font(8, 400); ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center'
            ctx.fillText('未上傳', qrX + qrBoxW/2, qrStartY + 18 + qrSize/2 + 4)
            ctx.textAlign = 'left'
          }
          ctx.font = font(9, 400); ctx.fillStyle = '#6b7280'; ctx.textAlign = 'center'
          ctx.fillText(qr.sub, qrX + qrBoxW/2, qrStartY + 18 + qrSize + 13)
          ctx.textAlign = 'left'
          qrX += qrBoxW + 8
        }
      }
    }

    await drawLeftContent()

    // ── 右欄底色 ──
    ctx.fillStyle = hexToRgba(e.rightBgColor, e.rightBgOpacity)
    ctx.fillRect(isLandscape ? LEFT_W : 0, TABLE_TOP, TABLE_W, TABLE_H)

    // ── 欄位定義 ──
    const colDefs = isLandscape
      ? [{ label:'日期', w:88 },{ label:'時間', w:104 },{ label:'活動名稱', w:240 },{ label:'授課講師', w:140 },{ label:'地點', w:130 },{ label:'對象', w:96 },{ label:'費用', w:68 }]
      : [{ label:'日期', w:78 },{ label:'時間', w:90 },{ label:'活動名稱', w:196 },{ label:'授課講師', w:130 },{ label:'地點', w:120 },{ label:'對象', w:90 },{ label:'費用', w:90 }]
    const totalColW = colDefs.reduce((s,c) => s+c.w, 0)
    colDefs[2].w += TABLE_W - totalColW - 12
    let colX = (isLandscape ? LEFT_W : 0) + 6
    const colsWithX = colDefs.map(col => { const x = colX; colX += col.w; return { ...col, x } })

    // ── 表頭 ──
    ctx.fillStyle = e.accentColor
    ctx.fillRect(isLandscape ? LEFT_W : 0, TABLE_TOP, TABLE_W, TABLE_HEADER_H)
    ctx.font = font(14, 700); ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'
    for (const col of colsWithX) {
      ctx.fillText(col.label, col.x + col.w/2, TABLE_TOP + TABLE_HEADER_H/2 + 5)
    }
    ctx.textAlign = 'left'

    // ── 課程列 ──
    for (let i = 0; i < pageCourses.length + emptyRows; i++) {
      const rowY = TABLE_TOP + TABLE_HEADER_H + i * ROW_H
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fff7ed'
      ctx.fillRect(isLandscape ? LEFT_W : 0, rowY, TABLE_W, ROW_H)
      ctx.strokeStyle = hexToRgba(e.accentColor, 0.1)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(isLandscape ? LEFT_W : 0, rowY + ROW_H)
      ctx.lineTo(isLandscape ? LEFT_W + TABLE_W : TABLE_W, rowY + ROW_H)
      ctx.stroke()

      if (i >= pageCourses.length) continue
      const course = pageCourses[i]
      const { month: cm, day, weekday } = toROC(course.date)
      const cy = rowY + ROW_H / 2
      const fsDate = isLandscape ? e.courseDateFontSize : e.pCourseDateFontSize
      const fsTime = isLandscape ? e.courseTimeFontSize : e.pCourseTimeFontSize
      const fsTitle = isLandscape ? e.courseTitleFontSize : e.pCourseTitleFontSize
      const fsInstructor = isLandscape ? e.courseInstructorFontSize : e.pCourseInstructorFontSize
      const fsLocation = isLandscape ? e.courseLocationFontSize : e.pCourseLocationFontSize
      const fsFee = isLandscape ? e.courseFeeFontSize : e.pCourseFeeFontSize
      const fsAge = Math.max(9, fsLocation - 1)

      for (let ci = 0; ci < colsWithX.length; ci++) {
        const col = colsWithX[ci]
        ctx.textAlign = 'center'

        if (ci === 0) {
          ctx.font = font(fsDate, 800); ctx.fillStyle = '#18120a'
          ctx.fillText(`${cm}/${day}`, col.x + col.w/2, cy - 2)
          ctx.font = font(Math.max(9, fsDate - 4), 800); ctx.fillStyle = e.accentColor
          ctx.fillText(weekday, col.x + col.w/2, cy + 14)
        } else if (ci === 1) {
          ctx.font = font(fsTime, 700); ctx.fillStyle = '#18120a'
          ctx.fillText(course.time_start?.slice(0,5) || '', col.x + col.w/2, cy - 4)
          ctx.font = font(Math.max(8, fsTime - 3), 400); ctx.fillStyle = hexToRgba(e.accentColor, 0.5)
          ctx.fillText('|', col.x + col.w/2, cy + 6)
          ctx.font = font(fsTime, 700); ctx.fillStyle = '#18120a'
          ctx.fillText(course.time_end?.slice(0,5) || '', col.x + col.w/2, cy + 17)
        } else if (ci === 2) {
          ctx.font = font(fsTitle, 700); ctx.fillStyle = '#18120a'
          ctx.textAlign = 'center'
          const lines = wrapText(ctx, course.title, col.w - 12)
          const lineH = Math.round(fsTitle * 1.28)
          const startY = cy - ((lines.length - 1) * lineH) / 2
          lines.slice(0, 2).forEach((line, li) => {
            ctx.fillText(line, col.x + col.w/2, startY + li * lineH)
          })
        } else if (ci === 3) {
          const instructorText = course.instructor_names?.length ? course.instructor_names.join('、') : course.instructors?.name || ''
          if (instructorText) {
            ctx.font = font(fsInstructor, 700); ctx.fillStyle = e.accentColor
            ctx.fillText(instructorText, col.x + col.w/2, cy + 5)
          }
        } else if (ci === 4) {
          ctx.font = font(fsLocation, 400); ctx.fillStyle = '#374151'
          const lines = wrapText(ctx, course.location, col.w - 8)
          const lineH = Math.round(fsLocation * 1.33)
          const startY = cy - ((lines.length - 1) * lineH) / 2
          lines.slice(0, 2).forEach((line, li) => {
            ctx.fillText(line, col.x + col.w/2, startY + 5 + li * lineH)
          })
        } else if (ci === 5) {
          ctx.font = font(fsAge, 400); ctx.fillStyle = '#374151'
          ctx.fillText(course.suitable_age || '全年齡', col.x + col.w/2, cy + 5)
        } else if (ci === 6) {
          ctx.font = font(fsFee, 800); ctx.fillStyle = e.accentColor
          ctx.fillText('免費', col.x + col.w/2, cy + 5)
        }
        ctx.textAlign = 'left'
      }
    }

    // ── 品牌列（畫在最上層，蓋過左欄） ──
    ctx.fillStyle = e.brandBgColor
    ctx.fillRect(0, 0, W, BRAND_H)
    ctx.fillStyle = e.accentColor
    ctx.fillRect(22, (BRAND_H-14)/2, 3, 14)
    ctx.font = font(13, 800); ctx.fillStyle = '#ffffff'
    ctx.letterSpacing = '0.1em'
    ctx.fillText('XINDIAN · YANGBEI SOCIAL HOUSING', 38, BRAND_H/2 + 5)
    ctx.letterSpacing = '0'
    if (totalPgs > 1) {
      ctx.font = font(12, 400); ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.textAlign = 'right'
      ctx.fillText(`${pageIdx+1} / ${totalPgs}`, W - 22, BRAND_H/2 + 5)
      ctx.textAlign = 'left'
    }

    // ── 頁尾 ──
    ctx.fillStyle = e.footerBgColor
    ctx.fillRect(0, H - FOOTER_H, W, FOOTER_H)
    const partners = [
      { img: e.logo1, name: e.logo1Name },
      { img: e.logo2, name: e.logo2Name },
      { img: e.logo3, name: e.logo3Name },
    ]
    const partW = W / partners.length
    for (let pi = 0; pi < partners.length; pi++) {
      const p = partners[pi]
      const px = pi * partW
      const midY = H - FOOTER_H + FOOTER_H/2
      let textX = px + partW/2
      if (p.img) {
        try {
          const logoImg = await loadImage(p.img)
          const logoH = 24
          const logoW = (logoImg.width / logoImg.height) * logoH
          const totalW = logoW + 8 + ctx.measureText(p.name).width
          const startX = px + (partW - totalW) / 2
          ctx.drawImage(logoImg, startX, midY - logoH/2, logoW, logoH)
          textX = startX + logoW + 8
          ctx.font = font(13, 500); ctx.fillStyle = e.footerTextColor
          ctx.textAlign = 'left'
          ctx.fillText(p.name, textX, midY + 5)
        } catch {
          ctx.font = font(13, 500); ctx.fillStyle = e.footerTextColor
          ctx.textAlign = 'center'
          ctx.fillText(p.name, px + partW/2, midY + 5)
        }
      } else {
        ctx.font = font(13, 500); ctx.fillStyle = e.footerTextColor
        ctx.textAlign = 'center'
        ctx.fillText(p.name, px + partW/2, midY + 5)
      }
      ctx.textAlign = 'left'
      if (pi < partners.length - 1) {
        const sepX = (pi + 1) * partW
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(sepX, H - FOOTER_H + 12); ctx.lineTo(sepX, H - FOOTER_H + 22); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.beginPath(); ctx.arc(sepX, H - FOOTER_H + FOOTER_H/2, 2.5, 0, Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.moveTo(sepX, H - FOOTER_H + FOOTER_H/2 + 6); ctx.lineTo(sepX, H - FOOTER_H + FOOTER_H - 12); ctx.stroke()
      }
    }
  }

  const downloadVariant = async (orient: Orientation) => {
    const { year, month } = toROC(selectedMonth + '-01')
    const label = orient === 'landscape' ? '橫式' : '直式'
    const isL = orient === 'landscape'
    const canvas = document.createElement('canvas')

    for (let pg = 0; pg < totalPages; pg++) {
      const pageCourses = monthCourses.slice(pg * rowsPerPage, (pg + 1) * rowsPerPage)
      await drawScheduleCanvas(canvas, pageCourses, isL, year, month, pg, totalPages, editor)
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = totalPages > 1
        ? `央北社宅_${year}年${month}月活動表_${label}_第${pg+1}頁.png`
        : `央北社宅_${year}年${month}月活動表_${label}.png`
      link.href = dataUrl
      link.click()
      await new Promise(r => setTimeout(r, 200))
    }
  }


  const handleDownload = async (mode: 'landscape'|'portrait'|'both') => {
    setShowDownloadModal(false); setDownloading(true)
    if (mode === 'both') { await downloadVariant('landscape'); await new Promise(r => setTimeout(r, 400)); await downloadVariant('portrait') }
    else await downloadVariant(mode)
    setDownloading(false)
  }

  const reset = () => { setStep('idle'); setCurrentPage(0) }

  if (step === 'idle') return hideTrigger ? null : (
    <button onClick={() => setStep('config')} className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      匯出課表
    </button>
  )

  if (step === 'config') return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) reset() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500 to-orange-400 px-6 py-5">
          <h3 className="font-bold text-white text-xl">匯出課表</h3>
          <p className="text-orange-100 text-sm mt-1">選擇月份與版面設定</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">月份</label>
            {availableMonths.length === 0 ? <p className="text-stone-400 text-sm">目前無課程月份</p>
              : <div className="grid grid-cols-3 gap-2">
                  {availableMonths.map(m => { const [y, mo] = m.split('-'); return (
                    <button key={m} onClick={() => setSelectedMonth(m)}
                      className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedMonth===m?'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100':'text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                      {parseInt(y)-1911}/{parseInt(mo)}月
                    </button>
                  )})}
                </div>
            }
          </div>
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">每頁列數</label>
            <div className="flex gap-2">
              {[2,3,4,5,6,8].map(n => (
                <button key={n} onClick={() => setRowsPerPage(n)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${rowsPerPage===n?'bg-orange-500 text-white border-orange-500':'text-stone-600 border-stone-200 hover:border-orange-300'}`}>{n}</button>
              ))}
            </div>
          </div>
          {selectedMonth && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-stone-600">
              {(() => { const [y, mo] = selectedMonth.split('-'); return `${parseInt(y)-1911} 年 ${parseInt(mo)} 月 · 共 ${monthCourses.length} 堂 · 分 ${totalPages} 頁` })()}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm">取消</button>
            <button onClick={() => { initEditor(); setStep('editor') }} disabled={!selectedMonth}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold py-3 rounded-xl text-sm">進入編輯器</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100">
      {/* 工具列 */}
      <div className="bg-white border-b border-stone-200 flex items-center gap-2 px-3 py-2.5 flex-shrink-0 shadow-sm">
        <button onClick={() => setStep('config')} className="flex items-center gap-1 text-stone-500 hover:text-stone-800 text-sm p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="hidden sm:inline">返回</span>
        </button>
        <div className="w-px h-4 bg-stone-200 hidden sm:block" />
        <span className="font-bold text-stone-700 text-sm hidden sm:inline">課表編輯器</span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_,i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${currentPage===i?'bg-orange-500 text-white':'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>{i+1}</button>
            ))}
          </div>
        )}
        <div className="flex rounded-xl overflow-hidden border border-stone-200">
          {([['landscape','橫'] as const, ['portrait','直'] as const]).map(([v,label]) => (
            <button key={v} onClick={() => setOrientation(v)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${orientation===v?'bg-orange-500 text-white':'bg-white text-stone-500 hover:bg-stone-50'}`}>{label}式</button>
          ))}
        </div>
        <button onClick={() => setShowMobilePanel(true)} className="md:hidden p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 ml-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-xl text-sm font-medium border border-stone-200 transition-colors">
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-stone-400/40 border-t-stone-500 rounded-full animate-spin" />
              : savedOk
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
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

      <div className="flex flex-1" style={{ overflow: 'hidden', minHeight: 0 }}>
        <div
          className="hidden md:flex md:flex-col w-64 bg-white border-r border-stone-200"
          style={{ flex: '0 0 256px', alignSelf: 'stretch', minHeight: 0 }}
        >
          <PanelContent editor={editor} set={set} setEditor={setEditor} handleImgUpload={handleImgUpload} activeTab={activePanelTab} setActiveTab={setActivePanelTab} />
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-3">
            <div ref={previewRef} style={{ transformOrigin: 'top left' }} className="scale-[0.28] sm:scale-[0.42] md:scale-[0.52] lg:scale-[0.65] xl:scale-75 2xl:scale-90 origin-top-left">
              <PreviewPage
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
      </div>

      {/* 手機底部抽屜（Bottom Sheet） */}
      {showMobilePanel && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePanel(false)} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '78vh' }}>
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
              <div className="w-9 h-1 rounded-full bg-stone-200" />
            </div>
            <PanelContent editor={editor} set={set} setEditor={setEditor} handleImgUpload={handleImgUpload} activeTab={activePanelTab} setActiveTab={setActivePanelTab} />
            <div className="flex gap-3 px-4 pt-3 pb-4 border-t border-stone-200 shrink-0">
              <button onClick={saveSettings} disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-orange-50 border-[1.5px] border-orange-500 text-orange-600 font-bold py-2.5 rounded-xl text-sm">
                {saving ? <div className="w-3.5 h-3.5 border-2 border-orange-400/40 border-t-orange-600 rounded-full animate-spin" /> : (savedOk ? '已儲存' : '儲存設定')}
              </button>
              <button onClick={() => setShowDownloadModal(true)} disabled={downloading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm">
                下載
              </button>
            </div>
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
                { mode:'landscape' as const, label:'橫式（A4 橫向）', desc:'適合簡報、電子佈告欄' },
                { mode:'portrait' as const, label:'直式（A4 直向）', desc:'適合印刷、張貼公告' },
                { mode:'both' as const, label:'橫式＋直式', desc:'一次下載兩種版本' },
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
            <button onClick={() => setShowDownloadModal(false)} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-2.5 rounded-xl text-sm">取消</button>
          </div>
        </div>
      )}
    </div>
  )
}
