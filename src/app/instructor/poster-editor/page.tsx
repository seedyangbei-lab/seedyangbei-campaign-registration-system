'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  PosterCourseData, lum, textCol, SCHEMES_MOBILE, ZH_FONTS, EN_FONTS, ZH_SIZE_OPTIONS, EN_SIZE_OPTIONS, loadAllGoogleFonts,
  DotShape, DotCoverage, DotArrangement, DOT_SHAPES, DotPatternSvg,
  POSTER_W, POSTER_H, PHOTO_H, INFO_PAD, TITLE_WEIGHT, EN_WEIGHT,
  exportPosterPNG, MinusIcon, PlusIcon, sliderTrackStyle, SliderRow, ColorPickerDropdown, SizeSelect, FontSelectDropdown,
} from '@/components/posterEditor/shared'

// ── 小型共用 UI（手機版專用） ──────────────────────────────────────────────────
function BackArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
function PlusThinIcon({ className }: { className?: string }) {
  return <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
}
function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  )
}
function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-label="切換" className="relative rounded-full transition-colors shrink-0"
      style={{ height:'20px', width:'36px', background:on?'#f97316':'#d1d5db' }}>
      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width:'16px', height:'16px', left:on?'18px':'2px' }} />
    </button>
  )
}
// ── 主要編輯器（手機版頁面） ────────────────────────────────────────────────────
function PosterEditorMobile({ course, photos }: { course: PosterCourseData; photos: string[] }) {
  const router = useRouter()
  const storageKey = 'yangbei-poster-settings:global' // 全域共用：只保留「最後一次儲存設定」，不分課程

  const [imgSrc, setImgSrc]     = useState<string|null>(photos[0] || null)
  const [imgPos, setImgPos]     = useState({ x:0, y:0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx:0, my:0, px:0, py:0 })

  const [scheme, setScheme]   = useState(SCHEMES_MOBILE[0])
  const [customBg, setCustomBg] = useState('')

  const [activeTab, setActiveTab] = useState<'字體設定'|'裝飾'>('字體設定')

  const [dotShape, setDotShape]             = useState<DotShape>('circle')
  const dotShapeMemory = useRef<DotShape>('circle')
  const [dotCustomChar, setDotCustomChar]   = useState('央')
  const [dotColor, setDotColor]             = useState('')
  const [dotOpacity, setDotOpacity]         = useState(30)
  const [dotSize, setDotSize]               = useState(6)
  const [dotDensity, setDotDensity]         = useState(50)
  const [dotCoverage, setDotCoverage]       = useState<DotCoverage>('photo')
  const [dotArrangement, setDotArrangement] = useState<DotArrangement>('grid')
  const [dotSeed, setDotSeed]               = useState(42)

  const [textColorOverride, setTextColorOverride]     = useState('')
  const [enTextColorOverride, setEnTextColorOverride] = useState('')
  const [borderOn, setBorderOn] = useState(true)
  const [borderText, setBorderText] = useState('YANGBEI COMMUNITY · SEED COURSE · ')

  const [zhFontIdx, setZhFontIdx] = useState(0)
  const [enFontIdx, setEnFontIdx] = useState(0)
  const [zhFontSize, setZhFontSize] = useState(17)
  const [enFontSize, setEnFontSize] = useState(9)

  const [letterSpacingPct, setLetterSpacingPct] = useState(2)
  const [lineSpacingMult, setLineSpacingMult]   = useState(1.5)

  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const sliderColRef = useRef<HTMLDivElement>(null)
  const [sliderAreaHeight, setSliderAreaHeight] = useState(160)
  const colorStripRef = useRef<HTMLDivElement>(null)
  const [colorStripHeight, setColorStripHeight] = useState(220)

  useEffect(() => { loadAllGoogleFonts() }, [])

  // 禁止頁面左右滑動：直接作用在 body 上，避免用一個帶 overflow 的祖先 div 包住整棵樹
  // （那樣會讓 sticky 的捲動祖先變成該 div，導致 sticky 失效）
  useEffect(() => {
    const prev = document.body.style.overflowX
    document.body.style.overflowX = 'hidden'
    return () => { document.body.style.overflowX = prev }
  }, [])

  // ── 讀取上次「儲存設定」──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.schemeId) { const found = SCHEMES_MOBILE.find((x:any)=>x.id===s.schemeId); if (found) setScheme(found) }
      if (typeof s.customBg === 'string') setCustomBg(s.customBg)
      if (typeof s.dotShape === 'string') setDotShape(s.dotShape)
      if (typeof s.dotCustomChar === 'string') setDotCustomChar(s.dotCustomChar)
      if (typeof s.dotColor === 'string') setDotColor(s.dotColor)
      if (typeof s.dotOpacity === 'number') setDotOpacity(s.dotOpacity)
      if (typeof s.dotSize === 'number') setDotSize(s.dotSize)
      if (typeof s.dotDensity === 'number') setDotDensity(s.dotDensity)
      if (typeof s.dotCoverage === 'string') setDotCoverage(s.dotCoverage)
      if (typeof s.dotArrangement === 'string') setDotArrangement(s.dotArrangement)
      if (typeof s.textColorOverride === 'string') setTextColorOverride(s.textColorOverride)
      if (typeof s.enTextColorOverride === 'string') setEnTextColorOverride(s.enTextColorOverride)
      if (typeof s.borderOn === 'boolean') setBorderOn(s.borderOn)
      if (typeof s.borderText === 'string') setBorderText(s.borderText)
      if (typeof s.zhFontIdx === 'number') setZhFontIdx(s.zhFontIdx)
      if (typeof s.enFontIdx === 'number') setEnFontIdx(s.enFontIdx)
      if (typeof s.zhFontSize === 'number') setZhFontSize(s.zhFontSize)
      if (typeof s.enFontSize === 'number') setEnFontSize(s.enFontSize)
      if (typeof s.letterSpacingPct === 'number') setLetterSpacingPct(s.letterSpacingPct)
      if (typeof s.lineSpacingMult === 'number') setLineSpacingMult(s.lineSpacingMult)
    } catch (_e) { /* ignore malformed cache */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveSettings = () => {
    const payload = {
      schemeId: scheme.id, customBg,
      dotShape, dotCustomChar, dotColor, dotOpacity, dotSize, dotDensity, dotCoverage, dotArrangement,
      textColorOverride, enTextColorOverride, borderOn, borderText,
      zhFontIdx, enFontIdx, zhFontSize, enFontSize, letterSpacingPct, lineSpacingMult,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    } catch (_e) { /* localStorage 不可用時靜默略過 */ }
  }

  // 手機版：海報以左側色彩選擇欄的高度為準縮放（三欄等高），寬度僅作為上限
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => setPreviewScale(Math.min(el.clientWidth/POSTER_W, colorStripHeight/POSTER_H))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [colorStripHeight])

  // 量測左側色彩選擇欄的實際高度
  useEffect(() => {
    const el = colorStripRef.current
    if (!el) return
    const update = () => setColorStripHeight(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 直式 zoom slider：量測右側欄可用高度（fill 到變更圖片按鈕上方）
  useEffect(() => {
    const el = sliderColRef.current
    if (!el) return
    const update = () => setSliderAreaHeight(el.clientHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const activeBg  = customBg || scheme.bg
  const tc        = textColorOverride   || textCol(activeBg)
  const enTc      = enTextColorOverride || tc
  const dotOn     = dotShape !== 'none'
  const dotFill   = dotColor || activeBg
  const iconColor = dotColor || tc
  const zhFont    = ZH_FONTS[zhFontIdx]
  const enFont    = EN_FONTS[enFontIdx]

  const zhLetterPx  = zhFontSize * (letterSpacingPct/100)
  const enLetterPx  = enFontSize * (letterSpacingPct/100)
  const locFontSize = Math.max(8, Math.round(zhFontSize*0.53))
  const borderFontSize = Math.max(4, +(enFontSize*0.61).toFixed(1))
  const titleGap    = Math.round(6 * lineSpacingMult)

  const tagBg     = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.12)'  : 'rgba(255,255,255,0.22)'
  const tagBorder = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.20)'  : 'rgba(255,255,255,0.35)'
  const timeBg    = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.09)'  : 'rgba(255,255,255,0.18)'
  const divider   = lum(activeBg)>0.35 ? 'rgba(0,0,0,0.15)'  : 'rgba(255,255,255,0.25)'

  const scaledW = POSTER_W * previewScale
  const scaledH = POSTER_H * previewScale

  // ── drag（拖曳照片位置）─────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imgSrc) return
    const t=e.touches[0]; setIsDragging(true)
    dragStart.current = { mx:t.clientX, my:t.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const t=e.touches[0]
    setImgPos({ x:dragStart.current.px+t.clientX-dragStart.current.mx, y:dragStart.current.py+t.clientY-dragStart.current.my })
  }, [isDragging])
  const onTouchEnd = useCallback(() => setIsDragging(false), [])
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return; e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx:e.clientX, my:e.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x:dragStart.current.px+e.clientX-dragStart.current.mx, y:dragStart.current.py+e.clientY-dragStart.current.my })
  }, [isDragging])
  const onMouseUp = useCallback(() => setIsDragging(false), [])

  // ── 上傳 / 變更圖片 ────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if (!file) return
    const reader=new FileReader()
    reader.onload = ev => { setImgSrc(ev.target?.result as string); setImgPos({x:0,y:0}); setImgScale(1); setShowPhotoPicker(false) }
    reader.readAsDataURL(file)
  }
  const pickPhoto = (url: string) => {
    setImgSrc(url); setImgPos({x:0,y:0}); setImgScale(1); setShowPhotoPicker(false)
  }

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await exportPosterPNG({
        course, activeBg, tc, enTc, iconColor,
        dotFill, dotOn, dotShape, dotCustomChar, dotOpacity, dotSize, dotDensity, dotCoverage, dotArrangement, dotSeed,
        borderOn, borderText,
        imgSrc, imgPos, imgScale,
        enFontValue: enFont.value, zhFontValue: zhFont.value,
        zhFontSize, enFontSize, zhLetterPx, enLetterPx, locFontSize, borderFontSize, titleGap,
      })
    } catch (_e) { console.error('export failed',_e) }
    finally { setIsExporting(false) }
  }, [activeBg,tc,enTc,iconColor,dotFill,dotOn,dotShape,dotCustomChar,dotOpacity,dotSize,dotDensity,dotCoverage,dotArrangement,dotSeed,borderOn,borderText,imgSrc,imgPos,imgScale,enFont,zhFont,zhFontSize,enFontSize,zhLetterPx,enLetterPx,locFontSize,borderFontSize,titleGap,course])

  return (
    <div className="min-h-screen bg-[#fafaf9] pb-[104px]">
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-white h-[52px] px-4 flex items-center shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
        <button onClick={()=>router.push('/instructor')} aria-label="返回" className="w-6 h-6 flex items-center justify-center shrink-0 text-stone-600">
          <BackArrowIcon />
        </button>
        <p className="flex-1 text-center text-sm font-bold tracking-[3px] text-stone-600">課程海報編輯器</p>
        <div className="w-6 h-6 shrink-0" />
      </div>

      {/* 預覽區：sticky 貼在 navbar 下方，色彩選擇／海報／變更圖片三者等高（依 node 341-24687 auto-layout） */}
      <div className="sticky top-[52px] z-20 bg-white border-b border-t border-dashed border-orange-400 px-4 py-4 overflow-hidden"
        style={{ backgroundImage:'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)' }}>
        <div className="flex items-stretch gap-3 w-full">
          {/* 左：主視覺色彩直排 */}
          <div ref={colorStripRef} className="flex flex-col gap-2 bg-stone-100 rounded-xl p-1.5 shrink-0 w-[38px]">
            {SCHEMES_MOBILE.map(s=>(
              <button key={s.id} aria-label={s.label}
                onClick={()=>{ setScheme(s); setCustomBg('') }}
                className="rounded-full transition-transform active:scale-95 shrink-0"
                style={{ width:'26px', height:'26px', background:s.bg, outline:(!customBg&&scheme.id===s.id)?'2px solid #f97316':'2px solid transparent', outlineOffset:'2px',
                  boxShadow:s.id==='white'?'inset 0 0 0 1px rgba(0,0,0,0.15)':'0px 0px 0px 0.5px rgba(0,0,0,0.09)' }} />
            ))}
            <label className="rounded-md cursor-pointer flex items-center justify-center shrink-0 relative border border-stone-200 bg-white"
              style={{ width:'26px', height:'26px', outline:customBg?'2px solid #f97316':'none', outlineOffset:'2px' }}>
              <PlusThinIcon className="text-stone-500" />
              <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={customBg||scheme.bg} onChange={e=>setCustomBg(e.target.value)} />
            </label>
          </div>

          {/* 中：海報預覽 */}
          <div ref={stageRef} className="flex-1 min-w-0 flex items-center justify-center">
          <div style={{ width:scaledW, height:scaledH, position:'relative', flexShrink:0, overflow:'hidden', borderRadius:'12px', boxShadow:'0px 0px 12px 0px rgba(0,0,0,0.11)' }}>
            <div className="absolute top-0 left-0 origin-top-left" style={{ transform:`scale(${previewScale})`, width:POSTER_W, height:POSTER_H }}>
              <div className="relative select-none" style={{ width:POSTER_W, height:POSTER_H, backgroundColor:activeBg, overflow:'visible' }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

                {/* photo zone */}
                <div className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height:PHOTO_H, zIndex:1, touchAction:'none' }}>
                  {imgSrc ? (
                    <div style={{ position:'absolute', inset:0, overflow:'hidden' }}>
                      <img src={imgSrc} alt="" draggable={false} style={{
                        position:'absolute', width:'100%', height:'100%', objectFit:'contain',
                        transform:`translate(${imgPos.x}px,${imgPos.y}px) scale(${imgScale})`,
                        transformOrigin:'center center', pointerEvents:'none', userSelect:'none', zIndex:0,
                      }} />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-stone-200" style={{zIndex:0}}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                  )}

                  {dotOn && dotCoverage==='photo' && (
                    <DotPatternSvg shape={dotShape} customChar={dotCustomChar} color={dotFill}
                      opacity={dotOpacity} size={dotSize} density={dotDensity}
                      coverage="photo" arrangement={dotArrangement} seed={dotSeed}
                      totalHeight={POSTER_H} photoHeight={PHOTO_H} posterWidth={POSTER_W} />
                  )}

                  {borderOn && borderText && (
                    <svg viewBox={`0 0 ${POSTER_W} ${PHOTO_H}`} xmlns="http://www.w3.org/2000/svg"
                      style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3 }}>
                      <defs>
                        <path id="border-u-path-m"
                          d={`M 8,${PHOTO_H} L 8,16 Q 8,8 16,8 L ${POSTER_W-16},8 Q ${POSTER_W-8},8 ${POSTER_W-8},16 L ${POSTER_W-8},${PHOTO_H}`} />
                      </defs>
                      <text fontSize={borderFontSize} letterSpacing={enLetterPx} fill={enTc} opacity={0.42} fontFamily={enFont.value} dominantBaseline="middle">
                        <textPath href="#border-u-path-m" startOffset="0">{borderText.repeat(20)}</textPath>
                      </text>
                    </svg>
                  )}

                  <div style={{
                    position:'absolute', top:INFO_PAD, left:INFO_PAD, zIndex:10,
                    display:'inline-flex', alignItems:'center',
                    borderRadius:'20px', padding:'2px 7px',
                    background:tagBg, border:`0.5px solid ${tagBorder}`, color:enTc,
                    fontFamily:enFont.value, fontSize:'7px', letterSpacing:`${enLetterPx}px`, textTransform:'uppercase',
                  }}>SEED COURSE</div>
                </div>

                {dotOn && dotCoverage==='full' && (
                  <div className="absolute inset-0 overflow-hidden" style={{zIndex:2,pointerEvents:'none'}}>
                    <DotPatternSvg shape={dotShape} customChar={dotCustomChar} color={dotFill}
                      opacity={dotOpacity} size={dotSize} density={dotDensity}
                      coverage="full" arrangement={dotArrangement} seed={dotSeed}
                      totalHeight={POSTER_H} photoHeight={PHOTO_H} posterWidth={POSTER_W} />
                  </div>
                )}

                <div style={{ position:'absolute', left:INFO_PAD, right:INFO_PAD, top:PHOTO_H, height:'0.5px', background:divider, zIndex:4 }} />

                <div className="absolute left-0 right-0 flex flex-col" style={{ top:PHOTO_H, bottom:0, padding:INFO_PAD, overflow:'visible', zIndex:3 }}>
                  <div style={{
                    color:tc, fontWeight:TITLE_WEIGHT, lineHeight:1.3, marginBottom:`${titleGap}px`,
                    fontFamily:zhFont.value, fontSize:`${zhFontSize}px`, letterSpacing:`${zhLetterPx}px`, flexShrink:0,
                    overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical',
                  }}>
                    {course.title||'課程名稱'}
                  </div>

                  {(course.timeStart||course.timeEnd||course.date) && (
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:'3px', marginBottom:'4px', width:'fit-content',
                      borderRadius:'4px', padding:'2px 5px', background:timeBg,
                      fontFamily:enFont.value, fontWeight:EN_WEIGHT, fontSize:`${enFontSize}px`, color:enTc, letterSpacing:`${enLetterPx}px`,
                      flexShrink:0,
                    }}>
                      {course.date && <span>{course.date}</span>}
                      {course.date&&(course.timeStart||course.timeEnd) && <span style={{opacity:0.5,margin:'0 2px'}}>·</span>}
                      {course.timeStart && <span>{course.timeStart}</span>}
                      {course.timeEnd && <span> – {course.timeEnd}</span>}
                    </div>
                  )}

                  {course.location && (
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'4px', marginBottom:'4px', flexShrink:0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill={iconColor} stroke="none" aria-hidden="true" style={{flexShrink:0,marginTop:'1px',opacity:0.82}}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      <div style={{ color:tc, fontFamily:zhFont.value, fontSize:`${locFontSize}px`, letterSpacing:`${zhLetterPx}px`, opacity:0.82, lineHeight:1.4 }}>
                        {course.location}
                      </div>
                    </div>
                  )}

                  {course.instructor && (
                    <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:INFO_PAD, flexShrink:0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill={iconColor} stroke="none" aria-hidden="true" style={{flexShrink:0,opacity:0.62}}>
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                      <div style={{ color:tc, fontFamily:zhFont.value, fontSize:`${locFontSize}px`, letterSpacing:`${zhLetterPx}px`, opacity:0.62, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {course.instructor}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* 右：直式 zoom slider（+ 在上／- 在下，fill 到變更圖片按鈕，間距 16px）＋ 變更圖片 icon 按鈕 */}
          <div className="flex flex-col items-center gap-4 shrink-0 w-[38px]">
            <div className="flex-1 min-h-0 w-full flex flex-col items-center gap-1.5">
              <PlusIcon className="text-stone-400 shrink-0" />
              <div ref={sliderColRef} className="relative flex-1 w-full min-h-0">
                <input type="range" min="0.5" max="3" step="0.05" value={imgScale} onChange={e=>setImgScale(parseFloat(e.target.value))}
                  className="poster-slider"
                  style={{
                    position:'absolute', left:'50%', top:'50%', width:sliderAreaHeight,
                    transform:'translate(-50%, -50%) rotate(-90deg)',
                    ...sliderTrackStyle(imgScale, 0.5, 3),
                  }} />
              </div>
              <MinusIcon className="text-stone-400 shrink-0" />
            </div>
            <button onClick={()=>setShowPhotoPicker(true)} aria-label="變更圖片"
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-md border border-stone-200 bg-white hover:bg-stone-50 transition-colors">
              <PhotoIcon className="text-orange-500" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 space-y-4">
        {/* Tab bar */}
        <div className="flex gap-1 p-[5px] border border-stone-300 rounded-xl w-full">
          {(['字體設定','裝飾'] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${activeTab===t ? 'bg-orange-500 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === '字體設定' ? (
          <div className="space-y-4">
            {/* 中文字體設定 */}
            <section className="border border-stone-200 rounded-2xl p-4">
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-sm font-medium text-stone-600">中文字體設定</p>
                <p className="text-xs text-stone-400">標題 / 地點</p>
              </div>
              <div className="bg-stone-100 rounded-lg p-3 grid grid-cols-3 gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 mb-1">中文字體</p>
                  <FontSelectDropdown fonts={ZH_FONTS} value={zhFontIdx} onChange={setZhFontIdx} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 mb-1">顏色</p>
                  <ColorPickerDropdown label="中文字體顏色" value={tc} onChange={setTextColorOverride} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 mb-1">字體大小</p>
                  <SizeSelect value={zhFontSize} options={ZH_SIZE_OPTIONS} unit="pt" onChange={setZhFontSize} />
                </div>
              </div>
              {textColorOverride && <button onClick={()=>setTextColorOverride('')} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors mt-1.5">重設自動配色</button>}
            </section>

            {/* 英文字體設定 */}
            <section className="border border-stone-200 rounded-2xl p-4">
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-sm font-medium text-stone-600">英文字體設定</p>
                <p className="text-xs text-stone-400">時間 / 邊框裝飾</p>
              </div>
              <div className="bg-stone-100 rounded-lg p-3 grid grid-cols-3 gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 mb-1">英文字體</p>
                  <FontSelectDropdown fonts={EN_FONTS} value={enFontIdx} onChange={setEnFontIdx} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 mb-1">顏色</p>
                  <ColorPickerDropdown label="英文字體顏色" value={enTc} onChange={setEnTextColorOverride} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-stone-500 mb-1">字體大小</p>
                  <SizeSelect value={enFontSize} options={EN_SIZE_OPTIONS} unit="pt" onChange={setEnFontSize} />
                </div>
              </div>
              {enTextColorOverride && <button onClick={()=>setEnTextColorOverride('')} className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors mt-1.5">重設自動配色</button>}
            </section>

            {/* 間距定義 */}
            <section className="border border-stone-200 rounded-2xl p-4">
              <p className="text-sm font-medium text-stone-600 mb-3">間距定義</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-stone-400 mb-2">文字跟文字間的距離</p>
                  <SliderRow label="字距" min={0} max={10} step={0.5} value={letterSpacingPct} onChange={setLetterSpacingPct} unit="%" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-stone-400 mb-2">標題跟內文間的距離</p>
                  <SliderRow label="行距" min={0.5} max={3} step={0.1} value={lineSpacingMult} onChange={setLineSpacingMult} unit="" decimals={1} />
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 裝飾點 */}
            <section className="border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                <p className="text-sm font-medium text-stone-600">裝飾點</p>
                <ToggleSwitch on={dotOn} onToggle={()=>{
                  if (dotShape==='none') setDotShape(dotShapeMemory.current)
                  else { dotShapeMemory.current = dotShape; setDotShape('none') }
                }} />
              </div>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {DOT_SHAPES.map(d=>(
                  <button key={d.id} onClick={()=>setDotShape(d.id)}
                    className="flex flex-col items-center justify-center gap-1 h-14 rounded-md border transition-all"
                    style={{ border:dotShape===d.id?'1px solid #f97316':'1px solid #e7e5e4', background:dotShape===d.id?'#f97316':'#fff', color:dotShape===d.id?'#fff':'#78716c' }}>
                    <span className="text-sm leading-none">{d.symbol}</span>
                    <span className="text-[9px]">{d.label}</span>
                  </button>
                ))}
              </div>

              {dotShape!=='none' && (<>
                {dotShape==='custom' && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-stone-400 flex-shrink-0">自訂文字</span>
                    <input type="text" maxLength={1} value={dotCustomChar} onChange={e=>setDotCustomChar(e.target.value)}
                      className="w-10 text-center border border-stone-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm text-stone-500 flex-1">放置位置</p>
                  <div className="flex gap-2">
                    {(['photo','full'] as const).map(c=>(
                      <button key={c} onClick={()=>setDotCoverage(c)}
                        className="w-20 h-8 rounded-md text-xs font-medium transition-all"
                        style={ dotCoverage===c ? { background:'#f97316', color:'#fff' } : { background:'#fff', border:'1px solid #d6d3d1', color:'#57534e' } }>
                        {c==='photo'?'照片上':'滿版'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm text-stone-500 flex-1">排列方式</p>
                  <div className="flex gap-2">
                    {(['grid','random'] as const).map(a=>(
                      <button key={a} onClick={()=>{ setDotArrangement(a); if(a==='random') setDotSeed(s=>s+1) }}
                        className="w-20 h-8 rounded-md text-xs font-medium transition-all"
                        style={ dotArrangement===a ? { background:'#f97316', color:'#fff' } : { background:'#fff', border:'1px solid #d6d3d1', color:'#57534e' } }>
                        {a==='grid'?'整齊格狀':'隨機散落'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm text-stone-500 flex-1">裝飾點顏色</p>
                  <div className="w-[124px]">
                    <ColorPickerDropdown label="裝飾點顏色" value={dotFill} showHex onChange={setDotColor} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <SliderRow label="大小" min={2} max={24} step={0.5} value={dotSize} onChange={setDotSize} unit="px" />
                  <SliderRow label="透明度" min={5} max={100} step={1} value={dotOpacity} onChange={setDotOpacity} unit="%" />
                  <SliderRow label="密度" min={10} max={90} step={1} value={dotDensity} onChange={setDotDensity} unit="" />
                </div>
              </>)}
            </section>

            {/* 邊框英文裝飾 */}
            <section className="border border-stone-200 rounded-2xl p-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
                <p className="text-sm font-medium text-stone-600">邊框英文裝飾</p>
                <ToggleSwitch on={borderOn} onToggle={()=>setBorderOn(v=>!v)} />
              </div>
              <input type="text" value={borderText} onChange={e=>setBorderText(e.target.value)} placeholder="請輸入邊框裝飾英文字"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </section>
          </div>
        )}
      </div>

      {/* 變更圖片 picker（bottom sheet） */}
      {showPhotoPicker && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={e=>{ if (e.target===e.currentTarget) setShowPhotoPicker(false) }}>
          <div className="bg-white rounded-t-2xl w-full max-h-[70%] overflow-y-auto p-4 pb-6">
            <div className="w-10 h-1 rounded-full bg-stone-300 mx-auto mb-4" />
            <p className="text-sm font-medium text-stone-600 mb-3">選擇課程照片</p>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.slice(0,5).map((p,i)=>(
                <button key={i} onClick={()=>pickPhoto(p)}
                  className="aspect-square rounded-lg overflow-hidden border-2 transition-all"
                  style={{ borderColor: imgSrc===p ? '#f97316' : 'transparent' }}>
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button onClick={()=>fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-stone-300 rounded-xl py-2.5 text-sm text-stone-500 hover:border-orange-400 hover:text-orange-500 transition-colors">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              另外上傳新照片
            </button>
            <button onClick={()=>setShowPhotoPicker(false)} className="w-full text-center text-xs text-stone-400 hover:text-stone-600 mt-3 transition-colors">取消</button>
          </div>
        </div>
      )}

      {/* sticky 底部：儲存設定 ＋ 完成！匯出 PNG */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white rounded-t-2xl shadow-[0px_-3px_4px_0px_rgba(0,0,0,0.08)] p-4 flex gap-3">
        <button onClick={handleSaveSettings}
          className="shrink-0 w-[110px] h-[50px] rounded-[10px] border border-stone-300 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
          {savedFlash ? '已儲存！' : '儲存設定'}
        </button>
        <button onClick={handleExport} disabled={isExporting}
          className="flex-1 h-[50px] rounded-[10px] text-base font-medium text-white transition-opacity disabled:opacity-60"
          style={{ background:'#f97316' }}>
          {isExporting ? '產生中...' : '完成！匯出 PNG'}
        </button>
      </div>
    </div>
  )
}

// ── 資料載入 ────────────────────────────────────────────────────────────────────
function PosterEditorLoader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId')
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<PosterCourseData | null>(null)
  const [photos, setPhotos] = useState<string[]>([])

  useEffect(() => {
    if (!courseId) { setLoading(false); return }
    const supabase = createClient()
    ;(async () => {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle()
      if (!c) { setLoading(false); return }
      let instructorName = ''
      const ids: string[] = (c.instructor_ids && c.instructor_ids.length) ? c.instructor_ids : (c.instructor_id ? [c.instructor_id] : [])
      if (ids.length) {
        const { data: instr } = await supabase.from('instructors').select('name').in('id', ids)
        instructorName = (instr || []).map((i: any) => i.name).filter(Boolean).join('、')
      }
      setCourse({
        id: c.id, title: c.title, instructor: instructorName, date: c.date,
        timeStart: (c.time_start || '').slice(0, 5), timeEnd: (c.time_end || '').slice(0, 5),
        location: c.location, suitableAge: c.suitable_age, notes: c.notes,
      })
      const photoList: string[] = (c.photo_urls && c.photo_urls.length) ? c.photo_urls : (c.poster_url ? [c.poster_url] : [])
      setPhotos(photoList)
      setLoading(false)
    })()
  }, [courseId])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>
  }
  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-stone-400 text-sm px-6 text-center">
        <p>找不到這個課程，可能連結已失效。</p>
        <button onClick={()=>router.push('/instructor')} className="text-orange-500 font-medium">返回我的課程</button>
      </div>
    )
  }
  return <PosterEditorMobile course={course} photos={photos} />
}

export default function PosterEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <PosterEditorLoader />
    </Suspense>
  )
}
