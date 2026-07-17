'use client'

import jsPDF from 'jspdf'
import JSZip from 'jszip'
import html2canvas from 'html2canvas'

export interface ExportableReport {
  title: string
  date: string
  time_start?: string
  time_end?: string
  location?: string
  instructorName: string
  coInstructorNames: string[]
  summary: string
  participant_count: number | string
  reflection: string
  submitted_at: string
  signin_photo_urls: string[]
  photo_urls: string[]
}

export interface ExportResult {
  failedPhotoCount: number
}

const A4_PX_WIDTH = 794 // 報告版面寬度（近似 A4 96dpi），只是排版用，實際輸出會依 mm 換算

function esc(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function nl2br(s: string) {
  return esc(s).replace(/\n/g, '<br/>')
}

function buildReportNode(r: ExportableReport): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.style.cssText = `position:fixed; left:-9999px; top:0; width:${A4_PX_WIDTH}px; padding:56px 48px; background:#ffffff; font-family:'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif; color:#1a1a1a; box-sizing:border-box;`
  const timeRange = r.time_start ? `${r.time_start.slice(0, 5)}-${(r.time_end || '').slice(0, 5)}` : ''
  wrap.innerHTML = `
    <div style="border-bottom:3px solid #f97316; padding-bottom:16px; margin-bottom:24px;">
      <p style="font-size:11px; letter-spacing:2px; color:#f97316; font-weight:600; margin:0 0 6px;">央北社宅 · 講師課後成果報告</p>
      <h1 style="font-size:26px; font-weight:700; margin:0; color:#1a1a1a;">${esc(r.title)}</h1>
      <p style="font-size:13px; color:#78716c; margin:8px 0 0;">${esc(r.date)}${timeRange ? ' ' + esc(timeRange) : ''}${r.location ? ' · ' + esc(r.location) : ''}</p>
    </div>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px;">
      <tr>
        <td style="width:110px; color:#a8a29e; padding:4px 0; vertical-align:top;">提交講師</td>
        <td style="padding:4px 0;">${esc(r.instructorName)}</td>
      </tr>
      ${r.coInstructorNames.length ? `<tr>
        <td style="color:#a8a29e; padding:4px 0; vertical-align:top;">合作講師</td>
        <td style="padding:4px 0;">${esc(r.coInstructorNames.join('、'))}</td>
      </tr>` : ''}
      <tr>
        <td style="color:#a8a29e; padding:4px 0; vertical-align:top;">活動參與人數</td>
        <td style="padding:4px 0;">${esc(String(r.participant_count))}</td>
      </tr>
    </table>
    <div style="margin-bottom:20px;">
      <p style="font-size:12px; color:#a8a29e; font-weight:600; margin:0 0 6px;">活動簡介</p>
      <p style="font-size:14px; line-height:1.8; margin:0; white-space:pre-wrap;">${nl2br(r.summary) || '（未填寫）'}</p>
    </div>
    <div style="margin-bottom:20px;">
      <p style="font-size:12px; color:#a8a29e; font-weight:600; margin:0 0 6px;">心得感想</p>
      <p style="font-size:14px; line-height:1.8; margin:0; white-space:pre-wrap;">${nl2br(r.reflection) || '（未填寫）'}</p>
    </div>
    <p style="font-size:11px; color:#d6d3d1; margin-top:40px;">提交時間：${esc(r.submitted_at)}　·　簽到表照片 ${r.signin_photo_urls.length} 張、活動紀錄照片 ${r.photo_urls.length} 張，另附於同一份匯出檔案內</p>
  `
  document.body.appendChild(wrap)
  return wrap
}

// html2canvas 把排版截圖成一張長圖，再用 jsPDF 依 A4 頁高切成多頁貼上——
// 這樣完全不用煩惱中文字型嵌入 PDF 的問題（PDF 裡的文字其實是圖片），排版跟畫面看到的一致
export async function buildReportPdfBlob(r: ExportableReport): Promise<Blob> {
  const node = buildReportNode(r)
  try {
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfPageHeight = pdf.internal.pageSize.getHeight()
    const ratio = pdfWidth / canvas.width
    const pageHeightPx = pdfPageHeight / ratio

    let renderedHeight = 0
    let page = 0
    while (renderedHeight < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeight)
      const sliceCanvas = document.createElement('canvas')
      sliceCanvas.width = canvas.width
      sliceCanvas.height = sliceHeightPx
      const ctx = sliceCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)
      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92)
      if (page > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, sliceHeightPx * ratio)
      renderedHeight += sliceHeightPx
      page++
    }
    return pdf.output('blob')
  } finally {
    document.body.removeChild(node)
  }
}

function safeFolderName(s: string) {
  return s.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 60) || '未命名課程'
}

function extFromUrl(url: string) {
  const clean = url.split('?')[0]
  const ext = clean.split('.').pop()
  return ext && ext.length <= 5 ? ext : 'jpg'
}

async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

async function addPhotosToFolder(folder: JSZip, urls: string[], prefix: string): Promise<number> {
  let failed = 0
  for (let i = 0; i < urls.length; i++) {
    const buf = await fetchAsArrayBuffer(urls[i])
    if (buf) {
      folder.file(`${prefix}${i + 1}.${extFromUrl(urls[i])}`, buf)
    } else {
      failed++
    }
  }
  return failed
}

async function addCourseReportToZip(zip: JSZip, r: ExportableReport): Promise<number> {
  const root = zip.folder(safeFolderName(`${r.date}_${r.title}`))!
  const pdfBlob = await buildReportPdfBlob(r)
  root.file('成果報告.pdf', pdfBlob)
  let failed = 0
  failed += await addPhotosToFolder(root.folder('簽到表照片')!, r.signin_photo_urls, '簽到表')
  failed += await addPhotosToFolder(root.folder('花絮照片')!, r.photo_urls, '花絮')
  return failed
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function exportSingleCourseReport(r: ExportableReport): Promise<ExportResult> {
  const zip = new JSZip()
  const failedPhotoCount = await addCourseReportToZip(zip, r)
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${safeFolderName(`${r.date}_${r.title}`)}.zip`)
  return { failedPhotoCount }
}

export async function exportBatchCourseReports(reports: ExportableReport[], zipName: string): Promise<ExportResult> {
  const zip = new JSZip()
  let failedPhotoCount = 0
  for (const r of reports) {
    failedPhotoCount += await addCourseReportToZip(zip, r)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${safeFolderName(zipName)}.zip`)
  return { failedPhotoCount }
}
