'use client'

import { useEffect, useRef, useState } from 'react'

// ── 課程海報編輯器：桌機版／手機版共用的常數與繪製邏輯 ──────────────────────────────
// （色彩研究、字體清單、Canvas 繪製演算法只維護這一份，避免兩版分岔）

export interface PosterCourseData {
  id?: string
  title: string
  instructor?: string
  date?: string
  timeStart?: string
  timeEnd?: string
  location?: string
  suitableAge?: string
  notes?: string
}

// ── colour helpers ─────────────────────────────────────────────────────────────
export function lum(hex: string) {
  const r = parseInt(hex.slice(1,3),16)/255
  const g = parseInt(hex.slice(3,5),16)/255
  const b = parseInt(hex.slice(5,7),16)/255
  const lin = (c: number) => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4)
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b)
}
export function textCol(bg: string) { return lum(bg) > 0.35 ? '#111111' : '#ffffff' }

// ── 主視覺色彩：2026 年度流行色（Pantone／WGSN·Coloro 趨勢色彙整，刻意跨色相避開相近色）──
// 固定黑、白置於倒數兩個，最後一個為自訂色（+）
export const SCHEMES = [
  { id: 'lava',    label: '熔岩橘',   bg: '#C13A1F' }, // Lava Falls（Pantone 2026 亮色）
  { id: 'amber',   label: '琥珀金',   bg: '#D4A017' }, // Amber Haze（Coloro SS26 關鍵色）
  { id: 'sage',    label: '鼠尾草綠', bg: '#8A9A6B' }, // Sage Green（2026 大地色系）
  { id: 'mint',    label: '果凍薄荷', bg: '#3FBE8B' }, // Jelly Mint（Coloro SS26 關鍵色）
  { id: 'teal',    label: '蛻變藍綠', bg: '#1F6B72' }, // Transformative Teal（WGSN×Coloro 2026 年度色）
  { id: 'aura',    label: '靜謐藍',   bg: '#7C9FD9' }, // Blue Aura（Coloro SS26 關鍵色）
  { id: 'alex',    label: '紫水晶',   bg: '#6E4E85' }, // Alexandrite（Pantone 2026 亮色）
  { id: 'fuchsia', label: '電光桃紅', bg: '#D6308F' }, // Electric Fuchsia（Coloro SS26 關鍵色）
  { id: 'cocoa',   label: '可可棕',   bg: '#5C4033' }, // Cocoa Powder（2026 大地色系）
  { id: 'angora',  label: '安哥拉駝', bg: '#C9A876' }, // Angora（2026 大地色系）
  { id: 'cloud',   label: '雲舞灰',   bg: '#B5AFA3' }, // Cloud Dancer 延伸中性灰（Pantone 2026 年度色）
  { id: 'black',   label: '黑',       bg: '#111111' },
  { id: 'white',   label: '白',       bg: '#ffffff' },
]

// 手機版主視覺色彩：畫面空間有限，只精選 4 色（跨色相）+ 黑白，數量與桌機版不同
export const SCHEMES_MOBILE = SCHEMES.filter(s => ['lava','mint','aura','fuchsia','black','white'].includes(s.id))

// ── fonts（原 4 中 + 4 英，額外補上熱門 Google Fonts 各 4 款，共 8+8）──────────────
export const ZH_FONTS = [
  { label: 'Noto Sans TC',        value: "'Noto Sans TC', sans-serif",        gf: 'Noto+Sans+TC:wght@300;400;500;700' },
  { label: 'Zen Kaku Gothic New', value: "'Zen Kaku Gothic New', sans-serif", gf: 'Zen+Kaku+Gothic+New:wght@400;500;700;900' },
  { label: 'Noto Serif TC',       value: "'Noto Serif TC', serif",            gf: 'Noto+Serif+TC:wght@300;400;500;700' },
  { label: 'Zen Maru Gothic',     value: "'Zen Maru Gothic', sans-serif",     gf: 'Zen+Maru+Gothic:wght@300;400;500;700' },
  { label: 'cwTeX Kai',           value: "'cwTeX Kai', serif",                gf: 'cwTeX+Kai' },
  { label: 'cwTeX Yen',           value: "'cwTeX Yen', sans-serif",           gf: 'cwTeX+Yen' },
  { label: 'Klee One',            value: "'Klee One', sans-serif",            gf: 'Klee+One:wght@400;600' },
  { label: 'Zen Old Mincho',      value: "'Zen Old Mincho', serif",           gf: 'Zen+Old+Mincho:wght@400;500;600;700' },
]
export const EN_FONTS = [
  { label: 'Outfit',              value: "'Outfit', sans-serif",                            gf: 'Outfit:wght@300;400;500;700' },
  { label: 'Space Mono',          value: "'Space Mono', monospace",                          gf: 'Space+Mono:wght@400;700' },
  { label: 'Helvetica',           value: "'Helvetica Neue', Helvetica, Arial, sans-serif",   gf: '' },
  { label: 'Betania Patmos',      value: "'Betania Patmos', 'Playfair Display', serif",      gf: 'Playfair+Display:wght@400;700' },
  { label: 'Space Grotesk',       value: "'Space Grotesk', sans-serif",                      gf: 'Space+Grotesk:wght@300;400;500;700' },
  { label: 'Instrument Serif',    value: "'Instrument Serif', serif",                        gf: 'Instrument+Serif' },
  { label: 'DM Sans',             value: "'DM Sans', sans-serif",                            gf: 'DM+Sans:wght@300;400;500;700' },
  { label: 'Bricolage Grotesque', value: "'Bricolage Grotesque', sans-serif",                gf: 'Bricolage+Grotesque:wght@300;400;500;700' },
]

// 字體大小 dropdown 選項（手機版用；桌機版仍為滑桿，數值互通）
export const ZH_SIZE_OPTIONS = [13, 15, 17, 19, 21, 24, 28]
export const EN_SIZE_OPTIONS = [7, 8, 9, 10, 11, 12, 14]

// Load all Google Fonts once (no hooks in loops)
export function loadAllGoogleFonts() {
  const allGf = [...ZH_FONTS, ...EN_FONTS].map(f => f.gf).filter(Boolean)
  allGf.forEach(gfParam => {
    const id = `gf-${gfParam.replace(/[^a-z0-9]/gi,'')}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${gfParam}&display=swap`
    document.head.appendChild(link)
  })
}

// ── dot pattern ────────────────────────────────────────────────────────────────
export type DotShape = 'none' | 'circle' | 'star' | 'triangle' | 'heart' | 'custom'
export type DotCoverage = 'photo' | 'full'
export type DotArrangement = 'grid' | 'random'

export const DOT_SHAPES: { id: DotShape; label: string; symbol: string }[] = [
  { id: 'none',     label: '無',   symbol: '✕' },
  { id: 'circle',   label: '圓',   symbol: '●' },
  { id: 'star',     label: '星',   symbol: '★' },
  { id: 'triangle', label: '三角', symbol: '▲' },
  { id: 'heart',    label: '愛心', symbol: '♥' },
  { id: 'custom',   label: '文字', symbol: 'A' },
]

export function seededRandom(seed: number) {
  let s = seed
  return () => { s = (s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff }
}

function renderDotShape(
  shape: DotShape, customChar: string,
  x: number, y: number, size: number,
  fill: string, opacity: number, key: string
) {
  const op = opacity/100
  if (shape === 'none') return null
  if (shape === 'circle') return <circle key={key} cx={x} cy={y} r={size/2} fill={fill} opacity={op} />
  if (shape === 'star') {
    const pts = Array.from({length:5}).map((_,i) => {
      const a=(i*72-90)*Math.PI/180; const b=(i*72-90+36)*Math.PI/180
      const ro=size/2, ri=size/4.5
      return `${x+ro*Math.cos(a)},${y+ro*Math.sin(a)} ${x+ri*Math.cos(b)},${y+ri*Math.sin(b)}`
    }).join(' ')
    return <polygon key={key} points={pts} fill={fill} opacity={op} />
  }
  if (shape === 'triangle') {
    const h = size*0.866
    return <polygon key={key} points={`${x},${y-h/2} ${x-size/2},${y+h/2} ${x+size/2},${y+h/2}`} fill={fill} opacity={op} />
  }
  if (shape === 'heart') {
    const s = size/16
    return <path key={key} transform={`translate(${x},${y}) scale(${s})`} d="M0-4 C0-9-8-9-8-4 C-8 0 0 7 0 7 C0 7 8 0 8-4 C8-9 0-9 0-4Z" fill={fill} opacity={op} />
  }
  const char = customChar.charAt(0) || 'A'
  return <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size} fill={fill} opacity={op} style={{userSelect:'none'}}>{char}</text>
}

export function DotPatternSvg({ shape, customChar, color, opacity, size, density, coverage, arrangement, seed, totalHeight, photoHeight, posterWidth }: {
  shape: DotShape; customChar: string; color: string; opacity: number
  size: number; density: number; coverage: DotCoverage; arrangement: DotArrangement; seed: number
  totalHeight: number; photoHeight: number; posterWidth: number
}) {
  if (shape === 'none') return null
  const W = posterWidth
  const H = coverage === 'full' ? totalHeight : photoHeight
  const gap = Math.max(size*1.4, (100-density)*0.75+size)
  const dots: React.ReactElement[] = []

  if (arrangement === 'grid') {
    const cols = Math.ceil(W/gap)+1, rows = Math.ceil(H/gap)+1
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      const offsetX = r%2===0 ? 0 : gap/2
      const el = renderDotShape(shape, customChar, c*gap+offsetX-gap/2, r*gap-gap/2, size, color, opacity, `d-${r}-${c}`)
      if (el) dots.push(el)
    }
  } else {
    const rng = seededRandom(seed), count = Math.floor((W*H)/(gap*gap)*1.2)
    for (let i=0; i<count; i++) {
      const el = renderDotShape(shape, customChar, rng()*W, rng()*H, size, color, opacity, `dr-${i}`)
      if (el) dots.push(el)
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg"
      style={{ position:'absolute', left:0, top:0, width:'100%', height: coverage==='full' ? `${totalHeight}px` : `${photoHeight}px`, pointerEvents:'none', zIndex:2 }}>
      {dots}
    </svg>
  )
}

// ── poster dimensions（A4：210×297）─────────────────────────────────────────────
export const POSTER_W = 210
export const POSTER_H = 297
export const PHOTO_H  = Math.round(POSTER_H * 0.639)  // ≈ 190
export const INFO_PAD = 16  // uniform 16px padding all sides in info zone

// ── 固定字重（原「粗細」選項已依需求移除，改用固定值）──────────────────────────────
export const TITLE_WEIGHT = 700
export const EN_WEIGHT = 500

// ── canvas helpers ────────────────────────────────────────────────────────────
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// 手動逐字繪製＋間距，確保跨瀏覽器一致的字距效果（不依賴 ctx.letterSpacing）
export function measureSpaced(ctx: CanvasRenderingContext2D, text: string, spacing: number): number {
  let w = 0
  for (const ch of text) w += ctx.measureText(ch).width + spacing
  return text.length ? w - spacing : 0
}
export function fillTextSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + spacing
  }
}

export function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxW: number, spacing = 0): string[] {
  const chars = text.split(''); const lines: string[] = []; let cur = ''
  for (const ch of chars) {
    const test = cur+ch
    if (measureSpaced(ctx, test, spacing) > maxW && cur) { lines.push(cur); cur=ch }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

export function drawDotsCanvas(ctx: CanvasRenderingContext2D, shape: DotShape, customChar: string, color: string, opacity: number, size: number, density: number, arrangement: DotArrangement, seed: number, W: number, H: number) {
  if (shape === 'none') return
  ctx.save(); ctx.globalAlpha = opacity/100
  const gap = Math.max(size*1.4, (100-density)*0.75+size)
  if (arrangement === 'grid') {
    const cols=Math.ceil(W/gap)+1, rows=Math.ceil(H/gap)+1
    for (let r=0; r<rows; r++) for (let c=0; c<cols; c++) {
      const offsetX = r%2===0 ? 0 : gap/2
      drawOneDot(ctx, shape, customChar, c*gap+offsetX-gap/2, r*gap-gap/2, size, color)
    }
  } else {
    const rng=seededRandom(seed), count=Math.floor((W*H)/(gap*gap)*1.2)
    for (let i=0; i<count; i++) drawOneDot(ctx, shape, customChar, rng()*W, rng()*H, size, color)
  }
  ctx.restore()
}

export function drawOneDot(ctx: CanvasRenderingContext2D, shape: DotShape, customChar: string, x: number, y: number, size: number, color: string) {
  ctx.fillStyle=color; ctx.strokeStyle=color
  if (shape==='circle') { ctx.beginPath(); ctx.arc(x,y,size/2,0,Math.PI*2); ctx.fill() }
  else if (shape==='star') {
    ctx.beginPath()
    for (let i=0; i<5; i++) {
      const a=(i*72-90)*Math.PI/180, b=(i*72-90+36)*Math.PI/180, ro=size/2, ri=size/4.5
      i===0 ? ctx.moveTo(x+ro*Math.cos(a),y+ro*Math.sin(a)) : ctx.lineTo(x+ro*Math.cos(a),y+ro*Math.sin(a))
      ctx.lineTo(x+ri*Math.cos(b),y+ri*Math.sin(b))
    }
    ctx.closePath(); ctx.fill()
  } else if (shape==='triangle') {
    const h=size*0.866; ctx.beginPath(); ctx.moveTo(x,y-h/2); ctx.lineTo(x-size/2,y+h/2); ctx.lineTo(x+size/2,y+h/2); ctx.closePath(); ctx.fill()
  } else if (shape==='heart') {
    ctx.save(); ctx.translate(x,y); ctx.scale(size/16,size/16); ctx.beginPath()
    ctx.moveTo(0,-4); ctx.bezierCurveTo(0,-9,-8,-9,-8,-4); ctx.bezierCurveTo(-8,0,0,7,0,7)
    ctx.bezierCurveTo(0,7,8,0,8,-4); ctx.bezierCurveTo(8,-9,0,-9,0,-4); ctx.closePath(); ctx.fill(); ctx.restore()
  } else {
    ctx.font=`${size}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'
    ctx.fillText(customChar.charAt(0)||'A', x, y)
  }
}

export function drawBorderText(ctx: CanvasRenderingContext2D, text: string, color: string, fontFamily: string, fontSize: number, letterSpacing: number, W: number, H: number) {
  const fs=fontSize, lsp=letterSpacing, margin=8, r=8
  ctx.save()
  ctx.globalAlpha=0.42; ctx.fillStyle=color
  ctx.font=`400 ${fs}px ${fontFamily}`
  ctx.textAlign='center'; ctx.textBaseline='middle'
  const charW=fs*0.6+lsp
  const rep=text.repeat(50)
  const chars=rep.split('')
  const arcLen=r*Math.PI/2
  const segA=H-margin-(margin+r)
  const segB=arcLen
  const segC=W-2*(margin+r)
  const segD=arcLen
  const segE=H-margin-(margin+r)
  const totalLen=segA+segB+segC+segD+segE
  let dist=0
  for (const ch of chars) {
    if (dist>=totalLen) break
    const d=dist+charW/2
    let x: number, y: number, angle: number
    if (d<segA) {
      x=margin; y=(H-margin)-d; angle=-Math.PI/2
    } else if (d<segA+segB) {
      const t=(d-segA)/segB
      const a=Math.PI+t*Math.PI/2
      x=(margin+r)+r*Math.cos(a); y=(margin+r)+r*Math.sin(a); angle=a+Math.PI/2
    } else if (d<segA+segB+segC) {
      x=margin+r+(d-segA-segB); y=margin; angle=0
    } else if (d<segA+segB+segC+segD) {
      const t=(d-segA-segB-segC)/segD
      const a=-Math.PI/2+t*Math.PI/2
      x=(W-margin-r)+r*Math.cos(a); y=(margin+r)+r*Math.sin(a); angle=a+Math.PI/2
    } else {
      x=W-margin; y=margin+r+(d-segA-segB-segC-segD); angle=Math.PI/2
    }
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.fillText(ch,0,0); ctx.restore()
    dist+=charW
  }
  ctx.restore()
}

export function drawIcon(ctx: CanvasRenderingContext2D, type: 'place'|'person', x: number, y: number, size: number, color: string) {
  ctx.save(); ctx.fillStyle=color
  ctx.translate(x-size/2, y-size/2)
  const s=size/24; ctx.scale(s,s)
  if (type==='place') {
    ctx.fill(new Path2D('M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'))
  } else {
    ctx.fill(new Path2D('M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'))
  }
  ctx.restore()
}

// ── 匯出 PNG（桌機／手機共用同一份繪製邏輯，確保輸出結果一致）───────────────────────
export interface ExportPosterParams {
  course: PosterCourseData
  activeBg: string; tc: string; enTc: string; iconColor: string
  dotFill: string; dotOn: boolean; dotShape: DotShape; dotCustomChar: string
  dotOpacity: number; dotSize: number; dotDensity: number
  dotCoverage: DotCoverage; dotArrangement: DotArrangement; dotSeed: number
  borderOn: boolean; borderText: string
  imgSrc: string | null; imgPos: { x:number; y:number }; imgScale: number
  enFontValue: string; zhFontValue: string
  zhFontSize: number; enFontSize: number
  zhLetterPx: number; enLetterPx: number
  locFontSize: number; borderFontSize: number; titleGap: number
}

export async function exportPosterPNG(p: ExportPosterParams) {
  await document.fonts.ready
  const SCALE=3
  const canvas=document.createElement('canvas')
  canvas.width=POSTER_W*SCALE; canvas.height=POSTER_H*SCALE
  const ctx=canvas.getContext('2d')!
  ctx.scale(SCALE,SCALE)
  const W=POSTER_W, H=POSTER_H, PH=PHOTO_H

  // background
  ctx.fillStyle=p.activeBg; ctx.fillRect(0,0,W,H)

  // photo zone (clipped)
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,PH); ctx.clip()
  if (p.imgSrc) {
    const img=await new Promise<HTMLImageElement>((res,rej)=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=p.imgSrc! })
    const iw=img.naturalWidth, ih=img.naturalHeight
    const containScale=Math.min(W/iw, PH/ih)
    const scaledW=iw*containScale*p.imgScale, scaledH=ih*containScale*p.imgScale
    ctx.drawImage(img, W/2-scaledW/2+p.imgPos.x, PH/2-scaledH/2+p.imgPos.y, scaledW, scaledH)
  } else {
    ctx.fillStyle='#d6d3d1'; ctx.fillRect(0,0,W,PH)
  }
  // dots on photo
  if (p.dotOn && p.dotCoverage==='photo') drawDotsCanvas(ctx,p.dotShape,p.dotCustomChar,p.dotFill,p.dotOpacity,p.dotSize,p.dotDensity,p.dotArrangement,p.dotSeed,W,PH)
  // border text
  if (p.borderOn && p.borderText) drawBorderText(ctx,p.borderText,p.enTc,p.enFontValue,p.borderFontSize,p.enLetterPx,W,PH)
  // SEED COURSE tag — photo zone top-left, 16px from edges
  const tagText='SEED COURSE'
  ctx.font=`700 7px ${p.enFontValue}`
  const tagW=measureSpaced(ctx,tagText,p.enLetterPx)+14
  const tagBgC = lum(p.activeBg)>0.35 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)'
  const tagBdC = lum(p.activeBg)>0.35 ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.35)'
  ctx.fillStyle=tagBgC; roundRect(ctx,INFO_PAD,INFO_PAD,tagW,14,7); ctx.fill()
  ctx.strokeStyle=tagBdC; ctx.lineWidth=0.5; roundRect(ctx,INFO_PAD,INFO_PAD,tagW,14,7); ctx.stroke()
  ctx.fillStyle=p.enTc; ctx.textAlign='left'; fillTextSpaced(ctx,tagText,INFO_PAD+7,INFO_PAD+9.5,p.enLetterPx)
  ctx.restore()

  // full-coverage dots (no clip)
  if (p.dotOn && p.dotCoverage==='full') drawDotsCanvas(ctx,p.dotShape,p.dotCustomChar,p.dotFill,p.dotOpacity,p.dotSize,p.dotDensity,p.dotArrangement,p.dotSeed,W,H)

  // divider
  ctx.fillStyle=lum(p.activeBg)>0.35 ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.25)'
  ctx.fillRect(INFO_PAD,PH,W-INFO_PAD*2,0.5)

  // info zone — 16px padding, NO clip so content flows freely
  ctx.save()
  const timeBgC=lum(p.activeBg)>0.35 ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.18)'
  const maxTitleW=W-INFO_PAD*2

  let cy=PH+INFO_PAD

  // title
  let titleSize=p.zhFontSize
  ctx.font=`${TITLE_WEIGHT} ${titleSize}px ${p.zhFontValue}`
  const titleStr=p.course.title||'課程名稱'
  while (titleSize>10 && measureSpaced(ctx,titleStr,p.zhLetterPx*(titleSize/p.zhFontSize))>maxTitleW) { titleSize-=0.5; ctx.font=`${TITLE_WEIGHT} ${titleSize}px ${p.zhFontValue}` }
  const titleLines=wrapCanvasText(ctx,titleStr,maxTitleW,p.zhLetterPx)
  ctx.fillStyle=p.tc; ctx.textAlign='left'
  titleLines.slice(0,3).forEach((line,i)=>{ fillTextSpaced(ctx,line,INFO_PAD,cy+titleSize+i*titleSize*1.3,p.zhLetterPx) })
  cy+=titleSize*1.3*Math.min(titleLines.length,3)+p.titleGap

  // time badge
  if (p.course.timeStart||p.course.timeEnd||p.course.date) {
    const timeParts=[p.course.date||'',(p.course.date&&(p.course.timeStart||p.course.timeEnd))?'·':'',p.course.timeStart||'',p.course.timeEnd?`– ${p.course.timeEnd}`:''].filter(Boolean).join(' ')
    ctx.font=`${EN_WEIGHT} ${p.enFontSize}px ${p.enFontValue}`
    const tw=measureSpaced(ctx,timeParts,p.enLetterPx)+10
    ctx.fillStyle=timeBgC; roundRect(ctx,INFO_PAD,cy,tw,p.enFontSize+7,4); ctx.fill()
    ctx.fillStyle=p.enTc; fillTextSpaced(ctx,timeParts,INFO_PAD+5,cy+p.enFontSize+2,p.enLetterPx)
    cy+=p.enFontSize+11
  }
  // location
  if (p.course.location) {
    ctx.save(); ctx.globalAlpha=0.82
    drawIcon(ctx,'place',INFO_PAD+5,cy+9,11,p.iconColor)
    ctx.restore()
    ctx.font=`400 ${p.locFontSize}px ${p.zhFontValue}`; ctx.fillStyle=p.tc; ctx.globalAlpha=0.82
    wrapCanvasText(ctx,p.course.location,maxTitleW-14,p.zhLetterPx).forEach((line,i)=>{ fillTextSpaced(ctx,line,INFO_PAD+14,cy+10+i*13,p.zhLetterPx) })
    cy+=13+2; ctx.globalAlpha=1
  }
  // instructor
  if (p.course.instructor) {
    ctx.save(); ctx.globalAlpha=0.62
    drawIcon(ctx,'person',INFO_PAD+5,cy+9,11,p.iconColor)
    ctx.restore()
    ctx.font=`400 ${p.locFontSize}px ${p.zhFontValue}`; ctx.fillStyle=p.tc; ctx.globalAlpha=0.62
    fillTextSpaced(ctx,p.course.instructor,INFO_PAD+14,cy+10,p.zhLetterPx); ctx.globalAlpha=1
  }
  ctx.restore()

  const filename = `${p.course.title||'poster'}.png`
  const blob: Blob | null = await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'))
  if (!blob) throw new Error('canvas toBlob failed')

  // 手機瀏覽器（尤其 iOS Safari）不支援 <a download>，改用 Web Share API 讓使用者存到相簿；
  // 桌機或不支援分享檔案的瀏覽器則 fallback 回傳統下載連結
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean; share?: (data: ShareData) => Promise<void> }
  const file = new File([blob], filename, { type: 'image/png' })
  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename })
      return
    } catch (_e) {
      // 使用者取消分享，或分享失敗 → 繼續走下載 fallback
    }
  }
  const url = URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url; a.download=filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ── 小型共用 UI ────────────────────────────────────────────────────────────────
export function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
export function MinusIcon({ className }: { className?: string }) {
  return <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
}
export function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
}

// 滑桿底色（Figma node 320-10040 更新版：軌道底色 #bfbfbf、已填色段 brand/primary）
export function sliderTrackStyle(value: number, min: number, max: number): React.CSSProperties {
  const pct = max>min ? ((value-min)/(max-min))*100 : 0
  return {
    background: `linear-gradient(to right, #f97316 0%, #f97316 ${pct}%, #bfbfbf ${pct}%, #bfbfbf 100%)`,
  }
}

export function SliderRow({ label, min, max, step, value, onChange, unit, decimals }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v:number)=>void; unit: string; decimals?: number
}) {
  return (
    <div className="bg-stone-100 rounded-lg px-2 py-1 w-full">
      <p className="text-[11px] text-stone-500 mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))} className="poster-slider flex-1 accent-orange-500 h-5"
          style={sliderTrackStyle(value, min, max)} />
        <span className="text-[11px] font-medium text-orange-600 w-8 text-right shrink-0">
          {decimals!==undefined ? value.toFixed(decimals) : value}{unit}
        </span>
      </div>
    </div>
  )
}

// ── 統一的顏色選擇 Dropdown（字體顏色／裝飾點顏色共用同一元件，裝飾點多顯示 hex）───────
export function ColorPickerDropdown({ value, onChange, showHex, label, options }: {
  value: string; onChange: (v: string) => void; showHex?: boolean; label: string
  options?: { bg: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocPointer = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointer)
    return () => document.removeEventListener('pointerdown', onDocPointer)
  }, [open])

  const swatches = options || SCHEMES.map(s => ({ bg: s.bg, label: s.label }))

  return (
    <div ref={wrapRef} className="relative">
      <button type="button" aria-label={label} onClick={() => setOpen(v => !v)}
        className="w-full h-9 flex items-center gap-1.5 px-2 border border-stone-200 rounded-md bg-white">
        <span className="w-5 h-5 rounded shrink-0 border border-black/10" style={{ background: value }} />
        {showHex && <span className="text-xs text-stone-500 flex-1 text-left truncate">{value.toUpperCase()}</span>}
        <ChevronDownIcon className={`text-stone-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${showHex ? '' : 'ml-auto'}`} />
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 bg-white border border-stone-200 rounded-xl shadow-lg p-2.5 w-[184px]">
          <div className="grid grid-cols-5 gap-2 mb-2.5">
            {swatches.map(s => (
              <button key={s.bg} type="button" title={s.label} onClick={() => { onChange(s.bg); setOpen(false) }}
                className="rounded-full aspect-square transition-transform active:scale-95"
                style={{ background: s.bg, outline: value.toLowerCase()===s.bg.toLowerCase() ? '2px solid #f97316' : '1px solid rgba(0,0,0,0.09)', outlineOffset:'1px' }} />
            ))}
          </div>
          <label className="flex items-center gap-2 border-t border-stone-100 pt-2.5 cursor-pointer">
            <span className="relative w-6 h-6 rounded-md border border-stone-200 overflow-hidden shrink-0">
              <span className="absolute inset-0" style={{ background: value }} />
              <input type="color" value={value} onChange={e => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </span>
            <span className="text-xs text-stone-500">自訂顏色…</span>
          </label>
        </div>
      )}
    </div>
  )
}
