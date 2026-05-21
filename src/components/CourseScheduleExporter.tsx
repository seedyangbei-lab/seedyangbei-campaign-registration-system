'use client'

import { useState, useRef } from 'react'

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
  accentColor: string; headerColor: string; tableHeaderColor: string
  leftBgColor: string; footerBgColor: string; footerTextColor: string
  communityQr: string
  logo1: string; logo1Name: string
  logo2: string; logo2Name: string
  logo3: string; logo3Name: string
  phone: string; contact: string; hours: string
  titleLine1: string; titleLine2: string
}

const DEFAULT_EDITOR: EditorState = {
  bgImage: '', bgOpacity: 0.18,
  accentColor: '#f97316', headerColor: '#f97316', tableHeaderColor: '#f97316',
  leftBgColor: 'rgba(255,247,237,0.82)', footerBgColor: '#18120a', footerTextColor: '#ffffff',
  communityQr: '',
  logo1: '', logo1Name: '新北市政府城鄉發展局',
  logo2: '', logo2Name: '跨世代共居種子計畫',
  logo3: '', logo3Name: '街道案子團隊',
  phone: '', contact: '', hours: '',
  titleLine1: '新店央北社會住宅',
  titleLine2: '跨世代共居種子計畫',
}

// ─── 課表渲染（HTML/CSS，所見即所得）─────────────────────────────────
function ScheduleCanvas({
  courses, monthCourses, selectedMonth, rowsPerPage, orientation, editor, pageIdx,
}: {
  courses: Course[]; monthCourses: Course[]; selectedMonth: string
  rowsPerPage: number; orientation: Orientation; editor: EditorState; pageIdx: number
}) {
  const totalPages = Math.ceil(monthCourses.length / rowsPerPage) || 1
  const pageCourses = monthCourses.slice(pageIdx * rowsPerPage, (pageIdx+1) * rowsPerPage)
  const isL = orientation === 'landscape'
  const { year, month: rocMonth } = toROC(selectedMonth + '-01')

  const contactItems = [
    editor.phone ? `洽詢：${editor.phone}` : '',
    editor.contact || '',
    editor.hours ? `服務時間：${editor.hours}` : '',
  ].filter(Boolean)

  const gridCols = isL
    ? '88px 108px 1fr 148px 128px 108px 72px'
    : '84px 104px 1fr 140px 116px 96px'
  const headers = isL
    ? ['日期','時間','活動名稱','授課講師','地點','對象','費用']
    : ['日期','時間','活動名稱','授課講師','地點','對象']

  return (
    <div style={{
      width: isL ? 1200 : 794,
      fontFamily: '"Noto Sans TC","GenSenRounded2TW",sans-serif',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
      borderRadius: 0,
      boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
    }}>
      {/* 底圖 */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{ position: 'absolute', inset: 0, background: '#fdf4ea' }} />
        {editor.bgImage && (
          <img src={editor.bgImage} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: editor.bgOpacity,
          }} crossOrigin="anonymous" />
        )}
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* 頂部品牌列 */}
        <div style={{
          background: editor.headerColor,
          padding: '13px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 3, height: 18, background: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
            <span style={{ color: 'white', fontWeight: 800, fontSize: 15, letterSpacing: '0.12em' }}>
              XINDIAN · YANGBEI SOCIAL HOUSING
            </span>
          </div>
          {totalPages > 1 && (
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, letterSpacing: '0.08em' }}>
              {pageIdx+1} / {totalPages}
            </span>
          )}
        </div>

        {/* 主體 */}
        <div style={{ display: 'flex', flex: 1 }}>

          {/* ── 左側 ── */}
          {isL && (
            <div style={{
              width: 292, flexShrink: 0, padding: '26px 22px',
              display: 'flex', flexDirection: 'column',
              background: editor.leftBgColor,
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              borderRight: `2px solid ${editor.accentColor}30`,
            }}>
              {/* 主標題 */}
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  display: 'inline-block', background: editor.accentColor,
                  borderRadius: 4, padding: '2px 8px', marginBottom: 8,
                }}>
                  <span style={{ color: 'white', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>
                    115 年活動
                  </span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 900, color: '#18120a', lineHeight: 1.25, margin: '0 0 3px' }}>
                  {editor.titleLine1}
                </p>
                <p style={{ fontSize: 20, fontWeight: 900, color: editor.accentColor, lineHeight: 1.25, margin: '0 0 8px' }}>
                  {editor.titleLine2}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#18120a', lineHeight: 1 }}>{rocMonth}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#78716c' }}>月份活動表</span>
                </div>
              </div>

              {/* 細線 */}
              <div style={{ height: 1, background: `${editor.accentColor}30`, margin: '0 0 14px' }} />

              <p style={{ fontSize: 12, color: '#78716c', margin: '0 0 2px', lineHeight: 1.5 }}>
                各項活動皆歡迎居民們踴躍報名！
              </p>
              <p style={{ fontSize: 11, color: '#a8a29e', margin: '0 0 16px' }}>（數量有限，額滿為止）</p>

              {/* QR 卡片 */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                  {
                    label: '活動報名', color: editor.accentColor,
                    img: QR_API(SITE_URL, 200), sub: '↑ 線上報名', isUrl: true,
                  },
                  {
                    label: '種子社區大學', color: '#06C755',
                    img: editor.communityQr, sub: '加入社群', isUrl: false,
                  },
                ].map((qr, qi) => (
                  <div key={qi} style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    borderRadius: 12, border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    padding: '10px 8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}>
                    <div style={{ background: qr.color, borderRadius: 20, padding: '3px 10px' }}>
                      <span style={{ color: 'white', fontSize: 10, fontWeight: 700 }}>{qr.label}</span>
                    </div>
                    {qr.img
                      ? <img src={qr.img} alt="" style={{ width: 84, height: 84, borderRadius: 6, objectFit: 'contain' }} crossOrigin="anonymous" />
                      : <div style={{ width: 84, height: 84, background: '#f5f5f4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: '#a8a29e' }}>未上傳</span>
                        </div>
                    }
                    <p style={{ fontSize: 10, color: '#78716c', margin: 0, textAlign: 'center' }}>{qr.sub}</p>
                  </div>
                ))}
              </div>

              {/* 聯繫資訊 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto' }}>
                {contactItems.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#06C755', flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 右側課表 ── */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          }}>
            {/* 直式標題 */}
            {!isL && (
              <div style={{
                background: editor.leftBgColor, backdropFilter: 'blur(16px)',
                padding: '22px 32px', display: 'flex', alignItems: 'center',
                borderBottom: `2px solid ${editor.accentColor}30`,
                gap: 20,
              }}>
                <div>
                  <p style={{ fontSize: 26, fontWeight: 900, color: '#18120a', margin: 0 }}>{editor.titleLine1}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: editor.accentColor, margin: '3px 0' }}>{editor.titleLine2}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#18120a', margin: 0 }}>
                    {year} 年 <span style={{ color: editor.accentColor }}>{rocMonth} 月</span>份活動表
                  </p>
                </div>
              </div>
            )}

            {/* 表頭 */}
            <div style={{
              display: 'grid', gridTemplateColumns: gridCols,
              background: editor.tableHeaderColor,
              padding: '0 6px',
            }}>
              {headers.map(h => (
                <div key={h} style={{ color: 'white', fontWeight: 700, fontSize: 15, padding: '14px 6px', textAlign: 'center' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* 課程列 */}
            {pageCourses.map((course, i) => {
              const { month: cm, day, weekday } = toROC(course.date)
              const isEven = i % 2 === 0
              return (
                <div key={course.id} style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  background: isEven ? 'rgba(255,255,255,0.78)' : 'rgba(255,247,237,0.82)',
                  borderBottom: `1px solid rgba(249,115,22,0.12)`,
                  padding: '0 6px', minHeight: 86, alignItems: 'center',
                }}>
                  {/* 日期 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '10px 2px' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#18120a', lineHeight: 1 }}>{cm}/{day}</span>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: editor.accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>{weekday}</span>
                    </div>
                  </div>
                  {/* 時間 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#18120a' }}>{course.time_start?.slice(0,5)}</span>
                    <span style={{ fontSize: 12, color: `${editor.accentColor}80`, lineHeight: 1.2, margin: '1px 0' }}>｜</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#18120a' }}>{course.time_end?.slice(0,5)}</span>
                  </div>
                  {/* 活動名稱 */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: '#18120a', lineHeight: 1.45 }}>{course.title}</span>
                  </div>
                  {/* 講師 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 6px' }}>
                    {course.instructors?.name && (
                      <span style={{
                        background: `${editor.accentColor}22`, color: editor.accentColor,
                        fontWeight: 700, fontSize: 14, borderRadius: 20,
                        padding: '5px 12px', border: `1px solid ${editor.accentColor}40`,
                        whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{course.instructors.name}</span>
                    )}
                  </div>
                  {/* 地點 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 6px', textAlign: 'center' }}>
                    <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.45 }}>{course.location}</span>
                  </div>
                  {/* 對象 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.45 }}>{course.suitable_age || '全年齡'}</span>
                  </div>
                  {/* 費用（橫式） */}
                  {isL && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 4px' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: editor.accentColor }}>免費</span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 空列補足 */}
            {Array.from({ length: Math.max(0, rowsPerPage - pageCourses.length) }).map((_, i) => (
              <div key={`e${i}`} style={{
                display: 'grid', gridTemplateColumns: gridCols,
                background: (pageCourses.length+i) % 2 === 0 ? 'rgba(255,255,255,0.78)' : 'rgba(255,247,237,0.82)',
                borderBottom: `1px solid rgba(249,115,22,0.12)`,
                minHeight: 86,
              }}>
                {headers.map((_h, ci) => <div key={ci} />)}
              </div>
            ))}
          </div>
        </div>

        {/* 底部夥伴列 */}
        <div style={{
          background: editor.footerBgColor,
          padding: '11px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          borderTop: `2px solid ${editor.accentColor}60`,
        }}>
          {[
            { img: editor.logo1, name: editor.logo1Name },
            { img: editor.logo2, name: editor.logo2Name },
            { img: editor.logo3, name: editor.logo3Name },
          ].map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {p.img && <img src={p.img} alt="" style={{ height: 26, width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />}
              <span style={{ color: editor.footerTextColor, fontSize: 13, fontWeight: 500, letterSpacing: '0.02em' }}>{p.name}</span>
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
  const [editor, setEditor] = useState<EditorState>(DEFAULT_EDITOR)
  const previewRef = useRef<HTMLDivElement>(null)

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
    setEditor(prev => ({
      ...prev,
      communityQr: ss.schedule_community_qr || '',
      logo1: ss.schedule_logo_1 || '', logo1Name: ss.schedule_logo_1_name || '新北市政府城鄉發展局',
      logo2: ss.schedule_logo_2 || '', logo2Name: ss.schedule_logo_2_name || '跨世代共居種子計畫',
      logo3: ss.schedule_logo_3 || '', logo3Name: ss.schedule_logo_3_name || '街道案子團隊',
      phone: ss.schedule_phone || '',
      contact: ss.schedule_contact || '',
      hours: ss.schedule_hours || '',
    }))
  }

  const handleImgUpload = (key: keyof EditorState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set(key, ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const captureOrientation = async (orient: Orientation) => {
    const orig = orientation
    setOrientation(orient)
    await new Promise(r => setTimeout(r, 160))
    const pages: string[] = []
    const h2c = (await import('html2canvas')).default
    for (let p = 0; p < totalPages; p++) {
      setCurrentPage(p)
      await new Promise(r => setTimeout(r, 100))
      const el = previewRef.current
      if (!el) continue
      const canvas = await h2c(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, logging: false })
      pages.push(canvas.toDataURL('image/png'))
    }
    setOrientation(orig)
    return pages
  }

  const downloadVariant = async (orient: Orientation, label: string) => {
    const { year, month } = toROC(selectedMonth + '-01')
    const pages = await captureOrientation(orient)
    pages.forEach((url, i) => {
      const link = document.createElement('a')
      link.download = totalPages > 1
        ? `央北社宅_${year}年${month}月活動表_${label}_第${i+1}頁.png`
        : `央北社宅_${year}年${month}月活動表_${label}.png`
      link.href = url; link.click()
      setTimeout(() => {}, 200)
    })
  }

  const downloadAll = async () => {
    setDownloading(true)
    await downloadVariant('landscape', '橫式')
    await new Promise(r => setTimeout(r, 400))
    await downloadVariant('portrait', '直式')
    setCurrentPage(0)
    setDownloading(false)
  }

  const downloadCurrent = async () => {
    setDownloading(true)
    await downloadVariant(orientation, orientation === 'landscape' ? '橫式' : '直式')
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) reset() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-6 py-5">
          <h3 className="font-bold text-white text-xl">匯出課表</h3>
          <p className="text-orange-100 text-sm mt-1">選擇月份與版面設定</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-stone-500 text-xs font-bold uppercase tracking-wider mb-2.5">月份</label>
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
            <label className="block text-stone-500 text-xs font-bold uppercase tracking-wider mb-2.5">每頁列數</label>
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
              <div>
                {(() => {
                  const [y, mo] = selectedMonth.split('-')
                  const pages = Math.ceil(monthCourses.length / rowsPerPage)
                  return <p className="text-sm text-stone-700 font-medium">{parseInt(y)-1911} 年 {parseInt(mo)} 月 · 共 {monthCourses.length} 堂課 · 分 {pages} 頁</p>
                })()}
              </div>
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0f0a06' }}>
      {/* 頂部工具列 */}
      <div style={{ background: '#1a1008', borderBottom: '1px solid rgba(249,115,22,0.2)' }}
        className="flex items-center gap-4 px-5 py-3 flex-shrink-0">

        <button onClick={() => setStep('config')}
          className="flex items-center gap-1.5 text-orange-300 hover:text-orange-100 text-sm transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回
        </button>

        <div className="w-px h-4 bg-orange-900" />

        <span className="text-orange-100 font-bold text-sm tracking-wide">課表編輯器</span>

        {/* 頁面切換 */}
        {totalPages > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                style={{
                  background: currentPage === i ? '#f97316' : 'rgba(249,115,22,0.12)',
                  color: currentPage === i ? 'white' : '#fb923c',
                  border: `1px solid ${currentPage === i ? '#f97316' : 'rgba(249,115,22,0.25)'}`,
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-all">
                {i+1}
              </button>
            ))}
          </div>
        )}

        {/* 方向切換 */}
        <div className="flex gap-1 ml-2" style={{ background: 'rgba(249,115,22,0.1)', borderRadius: 10, padding: 3, border: '1px solid rgba(249,115,22,0.2)' }}>
          {([['landscape','橫式'], ['portrait','直式']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setOrientation(v)}
              style={{
                background: orientation === v ? '#f97316' : 'transparent',
                color: orientation === v ? 'white' : '#fb923c',
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={downloadCurrent} disabled={downloading}
            style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
            className="flex items-center gap-1.5 text-orange-300 hover:text-orange-100 px-3 py-2 rounded-xl text-xs font-medium transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            下載目前版式
          </button>
          <button onClick={downloadAll} disabled={downloading}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 disabled:bg-stone-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            {downloading
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />處理中...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下載橫式＋直式</>
            }
          </button>
          <button onClick={reset} className="p-2 text-stone-500 hover:text-stone-300 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 編輯器主體 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左側控制面板 */}
        <div style={{ width: 260, background: '#140d05', borderRight: '1px solid rgba(249,115,22,0.15)', overflowY: 'auto' }}
          className="flex-shrink-0">
          <div className="p-4 space-y-6">

            {/* Section helper */}
            {(([title, children]: [string, React.ReactNode]) => (
              <section key={title}>
                <p style={{ color: '#fb923c', fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>{title}</p>
                {children}
              </section>
            )) as any}

            {/* 標題 */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>標題文字</p>
              <div className="space-y-2">
                {(['titleLine1','titleLine2'] as const).map((key, i) => (
                  <div key={key}>
                    <label style={{ color: '#78716c', fontSize: 10, marginBottom: 4, display: 'block' }}>第 {i+1} 行</label>
                    <input value={editor[key]} onChange={e => set(key, e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#fde8d0', borderRadius: 8, padding: '7px 10px', fontSize: 12, width: '100%', outline: 'none' }} />
                  </div>
                ))}
              </div>
            </section>

            {/* 顏色 */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>顏色</p>
              <div className="space-y-2.5">
                {[
                  { key: 'accentColor', label: '主題色' },
                  { key: 'headerColor', label: '頂部品牌列' },
                  { key: 'tableHeaderColor', label: '表頭' },
                  { key: 'footerBgColor', label: '底部背景' },
                  { key: 'footerTextColor', label: '底部文字' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between">
                    <span style={{ color: '#a8a29e', fontSize: 12 }}>{f.label}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={(editor as any)[f.key]}
                        onChange={e => set(f.key as keyof EditorState, e.target.value)}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', padding: 0 }} />
                      <span style={{ color: '#57534e', fontSize: 10, fontFamily: 'monospace' }}>{(editor as any)[f.key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 底圖 */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>底圖</p>
              <label style={{ border: '1px dashed rgba(249,115,22,0.35)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'border-color 0.2s' }}
                className="hover:border-orange-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style={{ color: '#a8a29e', fontSize: 12 }}>{editor.bgImage ? '已上傳，點擊替換' : '上傳底圖'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('bgImage')} />
              </label>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ color: '#78716c', fontSize: 11 }}>透明度 {Math.round(editor.bgOpacity*100)}%</span>
                  {editor.bgImage && <button onClick={() => set('bgImage', '')} style={{ color: '#ef4444', fontSize: 11 }}>移除</button>}
                </div>
                <input type="range" min="0" max="1" step="0.05" value={editor.bgOpacity}
                  onChange={e => set('bgOpacity', parseFloat(e.target.value))} className="w-full" />
                <p style={{ color: '#57534e', fontSize: 10, marginTop: 4 }}>左右欄毛玻璃效果會讓底圖自然透出</p>
              </div>
            </section>

            {/* QR */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>QR Code</p>
              <div className="space-y-3">
                <div>
                  <p style={{ color: '#78716c', fontSize: 10, marginBottom: 6 }}>報名 QR（自動生成）</p>
                  <img src={QR_API(SITE_URL, 80)} alt="" style={{ width: 56, height: 56, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <p style={{ color: '#78716c', fontSize: 10, marginBottom: 6 }}>社群 QR Code</p>
                  <label style={{ border: '1px dashed rgba(249,115,22,0.35)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span style={{ color: '#a8a29e', fontSize: 11 }}>{editor.communityQr ? '已上傳' : '上傳社群QR'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('communityQr')} />
                  </label>
                  {editor.communityQr && <img src={editor.communityQr} alt="" style={{ marginTop: 6, width: 56, height: 56, objectFit: 'contain', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} />}
                </div>
              </div>
            </section>

            {/* 合作夥伴 */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>合作夥伴</p>
              <div className="space-y-4">
                {([
                  { logoKey: 'logo1', nameKey: 'logo1Name', label: '1' },
                  { logoKey: 'logo2', nameKey: 'logo2Name', label: '2' },
                  { logoKey: 'logo3', nameKey: 'logo3Name', label: '3' },
                ] as const).map(f => (
                  <div key={f.logoKey}>
                    <p style={{ color: '#78716c', fontSize: 10, marginBottom: 4 }}>夥伴 {f.label}</p>
                    <input value={editor[f.nameKey]} onChange={e => set(f.nameKey, e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#fde8d0', borderRadius: 6, padding: '5px 8px', fontSize: 11, width: '100%', outline: 'none', marginBottom: 5 }} />
                    <label style={{ border: '1px dashed rgba(249,115,22,0.25)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span style={{ color: '#78716c', fontSize: 11 }}>{editor[f.logoKey] ? '已上傳' : '上傳 Logo'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload(f.logoKey)} />
                    </label>
                    {editor[f.logoKey] && (
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={editor[f.logoKey]} alt="" style={{ height: 24, width: 'auto', objectFit: 'contain', borderRadius: 4 }} />
                        <button onClick={() => set(f.logoKey, '')} style={{ color: '#ef4444', fontSize: 11 }}>移除</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 聯繫資訊 */}
            <section>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#fb923c' }}>聯繫資訊</p>
              <div className="space-y-2">
                {[
                  { key: 'phone', label: '電話' },
                  { key: 'contact', label: '聯絡窗口' },
                  { key: 'hours', label: '服務時間' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ color: '#78716c', fontSize: 10, marginBottom: 3, display: 'block' }}>{f.label}</label>
                    <input value={(editor as any)[f.key]} onChange={e => set(f.key as keyof EditorState, e.target.value)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#fde8d0', borderRadius: 6, padding: '5px 8px', fontSize: 11, width: '100%', outline: 'none' }} />
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* 右側預覽區 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: '#0f0a06' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div ref={previewRef}>
              <ScheduleCanvas
                courses={courses}
                monthCourses={monthCourses}
                selectedMonth={selectedMonth}
                rowsPerPage={rowsPerPage}
                orientation={orientation}
                editor={editor}
                pageIdx={currentPage}
              />
            </div>
            <p style={{ color: '#57534e', fontSize: 11, marginTop: 4 }}>
              {orientation === 'landscape' ? '橫式 1200×auto' : '直式 794×auto'} · 下載時 @2x 解析度
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
