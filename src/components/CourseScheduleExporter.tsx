'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { HexColorPicker } from 'react-colorful'

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
  pTitleFontSize: number
  pSubtitleFontSize: number
  pMonthFontSize: number
  pQrSize: number
  pLeftWidth: number
  pGapMonth: number
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
  pTitleFontSize: 22,
  pSubtitleFontSize: 18,
  pMonthFontSize: 36,
  pQrSize: 80,
  pLeftWidth: 52,
  pGapMonth: 8,
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
    setPos({ top: r.bottom + 8, left: Math.max(8, r.right - 224) })
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

interface PageData {
  pageCourses: Course[]; rowsPerPage: number; isLandscape: boolean
  year: number; rocMonth: number; pageIdx: number; totalPages: number; editor: EditorState
}

// ═══════════════════════════════════════════════════════════════════
// 下載專用版
// ═══════════════════════════════════════════════════════════════════
function DownloadPage({ data }: { data: PageData }) {
  const { pageCourses, rowsPerPage, isLandscape, year, rocMonth, pageIdx, totalPages, editor: e } = data
  const W = isLandscape ? A4L_W : A4P_W
  const H = isLandscape ? A4L_H : A4P_H
  const BRAND_H = 44
  const FOOTER_H = 52
  const LEFT_W = isLandscape ? 290 : W
  const LEFT_H = isLandscape ? H - BRAND_H - FOOTER_H : 240
  const TABLE_TOP = isLandscape ? BRAND_H : BRAND_H + LEFT_H
  const TABLE_W = isLandscape ? W - LEFT_W : W
  const TABLE_H = H - TABLE_TOP - FOOTER_H
  const TABLE_HEADER_H = 44
  const ROW_H = Math.floor((TABLE_H - TABLE_HEADER_H) / rowsPerPage)
  const emptyRows = Math.max(0, rowsPerPage - pageCourses.length)

  const leftBg = hexToRgba(e.leftBgColor, e.leftBgOpacity)
  const rightBg = hexToRgba(e.rightBgColor, e.rightBgOpacity)
  const patternBg = getSvgPattern(e.patternType, e.accentColor, e.patternOpacity)
  const gradBg = e.gradientEnabled ? `linear-gradient(${GRADIENT_CSS[e.gradientDir]}, ${hexToRgba(e.gradientFrom, e.gradientOpacity)}, ${hexToRgba(e.gradientTo, e.gradientOpacity)})` : ''

  const colDefs = isLandscape
    ? [{ label:'日期', w:88 },{ label:'時間', w:104 },{ label:'活動名稱', w:240 },{ label:'授課講師', w:140 },{ label:'地點', w:130 },{ label:'對象', w:96 },{ label:'費用', w:68 }]
    : [{ label:'日期', w:78 },{ label:'時間', w:90 },{ label:'活動名稱', w:196 },{ label:'授課講師', w:130 },{ label:'地點', w:120 },{ label:'對象', w:90 },{ label:'費用', w:90 }]
  const totalColW = colDefs.reduce((s,c) => s + c.w, 0)
  colDefs[2].w += TABLE_W - totalColW - 12

  let colX = 6
  const colsWithX = colDefs.map(col => { const x = colX; colX += col.w; return { ...col, x } })

  const contactItems = [
    e.phone ? `如有任何問題，請撥打洽詢專線：${e.phone}` : '',
    e.contact || '', e.hours ? `時間：${e.hours}` : '',
  ].filter(Boolean)

  const partners = [
    { img: e.logo1, name: e.logo1Name },
    { img: e.logo2, name: e.logo2Name },
    { img: e.logo3, name: e.logo3Name },
  ]

  const qrSize = isLandscape ? 88 : 60

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', fontFamily: '"Noto Sans TC","GenSenRounded2TW",sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#fdf4ea' }} />
      {e.bgImage && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(${e.bgImage})`, backgroundSize: 'cover', backgroundPosition: `${e.bgPositionX}% ${e.bgPositionY}%`, opacity: e.bgOpacity }} />
      )}

      {/* 品牌列 */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: BRAND_H, background: e.brandBgColor, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 14, background: e.accentColor, borderRadius: 2 }} />
          <span style={{ color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em' }}>XINDIAN · YANGBEI SOCIAL HOUSING</span>
        </div>
        {totalPages > 1 && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{pageIdx+1} / {totalPages}</span>}
      </div>

      {/* 左欄背景 */}
      <div style={{ position: 'absolute', top: BRAND_H, left: 0, width: LEFT_W, height: LEFT_H, background: leftBg }}>
        {gradBg && <div style={{ position: 'absolute', inset: 0, background: gradBg }} />}
        {patternBg && <div style={{ position: 'absolute', inset: 0, backgroundImage: patternBg, backgroundRepeat: 'repeat' }} />}
        {isLandscape
          ? <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(to bottom,${e.accentColor}00,${e.accentColor}60,${e.accentColor}00)` }} />
          : <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right,${e.accentColor}00,${e.accentColor}60,${e.accentColor}00)` }} />
        }
      </div>

      {/* 左欄內容 - 橫式 */}
      {isLandscape && (
        <div style={{ position: 'absolute', top: BRAND_H, left: 0, width: LEFT_W, height: LEFT_H, display: 'flex', flexDirection: 'column', padding: '18px 22px 16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' }}>
            <span style={{ color: e.accentColor, fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}>{year} 年活動</span>
          </div>
          <p style={{ margin: 0, fontSize: e.titleFontSize, fontWeight: 900, color: '#18120a', lineHeight: 1.25 }}>{e.titleLine1}</p>
          <p style={{ margin: '4px 0 8px', fontSize: e.subtitleFontSize, fontWeight: 900, color: e.accentColor, lineHeight: 1.25 }}>{e.titleLine2}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
            <span style={{ fontSize: e.monthFontSize, fontWeight: 900, color: e.accentColor, lineHeight: 1 }}>{rocMonth}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>月份活動表</span>
          </div>
          <p style={{ margin: '0 0 2px', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>各項活動皆歡迎居民們踴躍報名！</p>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>（數量有限，額滿為止）</p>
          <div style={{ height: e.gapTitleToQr }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label:'活動報名', color: e.accentColor, img: QR_API(SITE_URL,200), sub:'線上報名' },
              { label:'種子社區大學', color:'#06C755', img: e.communityQr, sub:'加入社群' },
            ].map((qr,qi) => (
              <div key={qi} style={{ flex: 1, background: '#ffffff', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ color: qr.color, fontSize: 9, fontWeight: 800, lineHeight: 1.4, display: 'block', textAlign: 'center' }}>{qr.label}</span>
                {qr.img
                  ? <img src={qr.img} alt="" crossOrigin="anonymous" style={{ width: qrSize, height: qrSize, objectFit: 'contain' }} />
                  : <div style={{ width: qrSize, height: qrSize, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, color: '#9ca3af' }}>未上傳</span></div>
                }
                <span style={{ fontSize: 9, color: '#6b7280', textAlign: 'center' }}>{qr.sub}</span>
              </div>
            ))}
          </div>
          <div style={{ height: e.gapQrToContact }} />
          <div style={{ marginTop: 'auto' }}>
            {contactItems.map((item, i) => <ContactLine key={i} item={item} />)}
          </div>
        </div>
      )}

      {/* 左欄內容 - 直式 */}
      {!isLandscape && (
        <div style={{ position: 'absolute', top: BRAND_H, left: 0, right: 0, height: 240, display: 'flex', alignItems: 'center', padding: '16px 28px', gap: 20 }}>
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
            {contactItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 2 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#06C755', marginTop: 5, flexShrink: 0 }} />
                <span style={{ fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {[
              { label:'活動報名', color: e.accentColor, img: QR_API(SITE_URL,200), sub:'線上報名' },
              { label:'種子社區大學', color:'#06C755', img: e.communityQr, sub:'加入社群' },
            ].map((qr,qi) => (
              <div key={qi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ color: qr.color, fontSize: 8, fontWeight: 800, lineHeight: 1.4, textAlign: 'center' }}>{qr.label}</span>
                {qr.img
                  ? <img src={qr.img} alt="" crossOrigin="anonymous" style={{ width: e.pQrSize, height: e.pQrSize, objectFit: 'contain', display: 'block' }} />
                  : <div style={{ width: e.pQrSize, height: e.pQrSize, background: '#f3f4f6', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, color: '#9ca3af' }}>未上傳</span></div>
                }
                <span style={{ fontSize: 8, color: '#6b7280', textAlign: 'center' }}>{qr.sub}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 表頭 */}
      <div style={{ position: 'absolute', top: TABLE_TOP, left: isLandscape ? LEFT_W : 0, width: TABLE_W, height: TABLE_HEADER_H, background: e.accentColor, display: 'flex', alignItems: 'center' }}>
        {colsWithX.map(col => (
          <div key={col.label} style={{ position: 'absolute', left: col.x, width: col.w, height: TABLE_HEADER_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{col.label}</span>
          </div>
        ))}
      </div>

      {/* 課程列 */}
      {pageCourses.map((course, i) => {
        const { month: cm, day, weekday } = toROC(course.date)
        const rowY = TABLE_TOP + TABLE_HEADER_H + i * ROW_H
        return (
          <div key={course.id} style={{ position: 'absolute', top: rowY, left: isLandscape ? LEFT_W : 0, width: TABLE_W, height: ROW_H, background: i%2===0 ? '#ffffff' : '#fff7ed', borderBottom: `1px solid ${e.accentColor}18` }}>
            {colsWithX.map((col, ci) => {
              const padV = Math.floor((ROW_H - 26) / 2)
              const cs: React.CSSProperties = { position: 'absolute', left: col.x, width: col.w, height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `${padV}px 4px`, boxSizing: 'border-box' }
              if (ci === 0) return <div key={ci} style={cs}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 16, fontWeight: 800, color: '#18120a', lineHeight: 1 }}>{cm}/{day}</span><span style={{ fontWeight: 800, fontSize: 12, color: e.accentColor, lineHeight: 1 }}>{weekday}</span></div></div>
              if (ci === 1) return <div key={ci} style={cs}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}><span style={{ fontSize: 13, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_start?.slice(0,5)}</span><span style={{ fontSize: 10, color: `${e.accentColor}80`, lineHeight: 1.2 }}>|</span><span style={{ fontSize: 13, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_end?.slice(0,5)}</span></div></div>
              if (ci === 2) return <div key={ci} style={{ ...cs, justifyContent: 'center' }}><span style={{ fontSize: 14, fontWeight: 700, color: '#18120a', lineHeight: 1.4, textAlign: 'center', wordBreak: 'break-word' }}>{course.title}</span></div>
              if (ci === 3) return <div key={ci} style={cs}>{course.instructors?.name && <span style={{ color: e.accentColor, fontWeight: 700, fontSize: 12, lineHeight: 1 }}>{course.instructors.name}</span>}</div>
              if (ci === 4) return <div key={ci} style={{ ...cs, padding: '0 6px' }}><span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4, textAlign: 'center', wordBreak: 'break-word' }}>{course.location}</span></div>
              if (ci === 5) return <div key={ci} style={cs}><span style={{ fontSize: 11, color: '#374151', lineHeight: 1.4, textAlign: 'center' }}>{course.suitable_age||'全年齡'}</span></div>
              if (ci === 6) return <div key={ci} style={cs}><span style={{ fontSize: 13, fontWeight: 800, color: e.accentColor, lineHeight: 1 }}>免費</span></div>
              return <div key={ci} style={cs} />
            })}
          </div>
        )
      })}

      {/* 空列 */}
      {Array.from({ length: emptyRows }).map((_, i) => {
        const rowY = TABLE_TOP + TABLE_HEADER_H + (pageCourses.length + i) * ROW_H
        return <div key={`e${i}`} style={{ position: 'absolute', top: rowY, left: isLandscape ? LEFT_W : 0, width: TABLE_W, height: ROW_H, background: (pageCourses.length+i)%2===0 ? '#ffffff' : '#fff7ed', borderBottom: `1px solid ${e.accentColor}18` }} />
      })}

      {/* 右欄底色 */}
      <div style={{ position: 'absolute', top: TABLE_TOP, left: isLandscape ? LEFT_W : 0, width: TABLE_W, height: TABLE_H, background: rightBg }} />

      {/* 底部 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_H, background: e.footerBgColor, display: 'flex', alignItems: 'center' }}>
        {partners.map((p, i) => (
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
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(${e.bgImage})`, backgroundSize: 'cover', backgroundPosition: `${e.bgPositionX}% ${e.bgPositionY}%`, opacity: e.bgOpacity }} />
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
                  <QrBox label="活動報名" color={e.accentColor} imgSrc={QR_API(SITE_URL,200)} sub="線上報名" />
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
                  <QrBox label="活動報名" color={e.accentColor} imgSrc={QR_API(SITE_URL,200)} sub="線上報名" />
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
                return (
                  <div key={course.id} style={{ display: 'grid', gridTemplateColumns: gridCols, flex: 1, minHeight: 0, background: i%2===0 ? '#ffffff' : '#fff7ed', borderBottom: `1px solid ${e.accentColor}18`, alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#18120a', lineHeight: 1 }}>{cm}/{day}</span>
                      <span style={{ fontWeight: 800, fontSize: 12, color: e.accentColor, lineHeight: 1 }}>{weekday}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_start?.slice(0,5)}</span>
                      <span style={{ fontSize: 10, color: `${e.accentColor}80`, lineHeight: 1.2 }}>|</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_end?.slice(0,5)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', textAlign: 'center' }}><span style={{ fontSize: 14, fontWeight: 700, color: '#18120a', lineHeight: 1.4 }}>{course.title}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px' }}>
                      {course.instructors?.name && <span style={{ color: e.accentColor, fontWeight: 700, fontSize: 12, lineHeight: 1 }}>{course.instructors.name}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', textAlign: 'center' }}><span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>{course.location}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', textAlign: 'center' }}><span style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>{course.suitable_age||'全年齡'}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}><span style={{ fontSize: 13, fontWeight: 800, color: e.accentColor, lineHeight: 1 }}>免費</span></div>
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
interface PanelProps {
  editor: EditorState
  set: (key: keyof EditorState, val: any) => void
  handleImgUpload: (key: keyof EditorState) => (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

function PanelContent({ editor, set, handleImgUpload }: PanelProps): React.ReactElement {
  const e = editor
  return (
    <div className="p-4 space-y-5" onWheel={ev => ev.stopPropagation()}>
      {/* 標題文字 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">標題文字</p>
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

      {/* 字級控制 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">字級大小</p>
        <div className="flex gap-1 p-1 bg-stone-100 rounded-lg mb-3">
          {(['橫式','直式'] as const).map((t, ti) => (
            <button key={t} onClick={() => set('_layoutTab' as any, ti)}
              className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${(e as any)._layoutTab === ti || (!('_layoutTab' in e) && ti === 0) ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}>
              {t}
            </button>
          ))}
        </div>
        {((e as any)._layoutTab ?? 0) === 0 ? (
          <>
            {[
              { key:'titleFontSize' as const, label:'主標題', val:e.titleFontSize, min:16, max:48 },
              { key:'subtitleFontSize' as const, label:'副標題', val:e.subtitleFontSize, min:14, max:40 },
              { key:'monthFontSize' as const, label:'月份數字', val:e.monthFontSize, min:32, max:96 },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="text-xs text-stone-400">{f.label} {f.val}px</label>
                <input type="range" min={f.min} max={f.max} step="1" value={f.val}
                  onChange={ev => set(f.key, parseInt(ev.target.value))} className="w-full accent-orange-500" />
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { key:'pTitleFontSize' as const, label:'主標題', val:e.pTitleFontSize, min:12, max:36 },
              { key:'pSubtitleFontSize' as const, label:'副標題', val:e.pSubtitleFontSize, min:10, max:30 },
              { key:'pMonthFontSize' as const, label:'月份數字', val:e.pMonthFontSize, min:20, max:60 },
              { key:'pQrSize' as const, label:'QR 大小', val:e.pQrSize, min:50, max:120 },
              { key:'pLeftWidth' as const, label:'左欄高度 %', val:e.pLeftWidth, min:20, max:60 },
              { key:'pGapMonth' as const, label:'月份→文案間距', val:e.pGapMonth, min:0, max:40 },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="text-xs text-stone-400">{f.label} {f.val}px</label>
                <input type="range" min={f.min} max={f.max} step="1" value={f.val}
                  onChange={ev => set(f.key, parseInt(ev.target.value))} className="w-full accent-orange-500" />
              </div>
            ))}
          </>
        )}
      </div>

      {/* 間距控制 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">間距</p>
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

      {/* 顏色 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">顏色</p>
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

      {/* 透明度 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">欄位透明度</p>
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

      {/* Pattern */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">左欄 Pattern</p>
        <select value={e.patternType} onChange={ev => set('patternType', ev.target.value as PatternType)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300 mb-3">
          <option value="none">無</option><option value="dots">圓點</option><option value="lines">斜線</option>
          <option value="grid">網格</option><option value="waves">波浪</option><option value="diamonds">菱形</option>
        </select>
        {e.patternType !== 'none' && (
          <div>
            <label className="text-xs text-stone-400">濃度 {Math.round(e.patternOpacity*100)}%</label>
            <input type="range" min="0.02" max="0.5" step="0.02" value={e.patternOpacity}
              onChange={ev => set('patternOpacity', parseFloat(ev.target.value))} className="w-full accent-orange-500" />
          </div>
        )}
      </div>

      {/* 漸層 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">左欄漸層</p>
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

      {/* 底圖 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">底圖</p>
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
        <div className="mt-2.5 space-y-2">
          <div>
            <label className="text-xs text-stone-400">水平位置 {e.bgPositionX}%</label>
            <input type="range" min="0" max="100" step="5" value={e.bgPositionX}
              onChange={ev => set('bgPositionX', parseInt(ev.target.value))} className="w-full accent-orange-500" />
          </div>
          <div>
            <label className="text-xs text-stone-400">垂直位置 {e.bgPositionY}%</label>
            <input type="range" min="0" max="100" step="5" value={e.bgPositionY}
              onChange={ev => set('bgPositionY', parseInt(ev.target.value))} className="w-full accent-orange-500" />
          </div>
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
              {e.communityQr ? '已上傳，點擊替換' : '上傳社群QR'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('communityQr')} />
            </label>
            {e.communityQr && <img src={e.communityQr} alt="" className="mt-2 w-14 h-14 object-contain rounded-lg border border-stone-200" />}
          </div>
        </div>
      </div>

      {/* 夥伴 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">合作夥伴</p>
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

      {/* 聯繫 */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">聯繫資訊</p>
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
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// 主元件
// ═══════════════════════════════════════════════════════════════════
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
  const downloadRefL = useRef<HTMLDivElement>(null)
  const downloadRefP = useRef<HTMLDivElement>(null)
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
      pTitleFontSize: parseInt(ss.schedule_p_title_fs||'') || 22,
      pSubtitleFontSize: parseInt(ss.schedule_p_sub_fs||'') || 18,
      pMonthFontSize: parseInt(ss.schedule_p_month_fs||'') || 36,
      pQrSize: parseInt(ss.schedule_p_qr_size||'') || 80,
      pLeftWidth: parseInt(ss.schedule_p_left_width||'') || 52,
      pGapMonth: parseInt(ss.schedule_p_gap_month||'') || 8,
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
      schedule_p_title_fs: String(editor.pTitleFontSize),
      schedule_p_sub_fs: String(editor.pSubtitleFontSize),
      schedule_p_month_fs: String(editor.pMonthFontSize),
      schedule_p_qr_size: String(editor.pQrSize),
      schedule_p_left_width: String(editor.pLeftWidth),
      schedule_p_gap_month: String(editor.pGapMonth),
    }

    await fetch('/api/admin/save-schedule-settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: Object.entries(toSave).map(([key,value]) => ({ key, value })) }),
    })
    setSaving(false); setSavedOk(true); setTimeout(() => setSavedOk(false), 2500)
  }

  const downloadVariant = async (orient: Orientation) => {
    const { year, month } = toROC(selectedMonth + '-01')
    const label = orient === 'landscape' ? '橫式' : '直式'
    const h2c = (await import('html2canvas')).default
    const W = orient === 'landscape' ? A4L_W : A4P_W
    const H = orient === 'landscape' ? A4L_H : A4P_H
    const ref = orient === 'landscape' ? downloadRefL : downloadRefP
    const urls: string[] = []
    const el = ref.current; if (!el) return

    const originalParent = el.parentElement
    const originalNextSibling = el.nextSibling
    const originalStyle = el.getAttribute('style') || ''

    document.body.appendChild(el)
    el.style.cssText = `position:absolute;left:-9999px;top:0;z-index:-1;width:${W}px;height:${H}px;overflow:hidden;pointer-events:none;`

    for (let pg = 0; pg < totalPages; pg++) {
      setCurrentPage(pg)
      await new Promise(r => setTimeout(r, 600))
      const canvas = await h2c(el, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#fdf4ea',
        logging: false, imageTimeout: 15000, width: W, height: H,
        x: 0, y: 0, scrollX: 0, scrollY: 0, windowWidth: W, windowHeight: H,
      })
      urls.push(canvas.toDataURL('image/png'))
    }

    el.setAttribute('style', originalStyle)
    if (originalParent) {
      if (originalNextSibling) originalParent.insertBefore(el, originalNextSibling)
      else originalParent.appendChild(el)
    }

    urls.forEach((url, i) => {
      const link = document.createElement('a')
      link.download = totalPages > 1
        ? `央北社宅_${year}年${month}月活動表_${label}_第${i+1}頁.png`
        : `央北社宅_${year}年${month}月活動表_${label}.png`
      link.href = url; link.click()
    })
  }

  const handleDownload = async (mode: 'landscape'|'portrait'|'both') => {
    setShowDownloadModal(false); setDownloading(true)
    if (mode === 'both') { await downloadVariant('landscape'); await new Promise(r => setTimeout(r, 400)); await downloadVariant('portrait') }
    else await downloadVariant(mode)
    setDownloading(false)
  }

  const reset = () => { setStep('idle'); setCurrentPage(0) }

  if (step === 'idle') return (
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
              {[2,3,4,5,6].map(n => (
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
          className="hidden md:block w-64 bg-white border-r border-stone-200"
          style={{ overflowY: 'auto', flex: '0 0 256px', alignSelf: 'stretch' }}
        >
          <PanelContent editor={editor} set={set} handleImgUpload={handleImgUpload} />
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-3">
            <div style={{ transformOrigin: 'top left' }} className="scale-[0.28] sm:scale-[0.42] md:scale-[0.52] lg:scale-[0.65] xl:scale-75 2xl:scale-90 origin-top-left">
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

      {/* 隱藏下載 DOM */}
      <div ref={downloadRefL} style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none', zIndex: -1, width: A4L_W, height: A4L_H, overflow: 'hidden' }}>
        <DownloadPage data={{
          pageCourses: monthCourses.slice(currentPage*rowsPerPage, (currentPage+1)*rowsPerPage),
          rowsPerPage, isLandscape: true,
          year: selectedMonth ? toROC(selectedMonth+'-01').year : 115,
          rocMonth: selectedMonth ? toROC(selectedMonth+'-01').month : 1,
          pageIdx: currentPage, totalPages, editor,
        }} />
      </div>
      <div ref={downloadRefP} style={{ position: 'fixed', left: '-99999px', top: A4L_H+40, pointerEvents: 'none', zIndex: -1, width: A4P_W, height: A4P_H, overflow: 'hidden' }}>
        <DownloadPage data={{
          pageCourses: monthCourses.slice(currentPage*rowsPerPage, (currentPage+1)*rowsPerPage),
          rowsPerPage, isLandscape: false,
          year: selectedMonth ? toROC(selectedMonth+'-01').year : 115,
          rocMonth: selectedMonth ? toROC(selectedMonth+'-01').month : 1,
          pageIdx: currentPage, totalPages, editor,
        }} />
      </div>

      {/* 手機抽屜 */}
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
            <PanelContent editor={editor} set={set} handleImgUpload={handleImgUpload} />
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
