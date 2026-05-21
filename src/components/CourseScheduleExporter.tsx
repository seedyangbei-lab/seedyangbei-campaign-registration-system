'use client'

import { useState, useRef, useCallback } from 'react'
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
  return { year: d.getFullYear()-1911, month: d.getMonth()+1, day: d.getDate(), weekday: WEEKDAYS[d.getDay()] }
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
  leftBgColor: '#fff7ed', leftBgOpacity: 0.88,
  rightBgColor: '#ffffff', rightBgOpacity: 0.75,
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
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── 課表渲染 ────────────────────────────────────────────────────────
function ScheduleCanvas({
  monthCourses, selectedMonth, rowsPerPage, orientation, editor, pageIdx,
}: {
  monthCourses: Course[]; selectedMonth: string
  rowsPerPage: number; orientation: Orientation
  editor: EditorState; pageIdx: number
}) {
  const totalPages = Math.ceil(monthCourses.length / rowsPerPage) || 1
  const pageCourses = monthCourses.slice(pageIdx * rowsPerPage, (pageIdx+1) * rowsPerPage)
  const isL = orientation === 'landscape'
  const { year, month: rocMonth } = toROC(selectedMonth + '-01')

  // A4 直式：595×842pt → 顯示用 794×1123px（@96dpi）
  const canvasW = isL ? 1200 : 794
  const canvasH = isL ? undefined : 1123

  const contactItems = [
    editor.phone ? `洽詢：${editor.phone}` : '',
    editor.contact || '',
    editor.hours ? `服務時間：${editor.hours}` : '',
  ].filter(Boolean)

  const gridCols = isL
    ? '88px 108px 1fr 148px 128px 108px 72px'
    : '80px 100px 1fr 140px 110px 90px'
  const headers = isL
    ? ['日期','時間','活動名稱','授課講師','地點','對象','費用']
    : ['日期','時間','活動名稱','授課講師','地點','對象']

  const leftBg = hexToRgba(editor.leftBgColor, editor.leftBgOpacity)
  const rightBg = hexToRgba(editor.rightBgColor, editor.rightBgOpacity)

  // 計算行高，讓右側填滿
  const BRAND_H = 50
  const TABLE_HEADER_H = 46
  const FOOTER_H = 52
  const LEFT_W = isL ? 292 : 0
  const availableH = canvasH
    ? canvasH - BRAND_H - TABLE_HEADER_H - FOOTER_H - (!isL ? 100 : 0)
    : undefined
  const rowH = availableH ? Math.floor(availableH / rowsPerPage) : 96

  return (
    <div style={{
      width: canvasW,
      height: canvasH,
      fontFamily: '"Noto Sans TC","GenSenRounded2TW",sans-serif',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      background: '#fdf4ea',
    }}>
      {/* 底圖 */}
      {editor.bgImage && (
        <img src={editor.bgImage} alt="" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', opacity: editor.bgOpacity, pointerEvents: 'none', zIndex: 0,
        }} crossOrigin="anonymous" />
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* 品牌列 */}
        <div style={{
          background: editor.accentColor, height: BRAND_H,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 16, background: 'rgba(255,255,255,0.45)', borderRadius: 2 }} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '0.12em' }}>
              XINDIAN · YANGBEI SOCIAL HOUSING
            </span>
          </div>
          {totalPages > 1 && (
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, letterSpacing: '0.06em' }}>
              {pageIdx+1} / {totalPages}
            </span>
          )}
        </div>

        {/* 主體 */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* 左側（橫式） */}
          {isL && (
            <div style={{
              width: LEFT_W, flexShrink: 0,
              padding: '22px 20px',
              display: 'flex', flexDirection: 'column',
              background: leftBg,
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              borderRight: `1.5px solid ${editor.accentColor}28`,
            }}>
              {/* badge */}
              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: editor.accentColor, borderRadius: 4, padding: '3px 8px', marginBottom: 10 }}>
                <span style={{ color: 'white', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1 }}>
                  {year} 年活動
                </span>
              </div>

              <p style={{ fontSize: 22, fontWeight: 900, color: '#18120a', lineHeight: 1.25, margin: '0 0 3px' }}>
                {editor.titleLine1}
              </p>
              <p style={{ fontSize: 18, fontWeight: 900, color: editor.accentColor, lineHeight: 1.25, margin: '0 0 10px' }}>
                {editor.titleLine2}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: '#18120a', lineHeight: 1 }}>{rocMonth}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#78716c' }}>月份活動表</span>
              </div>

              <div style={{ height: 1, background: `${editor.accentColor}28`, marginBottom: 12 }} />

              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px', lineHeight: 1.5 }}>各項活動皆歡迎居民們踴躍報名！</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 16px' }}>（數量有限，額滿為止）</p>

              {/* QR 並排 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  { label: '活動報名', color: editor.accentColor, img: QR_API(SITE_URL, 200), sub: '↑ 線上報名' },
                  { label: '種子社區大學', color: '#06C755', img: editor.communityQr, sub: '加入社群' },
                ].map((qr, qi) => (
                  <div key={qi} style={{
                    flex: 1, borderRadius: 10,
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                    padding: '9px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
                  }}>
                    <div style={{
                      background: qr.color, borderRadius: 99,
                      padding: '4px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ color: 'white', fontSize: 10, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {qr.label}
                      </span>
                    </div>
                    {qr.img
                      ? <img src={qr.img} alt="" style={{ width: 80, height: 80, borderRadius: 6, objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
                      : <div style={{ width: 80, height: 80, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>未上傳</span>
                        </div>
                    }
                    <p style={{ fontSize: 10, color: '#6b7280', margin: 0, textAlign: 'center', lineHeight: 1 }}>{qr.sub}</p>
                  </div>
                ))}
              </div>

              {/* 聯繫 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                {contactItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06C755', flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 右側課表 */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: rightBg,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          }}>
            {/* 直式頂部標題 */}
            {!isL && (
              <div style={{
                background: hexToRgba(editor.leftBgColor, editor.leftBgOpacity),
                backdropFilter: 'blur(16px)',
                padding: '18px 24px', height: 100, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 16,
                borderBottom: `1.5px solid ${editor.accentColor}28`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#18120a', margin: 0, lineHeight: 1.2 }}>{editor.titleLine1}</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: editor.accentColor, margin: '3px 0', lineHeight: 1.2 }}>{editor.titleLine2}</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#18120a', margin: 0, lineHeight: 1.2 }}>
                    {year} 年 <span style={{ color: editor.accentColor }}>{rocMonth} 月</span>份活動表
                  </p>
                </div>
              </div>
            )}

            {/* 表頭 */}
            <div style={{
              display: 'grid', gridTemplateColumns: gridCols,
              background: editor.accentColor,
              flexShrink: 0, height: TABLE_HEADER_H,
            }}>
              {headers.map(h => (
                <div key={h} style={{
                  color: 'white', fontWeight: 700, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 6px', textAlign: 'center',
                }}>{h}</div>
              ))}
            </div>

            {/* 課程列 */}
            {pageCourses.map((course, i) => {
              const { month: cm, day, weekday } = toROC(course.date)
              return (
                <div key={course.id} style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  background: i % 2 === 0
                    ? hexToRgba(editor.rightBgColor, Math.min(editor.rightBgOpacity + 0.1, 1))
                    : hexToRgba('#fff7ed', editor.rightBgOpacity),
                  borderBottom: `1px solid ${editor.accentColor}18`,
                  height: rowH, flexShrink: 0,
                }}>
                  {/* 日期 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 4px' }}>
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#111827', lineHeight: 1, textAlign: 'center' }}>{cm}/{day}</span>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: editor.accentColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ color: 'white', fontWeight: 800, fontSize: 12, lineHeight: 1 }}>{weekday}</span>
                    </div>
                  </div>

                  {/* 時間 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '0 4px' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{course.time_start?.slice(0,5)}</span>
                    <span style={{ fontSize: 13, color: `${editor.accentColor}70`, lineHeight: 1 }}>｜</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{course.time_end?.slice(0,5)}</span>
                  </div>

                  {/* 活動名稱 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 14px' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.4 }}>{course.title}</span>
                  </div>

                  {/* 講師 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    {course.instructors?.name && (
                      <div style={{
                        background: `${editor.accentColor}1a`,
                        border: `1px solid ${editor.accentColor}40`,
                        borderRadius: 99, padding: '5px 12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        maxWidth: '100%',
                      }}>
                        <span style={{
                          color: editor.accentColor, fontWeight: 700, fontSize: 13,
                          lineHeight: 1, whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{course.instructors.name}</span>
                      </div>
                    )}
                  </div>

                  {/* 地點 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                    <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.4, textAlign: 'center' }}>{course.location}</span>
                  </div>

                  {/* 對象 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4, textAlign: 'center' }}>{course.suitable_age || '全年齡'}</span>
                  </div>

                  {/* 費用 */}
                  {isL && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: editor.accentColor }}>免費</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 空列補足（填滿高度） */}
            {Array.from({ length: Math.max(0, rowsPerPage - pageCourses.length) }).map((_, i) => (
              <div key={`e${i}`} style={{
                display: 'grid', gridTemplateColumns: gridCols,
                background: (pageCourses.length+i) % 2 === 0
                  ? hexToRgba(editor.rightBgColor, Math.min(editor.rightBgOpacity+0.1, 1))
                  : hexToRgba('#fff7ed', editor.rightBgOpacity),
                borderBottom: `1px solid ${editor.accentColor}18`,
                height: rowH, flexShrink: 0,
              }}>
                {headers.map((_h, ci) => <div key={ci} />)}
              </div>
            ))}
          </div>
        </div>

        {/* 底部夥伴列 */}
        <div style={{
          background: editor.footerBgColor,
          height: FOOTER_H, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '0 24px',
          borderTop: `1.5px solid ${editor.accentColor}50`,
        }}>
          {[
            { img: editor.logo1, name: editor.logo1Name },
            { img: editor.logo2, name: editor.logo2Name },
            { img: editor.logo3, name: editor.logo3Name },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flex: 1 }}>
              {p.img && <img src={p.img} alt="" style={{ height: 24, width: 'auto', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />}
              <span style={{ color: editor.footerTextColor, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── 主元件 ─────────────────────────────────────────────────────────
export default function CourseScheduleExporter({ courses, scheduleSettings: ss }: Props) {
  const [step, setStep] = useState<'idle'|'config'|'editor'>('idle')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(4)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [currentPage, setCurrentPage] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR)
  const previewRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const set = (key: keyof EditorState, val: any) =>
    setEditor(prev => ({ ...prev, [key]: val }))

  const availableMonths = Array.from(
    new Set(courses.map(c => c.date?.slice(0,7)).filter(Boolean))
  ).sort() as string[]

  const monthCourses = selectedMonth
    ? courses.filter(c => c.date?.startsWith(selectedMonth))
        .sort((a,b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start))
    : []

  const totalPages = Math.ceil(monthCourses.length / rowsPerPage) || 1

  const initEditor = () => {
    setEditor({
      ...DEFAULT_EDITOR,
      communityQr: ss.schedule_community_qr || '',
      logo1: ss.schedule_logo_1 || '', logo1Name: ss.schedule_logo_1_name || '新北市政府城鄉發展局',
      logo2: ss.schedule_logo_2 || '', logo2Name: ss.schedule_logo_2_name || '跨世代共居種子計畫',
      logo3: ss.schedule_logo_3 || '', logo3Name: ss.schedule_logo_3_name || '街道案子團隊',
      phone: ss.schedule_phone || '',
      contact: ss.schedule_contact || '',
      hours: ss.schedule_hours || '',
      // 從 site_settings 讀取上次儲存的編輯器設定
      bgImage: ss.editor_bg_image || '',
      bgOpacity: parseFloat(ss.editor_bg_opacity || '0.25'),
      accentColor: ss.editor_accent_color || '#f97316',
      leftBgColor: ss.editor_left_bg_color || '#fff7ed',
      leftBgOpacity: parseFloat(ss.editor_left_bg_opacity || '0.88'),
      rightBgColor: ss.editor_right_bg_color || '#ffffff',
      rightBgOpacity: parseFloat(ss.editor_right_bg_opacity || '0.75'),
      footerBgColor: ss.editor_footer_bg_color || '#18120a',
      footerTextColor: ss.editor_footer_text_color || '#ffffff',
      titleLine1: ss.editor_title_line1 || '新店央北社會住宅',
      titleLine2: ss.editor_title_line2 || '跨世代共居種子計畫',
    })
  }

  const handleImgUpload = (key: keyof EditorState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set(key, ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // 儲存到 site_settings
  const saveSettings = async () => {
    setSaving(true)
    const toSave: Record<string, string> = {
      editor_bg_image: editor.bgImage,
      editor_bg_opacity: String(editor.bgOpacity),
      editor_accent_color: editor.accentColor,
      editor_left_bg_color: editor.leftBgColor,
      editor_left_bg_opacity: String(editor.leftBgOpacity),
      editor_right_bg_color: editor.rightBgColor,
      editor_right_bg_opacity: String(editor.rightBgOpacity),
      editor_footer_bg_color: editor.footerBgColor,
      editor_footer_text_color: editor.footerTextColor,
      editor_title_line1: editor.titleLine1,
      editor_title_line2: editor.titleLine2,
    }
    for (const [key, value] of Object.entries(toSave)) {
      await supabase.from('site_settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
    }
    setSaving(false); setSavedMsg(true)
    setTimeout(() => setSavedMsg(false), 2500)
  }

  // 截圖下載
  const capturePages = async (orient: Orientation): Promise<string[]> => {
    const origOrient = orientation
    const origPage = currentPage
    setOrientation(orient)
    const pages: string[] = []
    const h2c = (await import('html2canvas')).default
    for (let p = 0; p < totalPages; p++) {
      setCurrentPage(p)
      await new Promise(r => setTimeout(r, 150))
      const el = previewRef.current; if (!el) continue
      const canvas = await h2c(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, logging: false })
      pages.push(canvas.toDataURL('image/png'))
    }
    setOrientation(origOrient)
    setCurrentPage(origPage)
    return pages
  }

  const triggerDownload = (url: string, filename: string) => {
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  }

  const doDownload = async (mode: 'landscape'|'portrait'|'both') => {
    setDownloading(true); setShowDownloadModal(false)
    const { year, month } = toROC(selectedMonth + '-01')
    const label = (o: Orientation) => o === 'landscape' ? '橫式' : '直式'
    const filename = (o: Orientation, p: number) =>
      totalPages > 1
        ? `央北社宅_${year}年${month}月活動表_${label(o)}_第${p+1}頁.png`
        : `央北社宅_${year}年${month}月活動表_${label(o)}.png`

    if (mode === 'both') {
      for (const o of ['landscape','portrait'] as Orientation[]) {
        const pages = await capturePages(o)
        pages.forEach((url, i) => triggerDownload(url, filename(o, i)))
        await new Promise(r => setTimeout(r, 400))
      }
    } else {
      const pages = await capturePages(mode)
      pages.forEach((url, i) => triggerDownload(url, filename(mode, i)))
    }
    setDownloading(false)
  }

  const reset = () => { setStep('idle'); setCurrentPage(0) }

  // ── 控制面板 section ──
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">{title}</p>
      {children}
    </section>
  )

  const UploadBtn = ({ label, uploaded, onChange, onRemove }: { label: string; uploaded: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onRemove?: () => void }) => (
    <div>
      <label className="flex items-center gap-2 w-full border border-dashed border-stone-300 hover:border-orange-400 rounded-lg py-2 px-3 cursor-pointer transition-colors">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span className="text-stone-500 text-xs">{uploaded ? '已上傳，點擊替換' : label}</span>
        <input type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
      {uploaded && onRemove && (
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600 mt-1">移除</button>
      )}
    </div>
  )

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
          <h3 className="font-bold text-white text-xl">匯出課表</h3>
          <p className="text-orange-100 text-sm mt-0.5">選擇月份與版面設定</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2.5">月份</label>
            {availableMonths.length === 0
              ? <p className="text-stone-400 text-sm">目前無課程月份</p>
              : <div className="grid grid-cols-3 gap-2">
                  {availableMonths.map(m => {
                    const [y, mo] = m.split('-')
                    return (
                      <button key={m} onClick={() => setSelectedMonth(m)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${selectedMonth === m ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-100' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                        {parseInt(y)-1911}/{parseInt(mo)}月
                      </button>
                    )
                  })}
                </div>
            }
          </div>
          <div>
            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2.5">每頁列數</label>
            <div className="flex gap-2">
              {[2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setRowsPerPage(n)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${rowsPerPage === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {selectedMonth && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <p className="text-sm text-stone-700 font-medium">
                {(() => { const [y,mo] = selectedMonth.split('-'); return `${parseInt(y)-1911} 年 ${parseInt(mo)} 月 · 共 ${monthCourses.length} 堂 · 分 ${totalPages} 頁` })()}
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
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
      <div className="bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-2.5 flex-shrink-0 flex-wrap">
        <button onClick={() => setStep('config')} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回
        </button>
        <div className="w-px h-4 bg-stone-200" />
        <span className="font-bold text-stone-800 text-sm">課表編輯器</span>

        {/* 頁碼 */}
        {totalPages > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${currentPage === i ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-500 border-stone-200 hover:border-orange-300'}`}>
                {i+1}
              </button>
            ))}
          </div>
        )}

        {/* 方向切換 */}
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1 border border-stone-200">
          {([['landscape','橫式'], ['portrait','直式（A4）']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setOrientation(v)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${orientation === v ? 'bg-white text-orange-600 shadow-sm border border-stone-200' : 'text-stone-500 hover:text-stone-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* 儲存 */}
          <button onClick={saveSettings} disabled={saving}
            className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 px-3 py-2 rounded-xl text-xs font-medium transition-colors">
            {saving
              ? <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            }
            {savedMsg ? '已儲存！' : '儲存設定'}
          </button>

          {/* 下載 */}
          <button onClick={() => setShowDownloadModal(true)} disabled={downloading}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            {downloading
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />處理中...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下載</>
            }
          </button>

          <button onClick={reset} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 下載選擇彈窗 */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDownloadModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800">選擇下載格式</h3>
              <button onClick={() => setShowDownloadModal(false)} className="p-1.5 hover:bg-stone-100 rounded-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="space-y-2">
              {[
                { mode: 'landscape' as const, label: '橫式', desc: '1200px 寬，適合電子分享', icon: '⬛' },
                { mode: 'portrait' as const, label: '直式（A4）', desc: '794×1123px，適合列印', icon: '📄' },
                { mode: 'both' as const, label: '橫式＋直式都要', desc: '同時下載兩種版本', icon: '✦' },
              ].map(opt => (
                <button key={opt.mode} onClick={() => doDownload(opt.mode)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-stone-100 hover:border-orange-300 hover:bg-orange-50 transition-all text-left">
                  <span className="text-2xl">{opt.icon}</span>
                  <div>
                    <p className="font-semibold text-stone-800 text-sm">{opt.label}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{opt.desc}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" className="ml-auto flex-shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 編輯器主體 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左側控制面板（白底） */}
        <div className="w-64 bg-white border-r border-stone-200 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-6">

            <Section title="標題文字">
              <div className="space-y-2">
                {(['titleLine1','titleLine2'] as const).map((key, i) => (
                  <div key={key}>
                    <label className="block text-xs text-stone-400 mb-1">第 {i+1} 行</label>
                    <input value={editor[key]} onChange={e => set(key, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-800" />
                  </div>
                ))}
              </div>
            </Section>

            <Section title="顏色">
              <div className="space-y-2.5">
                {[
                  { key: 'accentColor', label: '主題色（橘色）' },
                  { key: 'footerBgColor', label: '底部背景' },
                  { key: 'footerTextColor', label: '底部文字' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between">
                    <span className="text-sm text-stone-600">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={(editor as any)[f.key]}
                        onChange={e => set(f.key as keyof EditorState, e.target.value)}
                        className="w-7 h-7 rounded-md border border-stone-200 cursor-pointer p-0" />
                      <span className="text-xs text-stone-400 font-mono">{(editor as any)[f.key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="底圖">
              <UploadBtn label="上傳底圖" uploaded={!!editor.bgImage}
                onChange={handleImgUpload('bgImage')} onRemove={() => set('bgImage', '')} />
              {editor.bgImage && (
                <div className="mt-2">
                  <img src={editor.bgImage} alt="" className="w-full h-20 object-cover rounded-lg border border-stone-200 mb-2" />
                </div>
              )}
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-stone-500">底圖透明度</label>
                  <span className="text-xs text-stone-400">{Math.round(editor.bgOpacity*100)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.05" value={editor.bgOpacity}
                  onChange={e => set('bgOpacity', parseFloat(e.target.value))} className="w-full" />
              </div>
            </Section>

            <Section title="左側欄透明度">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs text-stone-500">底色</label>
                    <input type="color" value={editor.leftBgColor}
                      onChange={e => set('leftBgColor', e.target.value)}
                      className="w-6 h-6 rounded border border-stone-200 cursor-pointer p-0" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-500">透明度</label>
                    <span className="text-xs text-stone-400">{Math.round(editor.leftBgOpacity*100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={editor.leftBgOpacity}
                    onChange={e => set('leftBgOpacity', parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </Section>

            <Section title="右側欄透明度">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="text-xs text-stone-500">底色</label>
                    <input type="color" value={editor.rightBgColor}
                      onChange={e => set('rightBgColor', e.target.value)}
                      className="w-6 h-6 rounded border border-stone-200 cursor-pointer p-0" />
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-stone-500">透明度</label>
                    <span className="text-xs text-stone-400">{Math.round(editor.rightBgOpacity*100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={editor.rightBgOpacity}
                    onChange={e => set('rightBgOpacity', parseFloat(e.target.value))} className="w-full" />
                </div>
              </div>
            </Section>

            <Section title="QR Code">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-stone-400 mb-1.5">報名 QR（自動生成）</p>
                  <img src={QR_API(SITE_URL, 80)} alt="" className="w-14 h-14 rounded-lg border border-stone-200" />
                </div>
                <div>
                  <p className="text-xs text-stone-400 mb-1.5">社群 QR Code</p>
                  <UploadBtn label="上傳社群QR" uploaded={!!editor.communityQr}
                    onChange={handleImgUpload('communityQr')} onRemove={() => set('communityQr', '')} />
                  {editor.communityQr && <img src={editor.communityQr} alt="" className="mt-1.5 w-14 h-14 object-contain rounded-lg border border-stone-200" />}
                </div>
              </div>
            </Section>

            <Section title="合作夥伴">
              <div className="space-y-4">
                {([
                  { logoKey: 'logo1', nameKey: 'logo1Name', label: '1' },
                  { logoKey: 'logo2', nameKey: 'logo2Name', label: '2' },
                  { logoKey: 'logo3', nameKey: 'logo3Name', label: '3' },
                ] as const).map(f => (
                  <div key={f.logoKey}>
                    <label className="block text-xs text-stone-400 mb-1">夥伴 {f.label} 名稱</label>
                    <input value={editor[f.nameKey]} onChange={e => set(f.nameKey, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 mb-1.5" />
                    <UploadBtn label="上傳 Logo" uploaded={!!editor[f.logoKey]}
                      onChange={handleImgUpload(f.logoKey)} onRemove={() => set(f.logoKey, '')} />
                    {editor[f.logoKey] && <img src={editor[f.logoKey]} alt="" className="mt-1 h-7 w-auto object-contain rounded border border-stone-200" />}
                  </div>
                ))}
              </div>
            </Section>

            <Section title="聯繫資訊">
              <div className="space-y-2">
                {[
                  { key: 'phone', label: '電話' },
                  { key: 'contact', label: '聯絡窗口' },
                  { key: 'hours', label: '服務時間' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-stone-400 mb-1">{f.label}</label>
                    <input value={(editor as any)[f.key]} onChange={e => set(f.key as keyof EditorState, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                ))}
              </div>
            </Section>

          </div>
        </div>

        {/* 預覽區 */}
        <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-stone-100">
          <div className="flex flex-col items-center gap-3">
            <div ref={previewRef} style={{ display: 'inline-block' }}>
              <ScheduleCanvas
                monthCourses={monthCourses}
                selectedMonth={selectedMonth}
                rowsPerPage={rowsPerPage}
                orientation={orientation}
                editor={editor}
                pageIdx={currentPage}
              />
            </div>
            <p className="text-xs text-stone-400">
              {orientation === 'landscape' ? '橫式 1200px' : '直式 794×1123px（A4）'} · 下載 @2x 高解析
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
