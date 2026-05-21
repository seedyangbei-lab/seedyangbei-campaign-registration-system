'use client'

import { useState, useRef, useCallback } from 'react'

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
  bgImage: string
  bgOpacity: number
  headerColor: string
  tableHeaderColor: string
  leftBgColor: string
  footerBgColor: string
  footerTextColor: string
  communityQr: string
  logo1: string; logo1Name: string
  logo2: string; logo2Name: string
  logo3: string; logo3Name: string
  phone: string; contact: string; hours: string
  titleLine1: string; titleLine2: string; titleLine3: string
}

export default function CourseScheduleExporter({ courses, scheduleSettings: ss }: Props) {
  const [step, setStep] = useState<'idle' | 'config' | 'editor'>('idle')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(4)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [currentPage, setCurrentPage] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const [editor, setEditor] = useState<EditorState>({
    bgImage: '',
    bgOpacity: 0.15,
    headerColor: '#f97316',
    tableHeaderColor: '#f97316',
    leftBgColor: '#fff7ed',
    footerBgColor: '#1c1917',
    footerTextColor: '#ffffff',
    communityQr: '',
    logo1: '', logo1Name: '',
    logo2: '', logo2Name: '',
    logo3: '', logo3Name: '',
    phone: '', contact: '', hours: '',
    titleLine1: '新店央北社會住宅',
    titleLine2: '跨世代共居種子計畫',
    titleLine3: '',
  })

  const set = (key: keyof EditorState, val: any) =>
    setEditor(prev => ({ ...prev, [key]: val }))

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
    const { year, month } = toROC(selectedMonth + '-01')
    setEditor(prev => ({
      ...prev,
      communityQr: ss.schedule_community_qr || '',
      logo1: ss.schedule_logo_1 || '', logo1Name: ss.schedule_logo_1_name || '新北市政府城鄉發展局',
      logo2: ss.schedule_logo_2 || '', logo2Name: ss.schedule_logo_2_name || '跨世代共居種子計畫',
      logo3: ss.schedule_logo_3 || '', logo3Name: ss.schedule_logo_3_name || '街道案子團隊',
      phone: ss.schedule_phone || '',
      contact: ss.schedule_contact || '',
      hours: ss.schedule_hours || '',
      titleLine3: `${year} 年 ${month} 月份活動表`,
    }))
  }

  const handleImgUpload = (key: keyof EditorState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set(key, ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const downloadPage = async (pageIdx: number) => {
    setCurrentPage(pageIdx)
    await new Promise(r => setTimeout(r, 120))
    const el = previewRef.current
    if (!el) return
    const h2c = (await import('html2canvas')).default
    const canvas = await h2c(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    })
    const { year, month } = toROC(selectedMonth + '-01')
    const filename = totalPages > 1
      ? `央北社宅_${year}年${month}月活動表_第${pageIdx + 1}頁.png`
      : `央北社宅_${year}年${month}月活動表.png`
    const link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const downloadAll = async () => {
    setDownloading(true)
    for (let i = 0; i < totalPages; i++) {
      await downloadPage(i)
      await new Promise(r => setTimeout(r, 300))
    }
    setDownloading(false)
  }

  const reset = () => { setStep('idle'); setCurrentPage(0) }

  // ── 渲染單頁課表 ──
  const renderPage = (pageIdx: number) => {
    const pageCourses = monthCourses.slice(pageIdx * rowsPerPage, (pageIdx + 1) * rowsPerPage)
    const isLandscape = orientation === 'landscape'
    const { year, month: rocMonth } = toROC(selectedMonth + '-01')

    const contactItems = [
      editor.phone ? `洽詢專線：${editor.phone}` : '',
      editor.contact || '',
      editor.hours ? `服務時間：${editor.hours}` : '',
    ].filter(Boolean)

    return (
      <div
        style={{
          width: isLandscape ? 1200 : 794,
          fontFamily: '"Noto Sans TC", "GenSenRounded2TW", sans-serif',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: '#fdf8f2',
        }}
      >
        {/* 底圖 */}
        {editor.bgImage && (
          <img src={editor.bgImage} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: editor.bgOpacity, pointerEvents: 'none', zIndex: 0 }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* 頂部品牌列 */}
          <div style={{ background: editor.headerColor, padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: '0.08em' }}>
              XINDIAN · YANGBEI SOCIAL HOUSING
            </span>
            {totalPages > 1 && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{pageIdx + 1} / {totalPages}</span>
            )}
          </div>

          {/* 主體 */}
          <div style={{ display: 'flex', flex: 1 }}>
            {/* 左側（橫式才有） */}
            {isLandscape && (
              <div style={{ width: 300, background: editor.leftBgColor, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
                {/* 主標題 */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 26, fontWeight: 900, color: '#1c1917', lineHeight: 1.3, margin: 0 }}>{editor.titleLine1}</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: editor.headerColor, lineHeight: 1.3, margin: '4px 0 0' }}>{editor.titleLine2}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#1c1917', lineHeight: 1.4, margin: '4px 0 0' }}>
                    {year} 年<span style={{ color: editor.headerColor }}> {rocMonth} 月</span>份活動表
                  </p>
                </div>

                <div style={{ height: 1, background: '#fed7aa', margin: '0 0 14px' }} />

                <p style={{ fontSize: 14, color: '#78716c', margin: '0 0 2px' }}>各項活動皆歡迎居民們踴躍報名！</p>
                <p style={{ fontSize: 12, color: '#a8a29e', margin: '0 0 18px' }}>（數量有限，額滿為止）</p>

                {/* QR Code 並排 */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                  {/* 報名 QR */}
                  <div style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid #fed7aa', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ background: editor.headerColor, borderRadius: 12, padding: '4px 10px' }}>
                      <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>活動報名</span>
                    </div>
                    <img src={QR_API(SITE_URL, 200)} alt="報名QR" style={{ width: 90, height: 90 }} crossOrigin="anonymous" />
                    <p style={{ fontSize: 10, color: '#78716c', margin: 0, textAlign: 'center' }}>↑ 點我線上報名</p>
                  </div>
                  {/* 社群 QR */}
                  <div style={{ flex: 1, background: 'white', borderRadius: 10, border: '1px solid #fed7aa', padding: '10px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ background: '#06C755', borderRadius: 12, padding: '4px 10px' }}>
                      <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>種子社區大學</span>
                    </div>
                    {editor.communityQr
                      ? <img src={editor.communityQr} alt="社群QR" style={{ width: 90, height: 90, objectFit: 'contain' }} crossOrigin="anonymous" />
                      : <div style={{ width: 90, height: 90, background: '#f5f5f4', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: '#a8a29e' }}>未上傳</span>
                        </div>
                    }
                    <p style={{ fontSize: 10, color: '#78716c', margin: 0, textAlign: 'center' }}>加入官方社群</p>
                  </div>
                </div>

                {/* 聯繫資訊 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {contactItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#06C755', flexShrink: 0, marginTop: 4 }} />
                      <span style={{ fontSize: 12, color: '#1c1917', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 右側課表 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* 直式標題 */}
              {!isLandscape && (
                <div style={{ background: editor.leftBgColor, padding: '20px 28px', textAlign: 'center' }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#1c1917', margin: 0 }}>{editor.titleLine1}</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: editor.headerColor, margin: '4px 0' }}>{editor.titleLine2}</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#1c1917', margin: 0 }}>
                    {year} 年<span style={{ color: editor.headerColor }}> {rocMonth} 月</span>份活動表
                  </p>
                </div>
              )}

              {/* 表頭 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isLandscape
                  ? '90px 110px 1fr 150px 130px 110px 80px'
                  : '90px 110px 1fr 150px 120px 100px',
                background: editor.tableHeaderColor,
                padding: '0 8px',
              }}>
                {(isLandscape
                  ? ['日期','時間','活動名稱','授課講師','地點','對象','費用']
                  : ['日期','時間','活動名稱','授課講師','地點','對象']
                ).map(h => (
                  <div key={h} style={{ color: 'white', fontWeight: 700, fontSize: 16, padding: '14px 8px', textAlign: 'center' }}>{h}</div>
                ))}
              </div>

              {/* 課程列 */}
              {pageCourses.map((course, i) => {
                const { month: cm, day, weekday } = toROC(course.date)
                return (
                  <div key={course.id} style={{
                    display: 'grid',
                    gridTemplateColumns: isLandscape
                      ? '90px 110px 1fr 150px 130px 110px 80px'
                      : '90px 110px 1fr 150px 120px 100px',
                    background: i % 2 === 0 ? '#ffffff' : '#fff7ed',
                    borderBottom: '1px solid #fed7aa',
                    padding: '0 8px',
                    minHeight: 90,
                  }}>
                    {/* 日期 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 4px' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#1c1917', lineHeight: 1 }}>{cm}/{day}</span>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: editor.headerColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{weekday}</span>
                      </div>
                    </div>

                    {/* 時間 */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '12px 4px' }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>{course.time_start?.slice(0, 5)}</span>
                      <span style={{ fontSize: 14, color: '#a8a29e', lineHeight: 1 }}>｜</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#1c1917' }}>{course.time_end?.slice(0, 5)}</span>
                    </div>

                    {/* 活動名稱 */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 12px' }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#1c1917', lineHeight: 1.4 }}>{course.title}</span>
                    </div>

                    {/* 講師 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 8px' }}>
                      {course.instructors?.name && (
                        <span style={{
                          background: '#fed7aa', color: '#c2410c', fontWeight: 700,
                          fontSize: 15, borderRadius: 20, padding: '5px 14px',
                          whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{course.instructors.name}</span>
                      )}
                    </div>

                    {/* 地點 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 8px', textAlign: 'center' }}>
                      <span style={{ fontSize: 15, color: '#1c1917', lineHeight: 1.4 }}>{course.location}</span>
                    </div>

                    {/* 對象 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 6px', textAlign: 'center' }}>
                      <span style={{ fontSize: 14, color: '#1c1917', lineHeight: 1.4 }}>{course.suitable_age || '全年齡'}</span>
                    </div>

                    {/* 費用（橫式） */}
                    {isLandscape && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 4px' }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: editor.headerColor }}>免費</span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 空列補足（視覺一致） */}
              {Array.from({ length: Math.max(0, rowsPerPage - pageCourses.length) }).map((_, i) => (
                <div key={`empty-${i}`} style={{
                  display: 'grid',
                  gridTemplateColumns: isLandscape
                    ? '90px 110px 1fr 150px 130px 110px 80px'
                    : '90px 110px 1fr 150px 120px 100px',
                  background: (pageCourses.length + i) % 2 === 0 ? '#ffffff' : '#fff7ed',
                  borderBottom: '1px solid #fed7aa',
                  minHeight: 90,
                }}>
                  {[...Array(isLandscape ? 7 : 6)].map((_, ci) => <div key={ci} />)}
                </div>
              ))}
            </div>
          </div>

          {/* 底部夥伴列 */}
          <div style={{ background: editor.footerBgColor, padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            {[
              { img: editor.logo1, name: editor.logo1Name },
              { img: editor.logo2, name: editor.logo2Name },
              { img: editor.logo3, name: editor.logo3Name },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {p.img && <img src={p.img} alt="" style={{ height: 36, width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />}
                <span style={{ color: editor.footerTextColor, fontSize: 16, fontWeight: 500 }}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) reset() }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-800 text-lg">匯出課表設定</h3>
          <button onClick={reset} className="p-2 hover:bg-stone-100 rounded-xl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div>
          <label className="block text-stone-600 text-sm font-medium mb-2">選擇月份</label>
          {availableMonths.length === 0
            ? <p className="text-stone-400 text-sm">目前無課程月份</p>
            : <div className="grid grid-cols-3 gap-2">
                {availableMonths.map(m => {
                  const [y, mo] = m.split('-')
                  return (
                    <button key={m} onClick={() => setSelectedMonth(m)}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${selectedMonth === m ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                      {parseInt(y) - 1911}/{parseInt(mo)}月
                    </button>
                  )
                })}
              </div>
          }
        </div>

        <div>
          <label className="block text-stone-600 text-sm font-medium mb-2">每頁列數</label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(n => (
              <button key={n} onClick={() => setRowsPerPage(n)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${rowsPerPage === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-stone-600 text-sm font-medium mb-2">版面方向</label>
          <div className="flex gap-3">
            {([['landscape','橫式（16:9）'], ['portrait','直式（A4）']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setOrientation(v)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${orientation === v ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {selectedMonth && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-stone-600">
            {(() => {
              const [y, mo] = selectedMonth.split('-')
              return `${parseInt(y) - 1911} 年 ${parseInt(mo)} 月，共 ${monthCourses.length} 堂課，分 ${totalPages} 頁`
            })()}
          </div>
        )}

        <button
          onClick={() => { initEditor(); setStep('editor') }}
          disabled={!selectedMonth}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
          進入編輯器
        </button>
      </div>
    </div>
  )

  // ── editor ──
  return (
    <div className="fixed inset-0 bg-stone-900 z-50 flex flex-col">
      {/* 頂部工具列 */}
      <div className="bg-white border-b border-stone-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => setStep('config')} className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          返回設定
        </button>
        <span className="text-stone-300">|</span>
        <span className="font-bold text-stone-800 text-sm">課表編輯器</span>
        {totalPages > 1 && (
          <div className="flex gap-1 ml-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${currentPage === i ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                第 {i + 1} 頁
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={downloadAll} disabled={downloading}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {downloading
              ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />生成中...</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下載 PNG{totalPages > 1 ? `（${totalPages} 張）` : ''}</>
            }
          </button>
          <button onClick={reset} className="p-2 hover:bg-stone-100 rounded-xl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* 編輯器主體 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側控制面板 */}
        <div className="w-72 bg-white border-r border-stone-200 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-6">

            {/* 標題文字 */}
            <section>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">標題文字</p>
              <div className="space-y-2">
                {(['titleLine1','titleLine2'] as const).map((key, i) => (
                  <div key={key}>
                    <label className="block text-xs text-stone-500 mb-1">第 {i + 1} 行</label>
                    <input value={editor[key]} onChange={e => set(key, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                ))}
              </div>
            </section>

            {/* 顏色 */}
            <section>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">顏色</p>
              <div className="space-y-3">
                {[
                  { key: 'headerColor', label: '頂部品牌色' },
                  { key: 'tableHeaderColor', label: '表頭顏色' },
                  { key: 'leftBgColor', label: '左側背景色' },
                  { key: 'footerBgColor', label: '底部背景色' },
                  { key: 'footerTextColor', label: '底部文字色' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between">
                    <span className="text-sm text-stone-600">{f.label}</span>
                    <div className="flex items-center gap-2">
                      <input type="color" value={(editor as any)[f.key]}
                        onChange={e => set(f.key as keyof EditorState, e.target.value)}
                        className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer" />
                      <span className="text-xs text-stone-400 font-mono">{(editor as any)[f.key]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 底圖 */}
            <section>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">底圖</p>
              <label className="flex items-center gap-2 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2.5 px-3 cursor-pointer transition-colors text-sm text-stone-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {editor.bgImage ? '已上傳，點擊替換' : '上傳底圖'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('bgImage')} />
              </label>
              {editor.bgImage && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-stone-500">透明度 {Math.round(editor.bgOpacity * 100)}%</label>
                    <button onClick={() => set('bgImage', '')} className="text-xs text-red-400 hover:text-red-600">移除</button>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={editor.bgOpacity}
                    onChange={e => set('bgOpacity', parseFloat(e.target.value))}
                    className="w-full" />
                </div>
              )}
            </section>

            {/* QR Code */}
            <section>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">QR Code</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-stone-500 mb-1.5">報名 QR（自動生成）</p>
                  <img src={QR_API(SITE_URL, 80)} alt="" className="w-16 h-16 rounded-lg border border-stone-200" crossOrigin="anonymous" />
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1.5">社群 QR Code</p>
                  <label className="flex items-center gap-2 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {editor.communityQr ? '已上傳' : '上傳社群QR'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload('communityQr')} />
                  </label>
                  {editor.communityQr && <img src={editor.communityQr} alt="" className="mt-1.5 w-16 h-16 object-contain rounded-lg border border-stone-200" />}
                </div>
              </div>
            </section>

            {/* 合作夥伴 */}
            <section>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">合作夥伴</p>
              <div className="space-y-4">
                {([
                  { logoKey: 'logo1', nameKey: 'logo1Name', label: '夥伴 1' },
                  { logoKey: 'logo2', nameKey: 'logo2Name', label: '夥伴 2' },
                  { logoKey: 'logo3', nameKey: 'logo3Name', label: '夥伴 3' },
                ] as const).map(f => (
                  <div key={f.logoKey}>
                    <label className="block text-xs text-stone-500 mb-1">{f.label} 名稱</label>
                    <input value={editor[f.nameKey]} onChange={e => set(f.nameKey, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300 mb-1.5" />
                    <label className="flex items-center gap-1.5 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-1.5 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      {editor[f.logoKey] ? '已上傳' : '上傳 Logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload(f.logoKey)} />
                    </label>
                    {editor[f.logoKey] && (
                      <div className="mt-1 flex items-center gap-2">
                        <img src={editor[f.logoKey]} alt="" className="h-8 w-auto object-contain rounded border border-stone-200" />
                        <button onClick={() => set(f.logoKey, '')} className="text-xs text-red-400 hover:text-red-600">移除</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 聯繫資訊 */}
            <section>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">聯繫資訊</p>
              <div className="space-y-2">
                {[
                  { key: 'phone', label: '電話' },
                  { key: 'contact', label: '聯絡窗口' },
                  { key: 'hours', label: '服務時間' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-stone-500 mb-1">{f.label}</label>
                    <input value={(editor as any)[f.key]} onChange={e => set(f.key as keyof EditorState, e.target.value)}
                      className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* 右側預覽區 */}
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
          <div ref={previewRef} style={{ transform: 'scale(1)', transformOrigin: 'top center' }}>
            {renderPage(currentPage)}
          </div>
        </div>
      </div>
    </div>
  )
}
