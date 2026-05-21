'use client'

import { useState, useRef, useEffect } from 'react'

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
const QR_API = (url: string, size = 400) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`

function toROC(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return { year: d.getFullYear() - 1911, month: d.getMonth() + 1, day: d.getDate(), weekday: WEEKDAYS[d.getDay()] }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const ch of text) {
    const test = current + ch
    if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = ch }
    else current = test
  }
  if (current) lines.push(current)
  return lines
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

type Orientation = 'landscape' | 'portrait'

export default function CourseScheduleExporter({ courses, scheduleSettings: ss }: Props) {
  const [step, setStep] = useState<'idle' | 'config' | 'preview'>('idle')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [rowsPerPage, setRowsPerPage] = useState(4)
  const [orientation, setOrientation] = useState<Orientation>('landscape')
  const [generating, setGenerating] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(0)

  // 臨時覆蓋設定（只影響這次匯出）
  const [tempBg, setTempBg] = useState('')
  const [tempCommQr, setTempCommQr] = useState('')
  const [tempLogo1, setTempLogo1] = useState('')
  const [tempLogo2, setTempLogo2] = useState('')
  const [tempLogo3, setTempLogo3] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const availableMonths = Array.from(
    new Set(courses.map(c => c.date?.slice(0, 7)).filter(Boolean))
  ).sort() as string[]

  const monthCourses = selectedMonth
    ? courses.filter(c => c.date?.startsWith(selectedMonth))
        .sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start))
    : []

  const totalPages = Math.ceil(monthCourses.length / rowsPerPage)

  // 初始化臨時設定從 Supabase 帶入
  useEffect(() => {
    if (step === 'preview') {
      setTempCommQr(prev => prev || ss.schedule_community_qr || '')
      setTempLogo1(prev => prev || ss.schedule_logo_1 || '')
      setTempLogo2(prev => prev || ss.schedule_logo_2 || '')
      setTempLogo3(prev => prev || ss.schedule_logo_3 || '')
    }
  }, [step])

  const handleTempUpload = (setter: (v: string) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setter(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const generatePages = async () => {
    setGenerating(true)
    const canvas = canvasRef.current!
    const urls: string[] = []

    // 尺寸設定
    const isLandscape = orientation === 'landscape'
    const W = isLandscape ? 1920 : 1080
    const H = isLandscape ? 1080 : 1527

    const BRAND_H = 64
    const FOOTER_H = 110
    const LEFT_W = isLandscape ? 500 : 0   // 直式沒有左側
    const COL_START = LEFT_W
    const COL_W = W - LEFT_W
    const TABLE_HEADER_H = 76
    const CONTENT_H = H - BRAND_H - FOOTER_H
    const ROW_H = Math.floor((CONTENT_H - TABLE_HEADER_H) / rowsPerPage)

    // 預先載入圖片
    const registerQrUrl = QR_API(SITE_URL)
    const [bgImg, regQrImg, commQrImg, logo1Img, logo2Img, logo3Img] = await Promise.all([
      loadImage(tempBg),
      loadImage(registerQrUrl),
      loadImage(tempCommQr),
      loadImage(tempLogo1),
      loadImage(tempLogo2),
      loadImage(tempLogo3),
    ])

    for (let page = 0; page < totalPages; page++) {
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      const pageCourses = monthCourses.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

      // ── 背景 ──
      ctx.fillStyle = '#fdf8f2'
      ctx.fillRect(0, 0, W, H)
      if (bgImg) {
        ctx.globalAlpha = 0.15
        ctx.drawImage(bgImg, 0, 0, W, H)
        ctx.globalAlpha = 1
      }

      // ── 頂部品牌列 ──
      ctx.fillStyle = '#f97316'
      ctx.fillRect(0, 0, W, BRAND_H)
      ctx.fillStyle = 'white'
      ctx.font = `bold ${isLandscape ? 24 : 28}px "Noto Sans TC", sans-serif`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.fillText('XINDIAN · YANGBEI SOCIAL HOUSING', 36, BRAND_H / 2)

      // 頁碼（右上）
      if (totalPages > 1) {
        ctx.textAlign = 'right'
        ctx.font = `${isLandscape ? 20 : 22}px "Noto Sans TC", sans-serif`
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillText(`${page + 1} / ${totalPages}`, W - 32, BRAND_H / 2)
        ctx.textAlign = 'left'
      }

      const { year: rocYear, month: rocMonth } = toROC(selectedMonth + '-01')

      // ── 左側（橫式才有）──
      if (isLandscape) {
        ctx.fillStyle = '#fff7ed'
        ctx.fillRect(0, BRAND_H, LEFT_W, H - BRAND_H - FOOTER_H)

        let ly = BRAND_H + 36

        // 主標題
        ctx.fillStyle = '#1c1917'
        ctx.font = 'bold 38px "Noto Sans TC", sans-serif'
        ctx.textBaseline = 'top'
        ctx.fillText('新店央北社會住宅', 36, ly); ly += 48
        ctx.fillStyle = '#f97316'
        ctx.font = 'bold 36px "Noto Sans TC", sans-serif'
        ctx.fillText('跨世代共居種子計畫', 36, ly); ly += 44

        // 年月大字
        ctx.fillStyle = '#1c1917'
        ctx.font = 'bold 40px "Noto Sans TC", sans-serif'
        const yearText = `${rocYear} 年`
        ctx.fillText(yearText, 36, ly)
        const yearW = ctx.measureText(yearText).width
        ctx.fillStyle = '#f97316'
        const monthText = `${rocMonth} 月`
        ctx.fillText(monthText, 36 + yearW + 6, ly)
        const monthW = ctx.measureText(monthText).width
        ctx.fillStyle = '#1c1917'
        ctx.fillText('份活動表', 36 + yearW + 6 + monthW + 6, ly)
        ly += 52

        // 分隔線
        ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(36, ly); ctx.lineTo(LEFT_W - 36, ly); ctx.stroke()
        ly += 18

        // 副說明
        ctx.fillStyle = '#78716c'; ctx.font = '22px "Noto Sans TC", sans-serif'
        ctx.fillText('各項活動皆歡迎居民們踴躍報名！', 36, ly); ly += 32
        ctx.fillStyle = '#a8a29e'; ctx.font = '18px "Noto Sans TC", sans-serif'
        ctx.fillText('（數量有限，額滿為止）', 36, ly); ly += 32

        // QR Code 區塊（並排）
        const qrSize = 140
        const qrBoxW = (LEFT_W - 36 - 36 - 16) / 2

        const drawQrBox = (
          img: HTMLImageElement | null, label: string, sub: string,
          btnColor: string, x: number, y: number
        ) => {
          ctx.fillStyle = 'white'
          roundRect(ctx, x, y, qrBoxW, qrSize + 96, 12); ctx.fill()
          ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 1
          roundRect(ctx, x, y, qrBoxW, qrSize + 96, 12); ctx.stroke()

          // 標籤
          ctx.fillStyle = btnColor
          roundRect(ctx, x + (qrBoxW - 120) / 2, y + 10, 120, 32, 16); ctx.fill()
          ctx.fillStyle = 'white'; ctx.font = 'bold 17px "Noto Sans TC", sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(label, x + qrBoxW / 2, y + 26); ctx.textBaseline = 'top'

          // QR 圖
          const qrY = y + 50
          if (img) {
            ctx.drawImage(img, x + (qrBoxW - qrSize) / 2, qrY, qrSize, qrSize)
          } else {
            ctx.fillStyle = '#f5f5f4'
            ctx.fillRect(x + (qrBoxW - qrSize) / 2, qrY, qrSize, qrSize)
            ctx.fillStyle = '#a8a29e'; ctx.font = '14px sans-serif'
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
            ctx.fillText('QR Code', x + qrBoxW / 2, qrY + qrSize / 2)
            ctx.textBaseline = 'top'
          }

          // 說明文字
          ctx.fillStyle = '#78716c'; ctx.font = '16px "Noto Sans TC", sans-serif'
          ctx.textAlign = 'center'; ctx.textBaseline = 'top'
          ctx.fillText(sub, x + qrBoxW / 2, qrY + qrSize + 10)
          ctx.textAlign = 'left'
        }

        ctx.textBaseline = 'top'
        drawQrBox(regQrImg, '活動報名', '↑ 點我線上報名', '#f97316', 36, ly)
        drawQrBox(commQrImg, '種子社區大學', '加入官方社群', '#06C755', 36 + qrBoxW + 16, ly)
        ly += qrSize + 112

        // 聯繫資訊
        const contactItems = [
          ss.schedule_phone ? `洽詢：${ss.schedule_phone}` : '',
          ss.schedule_contact || '',
          ss.schedule_hours ? `時間：${ss.schedule_hours}` : '',
        ].filter(Boolean)

        ctx.font = '19px "Noto Sans TC", sans-serif'
        for (const item of contactItems) {
          ctx.fillStyle = '#06C755'
          ctx.beginPath(); ctx.arc(44, ly + 9, 6, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#1c1917'
          const lines = wrapText(ctx, item, LEFT_W - 76)
          lines.forEach((line, i) => ctx.fillText(line, 58, ly + i * 24))
          ly += lines.length * 24 + 10
        }
      }

      // ── 直式：標題區（全寬）──
      if (!isLandscape) {
        ctx.fillStyle = '#fff7ed'
        ctx.fillRect(0, BRAND_H, W, 200)
        ctx.textBaseline = 'top'
        ctx.fillStyle = '#1c1917'
        ctx.font = 'bold 44px "Noto Sans TC", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`新店央北社會住宅  ${rocYear}年${rocMonth}月份活動表`, W / 2, BRAND_H + 24)
        ctx.fillStyle = '#f97316'
        ctx.font = 'bold 32px "Noto Sans TC", sans-serif'
        ctx.fillText('跨世代共居種子計畫', W / 2, BRAND_H + 80)
        ctx.textAlign = 'left'
      }

      // ── 右側課表 ──
      const tableTop = isLandscape ? BRAND_H : BRAND_H + 200

      // 欄位設定（根據方向調整寬度）
      const cols = isLandscape ? [
        { label: '日期', w: 110 },
        { label: '時間', w: 130 },
        { label: '活動名稱', w: 330 },
        { label: '授課講師', w: 190 },
        { label: '地點', w: 175 },
        { label: '對象', w: 145 },
        { label: '費用', w: 100 },
      ] : [
        { label: '日期', w: 120 },
        { label: '時間', w: 150 },
        { label: '活動名稱', w: 360 },
        { label: '授課講師', w: 200 },
        { label: '地點', w: 130 },
        { label: '對象', w: 120 },
      ]

      // 計算 x 起點
      let cx = COL_START + 16
      const colsWithX = cols.map(col => { const x = cx; cx += col.w; return { ...col, x } })

      // 表頭背景
      ctx.fillStyle = '#f97316'
      ctx.fillRect(COL_START, tableTop, COL_W, TABLE_HEADER_H)
      ctx.fillStyle = 'white'
      ctx.font = `bold ${isLandscape ? 26 : 28}px "Noto Sans TC", sans-serif`
      ctx.textBaseline = 'middle'
      colsWithX.forEach(col => {
        ctx.textAlign = 'center'
        ctx.fillText(col.label, col.x + col.w / 2, tableTop + TABLE_HEADER_H / 2)
      })
      ctx.textAlign = 'left'

      // 課程列
      pageCourses.forEach((course, i) => {
        const rowY = tableTop + TABLE_HEADER_H + i * ROW_H
        ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fff7ed'
        ctx.fillRect(COL_START, rowY, COL_W, ROW_H)

        ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(COL_START, rowY + ROW_H); ctx.lineTo(W, rowY + ROW_H); ctx.stroke()

        const { month, day, weekday } = toROC(course.date)
        const cy = rowY + ROW_H / 2
        const fontSize = Math.max(22, Math.min(32, Math.floor(ROW_H / 5)))

        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#1c1917'

        // 日期
        ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(`${month}/${day}`, colsWithX[0].x + colsWithX[0].w / 2, cy - fontSize * 0.6)
        // 星期圓
        const circleR = Math.max(16, fontSize * 0.65)
        ctx.fillStyle = '#f97316'
        ctx.beginPath(); ctx.arc(colsWithX[0].x + colsWithX[0].w / 2, cy + fontSize * 0.5, circleR, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'white'
        ctx.font = `bold ${Math.floor(circleR * 1.1)}px "Noto Sans TC", sans-serif`
        ctx.fillText(weekday, colsWithX[0].x + colsWithX[0].w / 2, cy + fontSize * 0.5)

        // 時間
        ctx.fillStyle = '#1c1917'
        ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(course.time_start?.slice(0, 5) || '', colsWithX[1].x + colsWithX[1].w / 2, cy - fontSize * 0.6)
        ctx.fillStyle = '#d6d3d1'; ctx.font = `${fontSize * 0.7}px sans-serif`
        ctx.fillText('|', colsWithX[1].x + colsWithX[1].w / 2, cy)
        ctx.fillStyle = '#1c1917'; ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`
        ctx.fillText(course.time_end?.slice(0, 5) || '', colsWithX[1].x + colsWithX[1].w / 2, cy + fontSize * 0.6)

        // 活動名稱
        ctx.textAlign = 'left'
        ctx.fillStyle = '#1c1917'; ctx.font = `bold ${fontSize + 2}px "Noto Sans TC", sans-serif`
        const titleLines = wrapText(ctx, course.title, colsWithX[2].w - 12)
        const lineH = (fontSize + 2) * 1.3
        const titleStartY = cy - ((titleLines.length - 1) * lineH) / 2
        titleLines.forEach((line, li) => ctx.fillText(line, colsWithX[2].x + 8, titleStartY + li * lineH))

        // 講師標籤
        if (course.instructors?.name && colsWithX[3]) {
          const instrText = course.instructors.name
          ctx.font = `bold ${fontSize}px "Noto Sans TC", sans-serif`
          const tw = ctx.measureText(instrText).width
          const tagW = Math.min(tw + 28, colsWithX[3].w - 12)
          const tagH = fontSize * 1.6
          const tagX = colsWithX[3].x + (colsWithX[3].w - tagW) / 2
          ctx.fillStyle = '#fed7aa'
          roundRect(ctx, tagX, cy - tagH / 2, tagW, tagH, tagH / 2); ctx.fill()
          ctx.fillStyle = '#c2410c'; ctx.textAlign = 'center'
          ctx.fillText(instrText, colsWithX[3].x + colsWithX[3].w / 2, cy)
          ctx.textAlign = 'left'
        }

        // 地點
        if (colsWithX[4]) {
          ctx.fillStyle = '#1c1917'; ctx.font = `${fontSize}px "Noto Sans TC", sans-serif`
          const locLines = wrapText(ctx, course.location || '', colsWithX[4].w - 8)
          const locStartY = cy - ((locLines.length - 1) * lineH) / 2
          locLines.forEach((line, li) => { ctx.textAlign = 'center'; ctx.fillText(line, colsWithX[4].x + colsWithX[4].w / 2, locStartY + li * lineH) })
        }

        // 對象
        if (colsWithX[5]) {
          ctx.fillStyle = '#1c1917'; ctx.font = `${fontSize - 2}px "Noto Sans TC", sans-serif`
          const ageLines = wrapText(ctx, course.suitable_age || '全年齡', colsWithX[5].w - 8)
          const ageStartY = cy - ((ageLines.length - 1) * 28) / 2
          ageLines.forEach((line, li) => { ctx.textAlign = 'center'; ctx.fillText(line, colsWithX[5].x + colsWithX[5].w / 2, ageStartY + li * 28) })
        }

        // 費用（橫式才有）
        if (isLandscape && colsWithX[6]) {
          ctx.fillStyle = '#f97316'; ctx.font = `bold ${fontSize + 2}px "Noto Sans TC", sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText('免費', colsWithX[6].x + colsWithX[6].w / 2, cy)
        }

        ctx.textAlign = 'left'
      })

      // 欄位垂直分隔線
      ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 1
      colsWithX.slice(1).forEach(col => {
        ctx.beginPath(); ctx.moveTo(col.x - 8, tableTop); ctx.lineTo(col.x - 8, H - FOOTER_H); ctx.stroke()
      })

      // 左右分界線（橫式）
      if (isLandscape) {
        ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(LEFT_W, BRAND_H); ctx.lineTo(LEFT_W, H - FOOTER_H); ctx.stroke()
      }

      // ── 底部合作夥伴 ──
      const footerY = H - FOOTER_H
      ctx.fillStyle = '#1c1917'
      ctx.fillRect(0, footerY, W, FOOTER_H)

      const partnerW = W / 3
      const partnerLogos = [
        { img: logo1Img, name: ss.schedule_logo_1_name || '新北市政府城鄉發展局' },
        { img: logo2Img, name: ss.schedule_logo_2_name || '跨世代共居種子計畫' },
        { img: logo3Img, name: ss.schedule_logo_3_name || '街道案子團隊' },
      ]

      partnerLogos.forEach((partner, i) => {
        const px = i * partnerW + partnerW / 2
        const py = footerY + FOOTER_H / 2
        ctx.textBaseline = 'middle'; ctx.textAlign = 'center'

        if (partner.img) {
          const logoH = 44
          const logoW = partner.img.width * (logoH / partner.img.height)
          const totalW = logoW + 12 + ctx.measureText(partner.name).width
          const startX = px - totalW / 2
          ctx.drawImage(partner.img, startX, py - logoH / 2, logoW, logoH)
          ctx.fillStyle = 'white'; ctx.font = '24px "Noto Sans TC", sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(partner.name, startX + logoW + 12, py)
        } else {
          ctx.fillStyle = 'white'; ctx.font = '24px "Noto Sans TC", sans-serif'
          ctx.fillText(partner.name, px, py)
        }
      })

      urls.push(canvas.toDataURL('image/png'))
    }

    setPreviewUrls(urls)
    setCurrentPage(0)
    setGenerating(false)
  }

  const downloadAll = () => {
    const { year: rocYear, month: rocMonth } = toROC(selectedMonth + '-01')
    previewUrls.forEach((url, i) => {
      const link = document.createElement('a')
      link.download = totalPages > 1
        ? `央北社宅_${rocYear}年${rocMonth}月活動表_第${i + 1}頁.png`
        : `央北社宅_${rocYear}年${rocMonth}月活動表.png`
      link.href = url
      link.click()
    })
  }

  const reset = () => {
    setStep('idle'); setPreviewUrls([])
    setTempBg(''); setTempCommQr(''); setTempLogo1(''); setTempLogo2(''); setTempLogo3('')
  }

  if (step === 'idle') return (
    <button onClick={() => setStep('config')}
      className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      匯出課表
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) reset() }}>

      {step === 'config' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-800 text-lg">匯出課表設定</h3>
            <button onClick={reset} className="p-2 hover:bg-stone-100 rounded-xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* 月份 */}
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

          {/* 每頁列數 */}
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

          {/* 方向 */}
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
                const count = monthCourses.length
                const pages = Math.ceil(count / rowsPerPage)
                const [y, mo] = selectedMonth.split('-')
                return `${parseInt(y) - 1911} 年 ${parseInt(mo)} 月，共 ${count} 堂課，分 ${pages} 頁`
              })()}
            </div>
          )}

          <button onClick={async () => { setStep('preview'); await generatePages() }}
            disabled={!selectedMonth}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
            進入預覽
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">
          {/* 預覽頂部工具列 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
            <div className="flex items-center gap-3">
              <button onClick={() => { setStep('config'); setPreviewUrls([]) }}
                className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                返回設定
              </button>
              <span className="text-stone-300">|</span>
              <h3 className="font-bold text-stone-800">預覽課表</h3>
              {totalPages > 1 && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                  共 {totalPages} 頁
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={async () => { await generatePages() }} disabled={generating}
                className="flex items-center gap-1.5 text-sm bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2 rounded-xl transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                重新生成
              </button>
              <button onClick={downloadAll}
                className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors font-medium">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                下載 PNG{totalPages > 1 ? `（${totalPages} 張）` : ''}
              </button>
              <button onClick={reset} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div className="flex">
            {/* 左側：臨時替換設定 */}
            <div className="w-64 border-r border-stone-200 p-4 space-y-4 overflow-y-auto max-h-[80vh]">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">臨時替換（不覆蓋設定）</p>

              {[
                { label: '底圖', key: 'bg', setter: setTempBg, value: tempBg },
                { label: '社群 QR Code', key: 'commQr', setter: setTempCommQr, value: tempCommQr },
                { label: '夥伴 Logo 1', key: 'logo1', setter: setTempLogo1, value: tempLogo1 },
                { label: '夥伴 Logo 2', key: 'logo2', setter: setTempLogo2, value: tempLogo2 },
                { label: '夥伴 Logo 3', key: 'logo3', setter: setTempLogo3, value: tempLogo3 },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-stone-600 text-xs font-medium mb-1.5">{f.label}</label>
                  <label className="flex items-center gap-1.5 w-full border border-dashed border-stone-300 hover:border-orange-300 rounded-lg py-2 px-3 cursor-pointer transition-colors text-xs text-stone-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {f.value ? '已替換' : '點擊上傳'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleTempUpload(f.setter)} />
                  </label>
                  {f.value && (
                    <div className="mt-1 relative">
                      <img src={f.value} alt="" className="w-full h-14 object-contain bg-stone-50 rounded-lg border border-stone-200" />
                      <button onClick={() => f.setter('')} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-2 border-t border-stone-100">
                <p className="text-xs text-stone-400 mb-1">報名 QR Code（自動生成）</p>
                <img src={QR_API(SITE_URL, 120)} alt="報名QR" className="w-20 h-20 rounded-lg border border-stone-200" />
                <p className="text-xs text-stone-400 mt-1">{SITE_URL}</p>
              </div>
            </div>

            {/* 右側：預覽圖 */}
            <div className="flex-1 bg-stone-100 p-6 flex flex-col items-center gap-4 max-h-[80vh] overflow-y-auto">
              {generating ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
                  <p className="text-stone-500 text-sm">生成中...</p>
                </div>
              ) : previewUrls.length > 0 ? (
                <>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 self-start">
                      {previewUrls.map((_, i) => (
                        <button key={i} onClick={() => setCurrentPage(i)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentPage === i ? 'bg-orange-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-200'}`}>
                          第 {i + 1} 頁
                        </button>
                      ))}
                    </div>
                  )}
                  <img src={previewUrls[currentPage]} alt="預覽" className="w-full rounded-xl shadow-lg" />
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
