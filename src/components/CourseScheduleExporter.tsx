'use client'

import { useState, useRef } from 'react'

interface Course {
  id: string
  title: string
  date: string
  time_start: string
  time_end: string
  location: string
  notes?: string
  suitable_age?: string
  instructors?: { name: string } | null
  course_categories?: { name: string; color: string } | null
}

interface ScheduleSettings {
  schedule_phone: string
  schedule_contact: string
  schedule_hours: string
  schedule_register_qr: string
  schedule_community_qr: string
  schedule_logo_1: string
  schedule_logo_2: string
  schedule_logo_3: string
  schedule_logo_1_name: string
  schedule_logo_2_name: string
  schedule_logo_3_name: string
}

interface Props {
  courses: Course[]
  scheduleSettings: ScheduleSettings
}

const WEEKDAYS = ['日','一','二','三','四','五','六']

function toROC(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const rocYear = d.getFullYear() - 1911
  return { year: rocYear, month: d.getMonth() + 1, day: d.getDate(), weekday: WEEKDAYS[d.getDay()] }
}

function getAvailableMonths(courses: Course[]) {
  return Array.from(new Set(courses.map(c => c.date?.slice(0, 7)).filter(Boolean))).sort() as string[]
}

export default function CourseScheduleExporter({ courses, scheduleSettings: ss }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const availableMonths = getAvailableMonths(courses)

  const loadImage = (src: string): Promise<HTMLImageElement | null> =>
    new Promise(resolve => {
      if (!src) return resolve(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
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

  const generate = async () => {
    if (!selectedMonth) return
    setGenerating(true)

    const monthCourses = courses
      .filter(c => c.date?.startsWith(selectedMonth))
      .sort((a, b) => a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start))

    const [rocYear, rocMonth] = (() => {
      const [y, m] = selectedMonth.split('-').map(Number)
      return [y - 1911, m]
    })()

    // Canvas 尺寸：橫版 16:9，1920×1080
    const W = 1920
    const HEADER_H = 80         // 頂部品牌列
    const LEFT_W = 580          // 左側資訊區
    const COL_START = LEFT_W    // 右側課表起點
    const COL_W = W - LEFT_W    // 右側寬度
    const TABLE_HEADER_H = 80   // 欄位標題列高
    const ROW_H = 160           // 每列課程高度（長輩友善，較高）
    const FOOTER_H = 120        // 底部合作夥伴區
    const MIN_ROWS = 4

    const rowCount = Math.max(monthCourses.length, MIN_ROWS)
    const H = HEADER_H + Math.max(LEFT_W, TABLE_HEADER_H + rowCount * ROW_H) + FOOTER_H

    const canvas = canvasRef.current!
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // 背景
    ctx.fillStyle = '#fdf8f2'
    ctx.fillRect(0, 0, W, H)

    // ── 頂部品牌列 ──────────────────────────────
    ctx.fillStyle = '#f97316'
    ctx.fillRect(0, 0, W, HEADER_H)
    ctx.fillStyle = 'white'
    ctx.font = 'bold 28px "Noto Sans TC", sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText('XINDIAN · YANGBEI SOCIAL HOUSING', 40, HEADER_H / 2)

    // ── 左側區塊背景 ──────────────────────────────
    ctx.fillStyle = '#fff7ed'
    ctx.fillRect(0, HEADER_H, LEFT_W, H - HEADER_H - FOOTER_H)

    // 左側：主標題
    let ly = HEADER_H + 48
    ctx.fillStyle = '#1c1917'
    ctx.font = 'bold 52px "Noto Sans TC", sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText('新店央北社會住宅', 40, ly); ly += 64
    ctx.fillStyle = '#f97316'
    ctx.font = 'bold 48px "Noto Sans TC", sans-serif'
    ctx.fillText('跨世代共居種子計畫', 40, ly); ly += 60
    ctx.fillStyle = '#1c1917'
    ctx.font = 'bold 44px "Noto Sans TC", sans-serif'
    ctx.fillText(`${rocYear} 年`, 40, ly)
    ctx.fillStyle = '#f97316'
    const yearW = ctx.measureText(`${rocYear} 年`).width
    ctx.fillText(`${rocMonth} 月`, 40 + yearW + 8, ly)
    ctx.fillStyle = '#1c1917'
    const monthW = ctx.measureText(`${rocMonth} 月`).width
    ctx.fillText('份活動表', 40 + yearW + 8 + monthW + 8, ly)
    ly += 68

    // 分隔線
    ctx.strokeStyle = '#fed7aa'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(40, ly); ctx.lineTo(LEFT_W - 40, ly); ctx.stroke()
    ly += 24

    // 副說明
    ctx.fillStyle = '#78716c'
    ctx.font = '26px "Noto Sans TC", sans-serif'
    ctx.fillText('各項活動皆歡迎居民們踴躍報名！', 40, ly)
    ctx.font = '22px "Noto Sans TC", sans-serif'
    ctx.fillStyle = '#a8a29e'
    ctx.fillText('（數量有限，額滿為止）', 40, ly + 34)
    ly += 80

    // QR Code 區塊
    const qrSize = 180
    const qrBoxW = (LEFT_W - 40 - 40 - 20) / 2  // 兩個 QR 並排

    const [qrRegImg, qrCommImg] = await Promise.all([
      loadImage(ss.schedule_register_qr),
      loadImage(ss.schedule_community_qr),
    ])

    const drawQrBox = (img: HTMLImageElement | null, label: string, subLabel: string, btnLabel: string, btnColor: string, x: number, y: number) => {
      // 外框
      ctx.fillStyle = 'white'
      roundRect(ctx, x, y, qrBoxW, qrSize + 120, 16)
      ctx.fill()
      ctx.strokeStyle = '#fed7aa'
      ctx.lineWidth = 1.5
      roundRect(ctx, x, y, qrBoxW, qrSize + 120, 16)
      ctx.stroke()

      // 上方標籤按鈕
      ctx.fillStyle = btnColor
      roundRect(ctx, x + (qrBoxW - 140) / 2, y + 12, 140, 36, 18)
      ctx.fill()
      ctx.fillStyle = 'white'
      ctx.font = 'bold 20px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, x + qrBoxW / 2, y + 30)
      ctx.textAlign = 'left'

      // QR 圖或佔位
      const qrY = y + 56
      if (img) {
        ctx.drawImage(img, x + (qrBoxW - qrSize) / 2, qrY, qrSize, qrSize)
      } else {
        ctx.fillStyle = '#f5f5f4'
        ctx.fillRect(x + (qrBoxW - qrSize) / 2, qrY, qrSize, qrSize)
        ctx.fillStyle = '#d6d3d1'
        ctx.font = '18px "Noto Sans TC", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('QR Code', x + qrBoxW / 2, qrY + qrSize / 2)
        ctx.textAlign = 'left'
      }

      // 底部說明
      ctx.fillStyle = '#78716c'
      ctx.font = '18px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(subLabel, x + qrBoxW / 2, qrY + qrSize + 18)
      ctx.fillStyle = '#a8a29e'
      ctx.font = '16px "Noto Sans TC", sans-serif'
      ctx.fillText(btnLabel, x + qrBoxW / 2, qrY + qrSize + 40)
      ctx.textAlign = 'left'
    }

    drawQrBox(qrRegImg, '活動報名', '掃描 QR code', '進入線上報名頁面', '#f97316', 40, ly)
    drawQrBox(qrCommImg, '種子社區大學', '加入社群', '掌握最新活動資訊', '#06C755', 40 + qrBoxW + 20, ly)
    ly += qrSize + 140

    // 聯繫資訊
    const contactItems = [
      ss.schedule_phone ? `如有任何問題，請撥打洽詢專線：${ss.schedule_phone}` : '',
      ss.schedule_contact || '',
      ss.schedule_hours ? `服務時間：${ss.schedule_hours}` : '',
    ].filter(Boolean)

    ctx.font = '22px "Noto Sans TC", sans-serif'
    for (const item of contactItems) {
      // 圓點
      ctx.fillStyle = '#06C755'
      ctx.beginPath(); ctx.arc(48, ly + 11, 7, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#1c1917'
      const lines = wrapText(ctx, item, LEFT_W - 80)
      lines.forEach((line, i) => ctx.fillText(line, 64, ly + i * 28))
      ly += lines.length * 28 + 14
    }

    // ── 右側課表 ──────────────────────────────
    const tableTop = HEADER_H

    // 欄位定義
    const cols = [
      { label: '日期', x: COL_START + 20, w: 110 },
      { label: '時間', x: COL_START + 140, w: 130 },
      { label: '活動名稱', x: COL_START + 280, w: 340 },
      { label: '授課講師', x: COL_START + 630, w: 190 },
      { label: '地點', x: COL_START + 830, w: 170 },
      { label: '對象', x: COL_START + 1010, w: 150 },
      { label: '費用', x: COL_START + 1170, w: 110 },
    ]

    // 欄位標題背景
    ctx.fillStyle = '#f97316'
    ctx.fillRect(COL_START, tableTop, COL_W, TABLE_HEADER_H)

    ctx.fillStyle = 'white'
    ctx.font = 'bold 28px "Noto Sans TC", sans-serif'
    ctx.textBaseline = 'middle'
    cols.forEach(col => {
      ctx.textAlign = 'center'
      ctx.fillText(col.label, col.x + col.w / 2, tableTop + TABLE_HEADER_H / 2)
    })
    ctx.textAlign = 'left'

    // 課程列
    monthCourses.forEach((course, i) => {
      const rowY = tableTop + TABLE_HEADER_H + i * ROW_H
      const isEven = i % 2 === 0

      // 列背景
      ctx.fillStyle = isEven ? '#ffffff' : '#fff7ed'
      ctx.fillRect(COL_START, rowY, COL_W, ROW_H)

      // 分隔線
      ctx.strokeStyle = '#fed7aa'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(COL_START, rowY + ROW_H); ctx.lineTo(W, rowY + ROW_H); ctx.stroke()

      const { month, day, weekday } = toROC(course.date)
      const centerY = rowY + ROW_H / 2

      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#1c1917'

      // 日期
      ctx.font = 'bold 30px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${month}/${day}`, cols[0].x + cols[0].w / 2, centerY - 16)

      // 星期圓圈
      const circleX = cols[0].x + cols[0].w / 2
      const circleY = centerY + 22
      ctx.fillStyle = '#f97316'
      ctx.beginPath(); ctx.arc(circleX, circleY, 18, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = 'white'
      ctx.font = 'bold 20px "Noto Sans TC", sans-serif'
      ctx.fillText(weekday, circleX, circleY)

      // 時間
      ctx.fillStyle = '#1c1917'
      ctx.font = 'bold 26px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(course.time_start?.slice(0, 5) || '', cols[1].x + cols[1].w / 2, centerY - 16)
      ctx.fillStyle = '#a8a29e'
      ctx.font = '20px "Noto Sans TC", sans-serif'
      ctx.fillText('|', cols[1].x + cols[1].w / 2, centerY + 2)
      ctx.fillStyle = '#1c1917'
      ctx.font = 'bold 26px "Noto Sans TC", sans-serif'
      ctx.fillText(course.time_end?.slice(0, 5) || '', cols[1].x + cols[1].w / 2, centerY + 22)

      // 活動名稱
      ctx.textAlign = 'left'
      ctx.fillStyle = '#1c1917'
      ctx.font = 'bold 28px "Noto Sans TC", sans-serif'
      const titleLines = wrapText(ctx, course.title, cols[2].w - 16)
      const titleStartY = centerY - (titleLines.length - 1) * 18
      titleLines.forEach((line, li) => ctx.fillText(line, cols[2].x + 8, titleStartY + li * 36))

      // 講師（橢圓標籤）
      if (course.instructors?.name) {
        const instrText = course.instructors.name
        ctx.font = 'bold 24px "Noto Sans TC", sans-serif'
        const tw = ctx.measureText(instrText).width
        const tagW = tw + 32
        const tagH = 44
        const tagX = cols[3].x + (cols[3].w - tagW) / 2
        const tagY = centerY - tagH / 2
        ctx.fillStyle = '#fed7aa'
        roundRect(ctx, tagX, tagY, tagW, tagH, tagH / 2)
        ctx.fill()
        ctx.fillStyle = '#c2410c'
        ctx.textAlign = 'center'
        ctx.fillText(instrText, cols[3].x + cols[3].w / 2, centerY)
        ctx.textAlign = 'left'
      }

      // 地點
      ctx.fillStyle = '#1c1917'
      ctx.font = '26px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      const locLines = wrapText(ctx, course.location || '', cols[4].w - 8)
      const locStartY = centerY - (locLines.length - 1) * 16
      locLines.forEach((line, li) => {
        ctx.textAlign = 'center'
        ctx.fillText(line, cols[4].x + cols[4].w / 2, locStartY + li * 32)
      })

      // 對象
      ctx.textAlign = 'center'
      ctx.fillStyle = '#1c1917'
      ctx.font = '24px "Noto Sans TC", sans-serif'
      const ageLines = wrapText(ctx, course.suitable_age || '全年齡', cols[5].w - 8)
      const ageStartY = centerY - (ageLines.length - 1) * 14
      ageLines.forEach((line, li) => ctx.fillText(line, cols[5].x + cols[5].w / 2, ageStartY + li * 30))

      // 費用
      ctx.fillStyle = '#f97316'
      ctx.font = 'bold 28px "Noto Sans TC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('免費', cols[6].x + cols[6].w / 2, centerY)

      ctx.textAlign = 'left'
    })

    // 空列填充
    for (let i = monthCourses.length; i < MIN_ROWS; i++) {
      const rowY = tableTop + TABLE_HEADER_H + i * ROW_H
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fff7ed'
      ctx.fillRect(COL_START, rowY, COL_W, ROW_H)
      ctx.strokeStyle = '#fed7aa'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(COL_START, rowY + ROW_H); ctx.lineTo(W, rowY + ROW_H); ctx.stroke()
    }

    // 垂直分隔線（欄位之間）
    ctx.strokeStyle = '#fed7aa'
    ctx.lineWidth = 1
    cols.slice(1).forEach(col => {
      ctx.beginPath()
      ctx.moveTo(col.x - 10, tableTop)
      ctx.lineTo(col.x - 10, H - FOOTER_H)
      ctx.stroke()
    })

    // 左右分界線
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(COL_START, HEADER_H); ctx.lineTo(COL_START, H - FOOTER_H); ctx.stroke()

    // ── 底部合作夥伴 ──────────────────────────────
    const footerY = H - FOOTER_H
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(0, footerY, W, FOOTER_H)

    const logos = [
      { img: null as HTMLImageElement | null, src: ss.schedule_logo_1, name: ss.schedule_logo_1_name },
      { img: null as HTMLImageElement | null, src: ss.schedule_logo_2, name: ss.schedule_logo_2_name },
      { img: null as HTMLImageElement | null, src: ss.schedule_logo_3, name: ss.schedule_logo_3_name },
    ]
    const logoImgs = await Promise.all(logos.map(l => loadImage(l.src)))
    logoImgs.forEach((img, i) => { logos[i].img = img })

    const logoAreaW = W / logos.length
    ctx.textBaseline = 'middle'

    logos.forEach((logo, i) => {
      const lx = i * logoAreaW + logoAreaW / 2
      const ly2 = footerY + FOOTER_H / 2

      if (logo.img) {
        const logoH = 48
        const logoW = logo.img.width * (logoH / logo.img.height)
        ctx.drawImage(logo.img, lx - logoW / 2 - ctx.measureText(logo.name).width / 2 - 12, ly2 - logoH / 2, logoW, logoH)
        ctx.fillStyle = 'white'
        ctx.font = '26px "Noto Sans TC", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(logo.name, lx + logoW / 4, ly2)
      } else {
        ctx.fillStyle = 'white'
        ctx.font = '26px "Noto Sans TC", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(logo.name, lx, ly2)
      }
    })
    ctx.textAlign = 'left'

    // ── 下載 ──────────────────────────────
    const link = document.createElement('a')
    link.download = `央北社宅_${rocYear}年${rocMonth}月活動表.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    setGenerating(false)
    setShowModal(false)
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        匯出課表
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800 text-lg">匯出月份課表</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div>
              <label className="block text-stone-600 text-sm font-medium mb-2">選擇月份</label>
              {availableMonths.length === 0 ? (
                <p className="text-stone-400 text-sm">目前無可用課程月份</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableMonths.map(m => {
                    const [y, mo] = m.split('-')
                    const rocY = parseInt(y) - 1911
                    return (
                      <button key={m} onClick={() => setSelectedMonth(m)}
                        className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${selectedMonth === m ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-600 border-stone-200 hover:border-orange-300'}`}>
                        {rocY}/{parseInt(mo)}月
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedMonth && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-stone-600">
                {(() => {
                  const count = courses.filter(c => c.date?.startsWith(selectedMonth)).length
                  const [y, mo] = selectedMonth.split('-')
                  return `${parseInt(y) - 1911} 年 ${parseInt(mo)} 月，共 ${count} 堂課程`
                })()}
              </div>
            )}

            <button
              onClick={generate}
              disabled={!selectedMonth || generating}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  下載 PNG
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </>
  )
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
