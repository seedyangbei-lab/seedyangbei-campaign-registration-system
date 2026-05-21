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

function toROC(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    year: d.getFullYear() - 1911,
    month: d.getMonth() + 1,
    day: d.getDate(),
    weekday: WEEKDAYS[d.getDay()],
  }
}

type Orientation = 'landscape' | 'portrait'

interface EditorState {
  bgImage: string; bgOpacity: number
  accentColor: string
  leftBgColor: string; leftBgOpacity: number
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
  bgImage: '', bgOpacity: 0.25,
  accentColor: '#f97316',
  leftBgColor: '#fff7ed', leftBgOpacity: 0.92,
  rightBgColor: '#ffffff', rightBgOpacity: 0.88,
  footerBgColor: '#18120a', footerTextColor: '#ffffff',
  communityQr: '',
  logo1: '', logo1Name: '新北市政府城鄉發展局',
  logo2: '', logo2Name: '跨世代共居種子計畫',
  logo3: '', logo3Name: '街道案子團隊',
  phone: '', contact: '', hours: '',
  titleLine1: '新店央北社會住宅',
  titleLine2: '跨世代共居種子計畫',
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── 課表單頁渲染 ─────────────────────────────────────────────────────
function SchedulePage({
  monthCourses, selectedMonth, rowsPerPage, orientation, editor, pageIdx, totalPages,
}: {
  monthCourses: Course[]; selectedMonth: string; rowsPerPage: number
  orientation: Orientation; editor: EditorState; pageIdx: number; totalPages: number
}) {
  const pageCourses = monthCourses.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage)
  const isL = orientation === 'landscape'
  const { year, month: rocMonth } = toROC(selectedMonth + '-01')

  // A4 直式：794 × 1123px（96dpi）
  const W = isL ? 1123 : 794
  const H = isL ? 794 : 1123
  const LEFT_W = isL ? 260 : 0
  
  const contactItems = [
    editor.phone ? `洽詢：${editor.phone}` : '',
    editor.contact || '',
    editor.hours ? `時間：${editor.hours}` : '',
  ].filter(Boolean)

  const colDefs = [
    { label: '日期', w: isL ? '88px' : '76px' },
    { label: '時間', w: isL ? '100px' : '90px' },
    { label: '活動名稱', w: '1fr' },
    { label: '授課講師', w: isL ? '140px' : '120px' },
    { label: '地點', w: isL ? '120px' : '100px' },
    { label: '對象', w: isL ? '96px' : '80px' },
    { label: '費用', w: isL ? '68px' : '58px' },
  ]

  const gridCols = colDefs.map(c => c.w).join(' ')

  const leftBg = hexToRgba(editor.leftBgColor, editor.leftBgOpacity)
  const rightBg = hexToRgba(editor.rightBgColor, editor.rightBgOpacity)

  // 計算讓課表填滿右側：固定 header 高 + n 列撐滿
  const BRAND_H = 46
  const FOOTER_H = 52
  const TABLE_HEADER_H = 46

  // 直式標題高
  const PORTRAIT_TITLE_H = isL ? 0 : 90

  // 右側可用高度 = 總高 - brand - footer - portrait_title - table_header
  // 用 flex 撐開每列，不固定高度
  const emptyRows = Math.max(0, rowsPerPage - pageCourses.length)

  return (
    <div
      data-schedule-page
      style={{
        width: W,
        height: H,
        fontFamily: '"Noto Sans TC","GenSenRounded2TW",sans-serif',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 底圖層 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#fdf4ea' }}>
        {editor.bgImage && (
          <img
            src={editor.bgImage}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: editor.bgOpacity,
            }}
            crossOrigin="anonymous"
          />
        )}
      </div>

      {/* 內容層 */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* 頂部品牌列 */}
        <div style={{
          background: editor.accentColor,
          height: BRAND_H,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 16, background: 'rgba(255,255,255,0.45)', borderRadius: 2, flexShrink: 0 }} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em' }}>
              XINDIAN · YANGBEI SOCIAL HOUSING
            </span>
          </div>
          {totalPages > 1 && (
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              {pageIdx + 1} / {totalPages}
            </span>
          )}
        </div>

        {/* 主體 */}
        <div style={{ display: 'flex', flex: 1 }}>
        {/* 左側（橫直式都有） */}
          {(
            <div style={{
              width: LEFT_W, flexShrink: 0,
              background: leftBg,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRight: `2px solid ${editor.accentColor}28`,
              display: 'flex', flexDirection: 'column',
              padding: '22px 20px',
            }}>
              {/* 小標籤 */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: editor.accentColor,
                borderRadius: 4, padding: '3px 10px',
                marginBottom: 10, alignSelf: 'flex-start',
              }}>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', lineHeight: 1 }}>
                  {year} 年活動
                </span>
              </div>

              {/* 主標題 */}
              <p style={{ fontSize: 22, fontWeight: 900, color: '#18120a', lineHeight: 1.3, margin: '0 0 4px' }}>
                {editor.titleLine1}
              </p>
              <p style={{ fontSize: 19, fontWeight: 900, color: editor.accentColor, lineHeight: 1.3, margin: '0 0 10px' }}>
                {editor.titleLine2}
              </p>

              {/* 月份大字 */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                <span style={{ fontSize: 48, fontWeight: 900, color: editor.accentColor, lineHeight: 1 }}>{rocMonth}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#78716c' }}>月份活動表</span>
              </div>

              <div style={{ height: 1, background: `${editor.accentColor}25`, marginBottom: 12 }} />

              <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: '0 0 3px' }}>
                各項活動皆歡迎居民們踴躍報名！
              </p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 16px' }}>（數量有限，額滿為止）</p>

              {/* QR Code 並排 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { label: '活動報名', color: editor.accentColor, imgSrc: QR_API(SITE_URL, 200), sub: '↑ 線上報名' },
                  { label: '種子社區大學', color: '#06C755', imgSrc: editor.communityQr, sub: '加入社群' },
                ].map((qr, qi) => (
                  <div key={qi} style={{
                    flex: 1, background: 'rgba(255,255,255,0.82)',
                    borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    padding: '10px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{
                      background: qr.color, borderRadius: 20,
                      padding: '4px 10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>{qr.label}</span>
                    </div>
                    {qr.imgSrc
                      ? <img src={qr.imgSrc} alt="" style={{ width: 86, height: 86, objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
                      : <div style={{ width: 86, height: 86, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>未上傳</span>
                        </div>
                    }
                    <span style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', lineHeight: 1 }}>{qr.sub}</span>
                  </div>
                ))}
              </div>

              {/* 聯繫資訊 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                {contactItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06C755', marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 右側課表 */}
          <div style={{
            flex: 1,
            background: rightBg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column',
          }}>

          
            {/* 表頭 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              background: editor.accentColor,
              height: TABLE_HEADER_H,
              flexShrink: 0,
            }}>
             {colDefs.map(col => (
                <div key={col.label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: 15,
                  padding: '0 8px', textAlign: 'center',
                }}>
                  {col.label}
                </div>
              ))}
              
            </div>

            {/* 課程列 + 空列（flex 撐滿） */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {pageCourses.map((course, i) => {
                const { month: cm, day, weekday } = toROC(course.date)
                return (
                  <div key={course.id} style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    flex: 1,
                    background: i % 2 === 0
                      ? `rgba(255,255,255,${editor.rightBgOpacity * 0.9})`
                      : `rgba(255,247,237,${editor.rightBgOpacity})`,
                    borderBottom: `1px solid ${editor.accentColor}18`,
                    minHeight: 0,
                    alignItems: 'stretch',
                  }}>
                    {/* 日期 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 5 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#18120a', lineHeight: 1 }}>{cm}/{day}</span>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: editor.accentColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 13, lineHeight: 1 }}>{weekday}</span>
                      </div>
                    </div>

                    {/* 時間 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 1 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_start?.slice(0, 5)}</span>
                      <span style={{ fontSize: 13, color: `${editor.accentColor}70`, lineHeight: 1.4 }}>｜</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#18120a', lineHeight: 1 }}>{course.time_end?.slice(0, 5)}</span>
                    </div>

                    {/* 活動名稱 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#18120a', lineHeight: 1.45 }}>
                        {course.title}
                      </span>
                    </div>

                    {/* 講師 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px' }}>
                      {course.instructors?.name && (
                        <div style={{
                          background: `${editor.accentColor}1a`,
                          border: `1px solid ${editor.accentColor}35`,
                          borderRadius: 20, padding: '5px 12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          maxWidth: '100%',
                        }}>
                          <span style={{
                            color: editor.accentColor, fontWeight: 700, fontSize: 14,
                            lineHeight: 1, whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {course.instructors.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 地點 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 6px', textAlign: 'center' }}>
                      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{course.location}</span>
                    </div>

                    {/* 對象 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', textAlign: 'center' }}>
                      <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{course.suitable_age || '全年齡'}</span>
                    </div>

                    {/* 費用 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: editor.accentColor, lineHeight: 1 }}>免費</span>
                    </div>
                  </div>
                )
              })}

              {/* 空列 */}
              {Array.from({ length: emptyRows }).map((_, i) => (
                <div key={`empty-${i}`} style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  flex: 1,
                  background: (pageCourses.length + i) % 2 === 0
                    ? `rgba(255,255,255,${editor.rightBgOpacity * 0.9})`
                    : `rgba(255,247,237,${editor.rightBgOpacity})`,
                  borderBottom: `1px solid ${editor.accentColor}18`,
                  minHeight: 0,
                }}>
                  {colDefs.map((_, ci) => <div key={ci} />)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部夥伴列 */}
        <div style={{
          background: editor.footerBgColor,
          height: FOOTER_H,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 28px',
          borderTop: `2px solid ${editor.accentColor}50`,
          flexShrink: 0,
        }}>
          {[
            { img: editor.logo1, name: editor.logo1Name },
            { img: editor.logo2, name: editor.logo2Name },
            { img: editor.logo3, name: editor.logo3Name },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {p.img && (
                <img src={p.img} alt="" style={{ height: 24, width: 'auto', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
              )}
              <span style={{ color: editor.footerTextColor, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 主元件 ──────────────────────────────────────────────────────────
export default function CourseScheduleExporter({ courses, scheduleSettings: ss }: Props) {
  const [step, setStep] = useState<'idle' | 'config' | 'editor'>('idle')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(4)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [currentPage, setCurrentPage] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR)
  const previewRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const set = useCallback((key: keyof EditorState, val: any) =>
    setEditor(prev => ({ ...prev, [key]: val })), [])

  const availableMonths = Array.from(
    new Set(courses.map(c => c.date?.slice(0, 7)).filter(Boolean))
  ).sort() as string[]

  const monthCourses = selectedMonth
    ? courses
        .filter(c => c.date?.startsWith(selectedMonth))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start))
    : []
  const totalPages = Math.ceil(monthCourses.length / rowsPerPage) || 1

  const initEditor = () => {
    setEditor(prev => ({
      ...prev,
      bgImage: ss.schedule_bg_image || '',
      bgOpacity: parseFloat(ss.schedule_bg_opacity || '') || 0.25,
      accentColor: ss.schedule_accent_color || '#f97316',
      leftBgColor: ss.schedule_left_bg_color || '#fff7ed',
      leftBgOpacity: parseFloat(ss.schedule_left_bg_opacity || '') || 0.92,
      rightBgColor: ss.schedule_right_bg_color || '#ffffff',
      rightBgOpacity: parseFloat(ss.schedule_right_bg_opacity || '') || 0.88,
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
    // 上傳到 Supabase Storage
    const ext = file.name.split('.').pop()
    const path = `schedule/${key}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('images').upload(path, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(path)
      set(key, urlData.publicUrl)
    } else {
      // fallback: base64
      const reader = new FileReader()
      reader.onload = ev => set(key, ev.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  // 儲存到 Supabase site_settings
  const saveSettings = async () => {
    setSaving(true)
    const toSave: Record<string, string> = {
      schedule_community_qr: editor.communityQr,
      schedule_logo_1: editor.logo1, schedule_logo_1_name: editor.logo1Name,
      schedule_logo_2: editor.logo2, schedule_logo_2_name: editor.logo2Name,
      schedule_logo_3: editor.logo3, schedule_logo_3_name: editor.logo3Name,
      schedule_phone: editor.phone,
      schedule_contact: editor.contact,
      schedule_hours: editor.hours,
      schedule_accent_color: editor.accentColor,
      schedule_left_bg_color: editor.leftBgColor,
      schedule_left_bg_opacity: String(editor.leftBgOpacity),
      schedule_right_bg_color: editor.rightBgColor,
      schedule_right_bg_opacity: String(editor.rightBgOpacity),
      schedule_footer_bg: editor.footerBgColor,
      schedule_footer_text: editor.footerTextColor,
      schedule_bg_image: editor.bgImage,
      schedule_bg_opacity: String(editor.bgOpacity),
      schedule_title_1: editor.titleLine1,
      schedule_title_2: editor.titleLine2,
    }
    const settings = Object.entries(toSave).map(([key, value]) => ({ key, value }))
    await fetch('/api/admin/save-schedule-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    setSaving(false); setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
  }

  // 載入已儲存的課表設定
  useEffect(() => {
    if (step === 'editor') {
      setEditor(prev => ({
        ...prev,
        accentColor: ss.schedule_accent_color || prev.accentColor,
        leftBgColor: ss.schedule_left_bg_color || prev.leftBgColor,
        leftBgOpacity: parseFloat(ss.schedule_left_bg_opacity || '') || prev.leftBgOpacity,
        rightBgColor: ss.schedule_right_bg_color || prev.rightBgColor,
        rightBgOpacity: parseFloat(ss.schedule_right_bg_opacity || '') || prev.rightBgOpacity,
        footerBgColor: ss.schedule_footer_bg || prev.footerBgColor,
        footerTextColor: ss.schedule_footer_text || prev.footerTextColor,
        bgImage: ss.schedule_bg_image || prev.bgImage,
        bgOpacity: parseFloat(ss.schedule_bg_opacity || '') || prev.bgOpacity,
        titleLine1: ss.schedule_title_1 || prev.titleLine1,
        titleLine2: ss.schedule_title_2 || prev.titleLine2,
      }))
    }
  }, [step])

  const capturePages = async (orient: Orientation): Promise<string[]> => {
    const origOrient = orientation
    const origPage = currentPage
    setOrientation(orient)
    const urls: string[] = []
    const h2c = (await import('html2canvas')).default
    for (let p = 0; p < totalPages; p++) {
      setCurrentPage(p)
      await new Promise(r => setTimeout(r, 180))
      const el = previewRef.current
      if (!el) continue
      const canvas = await h2c(el, {
        scale: 2, useCORS: true, allowTaint: true,
        backgroundColor: '#fdf4ea', logging: false,
        imageTimeout: 8000,
      })
      urls.push(canvas.toDataURL('image/png'))
    }
    setOrientation(origOrient)
    setCurrentPage(origPage)
    return urls
  }

  const downloadVariant = async (orient: Orientation) => {
    const { year, month } = toROC(selectedMonth + '-01')
    const label = orient === 'landscape' ? '橫式' : '直式'
    const pages = await capturePages(orient)
    pages.forEach((url, i) => {
      const link = document.createElement('a')
      link.download = totalPages > 1
        ? `央北社宅_${year}年${month}月活動表_${label}_第${i + 1}頁.png`
        : `央北社宅_${year}年${month}月活動表_${label}.png`
      link.href = url; link.click()
    })
  }

  const handleDownload = async (mode: 'landscape' | 'portrait' | 'both') => {
    setShowDownloadModal(false)
    setDownloading(true)
    if (mode === 'both') {
      await downloadVariant('landscape')
      await new Promise(r => setTimeout(r, 400))
      await downloadVariant('portrait')
    } else {
      await downloadVariant(mode)
    }
    setDownloading(false)
  }

  const reset = () => { setStep('idle'); setCurrentPage(0) }

  // ── idle ──
  if (step === 'idle') return (
    <button onClick={() => setStep('config')}
      className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      匯出課表
    </button>
  )

  // ── config ──
  if (step === 'config') return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) reset() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500 to-orange-400 px-6 py-5">
          <h3 className="font-bold text-white text-xl tracking-tight">匯出課表</h3>
          <p className="text-orange-100 text-sm mt-1">選擇月份與版面設定後進入編輯器</p>
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
                        className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${selectedMonth === m ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-100' : 'text-stone-600 border-stone-200 hover:border-orange-300 hover:text-orange-600'}`}>
                        {parseInt(y) - 1911}/{parseInt(mo)}月
                      </button>
                    )
                  })}
                </div>
            }
          </div>
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-widest mb-3">每頁列數</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5, 6].map(n => (
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
                return `${parseInt(y) - 1911} 年 ${parseInt(mo)} 月 · 共 ${monthCourses.length} 堂 · 分 ${totalPages} 頁`
              })()}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">取消</button>
            <button onClick={() => { initEditor(); setStep('editor') }} disabled={!selectedMonth}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              進入編輯器
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── editor ──
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100">

      {/* 頂部工具列 */}
      <div className="bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3 flex-shrink-0 shadow-sm">
        <button onClick={() => setStep('config')}
          className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-sm transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          <span className="hidden sm:inline">返回</span>
        </button>

        <div className="w-px h-4 bg-stone-200" />
        <span className="font-bold text-stone-700 text-sm">課表編輯器</span>

        {/* 頁面切換 */}
        {totalPages > 1 && (
          <div className="flex gap-1 ml-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${currentPage === i ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* 方向切換 */}
        <div className="flex rounded-xl overflow-hidden border border-stone-200 ml-1">
          {([['landscape','橫式'], ['portrait','直式']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setOrientation(v)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${orientation === v ? 'bg-orange-500 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 儲存按鈕 */}
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-xl text-sm font-medium transition-colors border border-stone-200">
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-stone-400/40 border-t-stone-500 rounded-full animate-spin" />
              : savedOk
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
            }
            <span className="hidden sm:inline">{savedOk ? '已儲存' : '儲存設定'}</span>
          </button>

          {/* 下載按鈕 */}
          <button onClick={() => setShowDownloadModal(true)} disabled={downloading}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            {downloading
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span className="hidden sm:inline">處理中</span></>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>下載</span></>
            }
          </button>

          <button onClick={reset} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 編輯器主體 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左側控制面板（白底） */}
        <div className="w-64 bg-white border-r border-stone-200 overflow-y-auto flex-shrink-0 hidden md:block">
          <div className="p-4 space-y-5">

            {/* 標題文字 */}
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">標題文字</p>
              <div className="space-y-2">
                {(['titleLine1', 'titleLine2'] as const).map((key, i) => (
                  <div key={key}>
                    <label className="block text-xs text-stone-400 mb-1">第 {i + 1} 行</label>
                    <input value={editor[key]} onChange={e => set(key, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                ))}
              </div>
            </div>

            {/* 顏色 */}
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">顏色</p>
              <div className="space-y-2">
               {[
                  { key: 'accentColor', label: '主題色（標頭 / 按鈕）' },
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

            {/* 左右欄透明度 */}
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">欄位透明度</p>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-400">左欄 {Math.round(editor.leftBgOpacity * 100)}%</label>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={editor.leftBgOpacity}
                    onChange={e => set('leftBgOpacity', parseFloat(e.target.value))} className="w-full" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-400">右欄 {Math.round(editor.rightBgOpacity * 100)}%</label>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={editor.rightBgOpacity}
                    onChange={e => set('rightBgOpacity', parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
              <p className="text-xs text-stone-400 mt-2">調低透明度讓底圖透出</p>
            </div>

            {/* 底圖 */}
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">底圖</p>
              <label className="flex items-center gap-2 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2.5 px-3 cursor-pointer transition-colors text-sm text-stone-500">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {editor.bgImage ? '已上傳，點擊替換' : '上傳底圖（直橫式通用）'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('bgImage')} />
              </label>
              {editor.bgImage && (
                <img src={editor.bgImage} alt="" className="mt-2 w-full h-16 object-cover rounded-lg border border-stone-200" />
              )}
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-stone-400">底圖透明度 {Math.round(editor.bgOpacity * 100)}%</label>
                  {editor.bgImage && <button onClick={() => set('bgImage', '')} className="text-xs text-red-400 hover:text-red-600">移除</button>}
                </div>
                <input type="range" min="0" max="1" step="0.05" value={editor.bgOpacity}
                  onChange={e => set('bgOpacity', parseFloat(e.target.value))} className="w-full" />
                <p className="text-xs text-stone-400 mt-1">降低左右欄不透明度可讓底圖透出</p>
              </div>
            </div>

            {/* QR Code */}
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">QR Code</p>
              <div>
                <p className="text-xs text-stone-400 mb-2">報名 QR（自動生成）</p>
                <img src={QR_API(SITE_URL, 80)} alt="" className="w-14 h-14 rounded-lg border border-stone-200" />
              </div>
              <div className="mt-3">
                <p className="text-xs text-stone-400 mb-2">社群 QR Code</p>
                <label className="flex items-center gap-2 border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  {editor.communityQr ? '已上傳，點擊替換' : '上傳社群QR'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('communityQr')} />
                </label>
                {editor.communityQr && <img src={editor.communityQr} alt="" className="mt-2 w-14 h-14 object-contain rounded-lg border border-stone-200" />}
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
                    <label className="block text-xs text-stone-400 mb-1.5">夥伴 {f.label}</label>
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
        </div>

        {/* 右側預覽區 */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-3">
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
            <p className="text-xs text-stone-400">
              {orientation === 'landscape' ? '橫式 1200px' : '直式 794×1123px (A4)'} · 下載時 @2x
            </p>
          </div>
        </div>
      </div>

      {/* 下載選擇彈窗 */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4" style={{ zIndex: 9999 }}
          onClick={e => { if (e.target === e.currentTarget) setShowDownloadModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-stone-800 text-lg">選擇下載格式</h3>
            <div className="space-y-2">
              {[
                { mode: 'landscape' as const, label: '橫式（16:9）', desc: '適合簡報、電子佈告欄' },
                { mode: 'portrait' as const, label: '直式（A4）', desc: '適合印刷、張貼公告' },
                { mode: 'both' as const, label: '橫式＋直式（兩個）', desc: '一次下載兩種版本' },
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
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-2.5 rounded-xl text-sm transition-colors">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
