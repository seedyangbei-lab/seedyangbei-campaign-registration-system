'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  PosterCourseData, lum, textCol, SCHEMES, ZH_FONTS, EN_FONTS, loadAllGoogleFonts,
  DotShape, DotCoverage, DotArrangement, DOT_SHAPES, DotPatternSvg,
  POSTER_W, POSTER_H, PHOTO_H, INFO_PAD, TITLE_WEIGHT, EN_WEIGHT,
  exportPosterPNG, ChevronDownIcon, MinusIcon, PlusIcon, SliderRow, sliderTrackStyle, ColorPickerDropdown, SizeSelect, ZH_SIZE_OPTIONS, EN_SIZE_OPTIONS,
} from './posterEditor/shared'

type CourseData = PosterCourseData

interface Props {
  course: CourseData
  initialImage?: string | null
  photos?: string[]
  onClose: () => void
}

export default function CoursePosterEditor({ course, initialImage, photos, onClose }: Props) {
  const storageKey = `yangbei-poster-settings:${course.id || 'default'}`

  const [imgSrc, setImgSrc]     = useState<string|null>(initialImage||null)
  const [imgPos, setImgPos]     = useState({ x:0, y:0 })
  const [imgScale, setImgScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ mx:0, my:0, px:0, py:0 })

  const [scheme, setScheme]   = useState(SCHEMES[0])
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
  const [zhFontSize, setZhFontSize] = useState(17)   // 標題／地點
  const [enFontSize, setEnFontSize] = useState(9)    // 時間／邊框裝飾

  const [letterSpacingPct, setLetterSpacingPct] = useState(2)   // 字距：文字與文字間的距離（標題／內文共用）
  const [lineSpacingMult, setLineSpacingMult]   = useState(1.5) // 行距：標題與內文（課程時間起）的距離

  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const [isExporting, setIsExporting] = useState(false)
  const fileRef    = useRef<HTMLInputElement>(null)
  const stageRef   = useRef<HTMLDivElement>(null)   // 預覽舞台（虛線框內側，用來量測可用尺寸）
  const [previewScale, setPreviewScale] = useState(1)

  // Load all Google Fonts once on mount — no hooks in loops
  useEffect(() => { loadAllGoogleFonts() }, [])

  // ── 讀取上次「儲存設定」──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const s = JSON.parse(raw)
      if (s.schemeId) { const found = SCHEMES.find(x=>x.id===s.schemeId); if (found) setScheme(found) }
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

  // ResizeObserver: 直接量測虛線框內側舞台的實際可用尺寸（無需再手動扣除周邊元素高度）
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      setPreviewScale(Math.min(el.clientHeight/POSTER_H, el.clientWidth/POSTER_W, 1))
    }
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
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imgSrc) return; e.preventDefault()
    setIsDragging(true)
    dragStart.current = { mx:e.clientX, my:e.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setImgPos({ x:dragStart.current.px+e.clientX-dragStart.current.mx, y:dragStart.current.py+e.clientY-dragStart.current.my })
  }, [isDragging])
  const onMouseUp   = useCallback(() => setIsDragging(false), [])
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!imgSrc) return
    e.preventDefault()
    const t=e.touches[0]; setIsDragging(true)
    dragStart.current = { mx:t.clientX, my:t.clientY, px:imgPos.x, py:imgPos.y }
  }, [imgSrc, imgPos])
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const t=e.touches[0]
    setImgPos({ x:dragStart.current.px+t.clientX-dragStart.current.mx, y:dragStart.current.py+t.clientY-dragStart.current.my })
  }, [isDragging])
  const onTouchEnd = useCallback(() => setIsDragging(false), [])

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

  // ── Canvas export ─────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full md:w-[960px] md:max-w-[960px] md:mx-4 flex flex-col md:flex-row bg-white md:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl h-[95dvh] max-h-[95dvh] md:h-[755px] md:max-h-[755px]">

        {/* close（白底方圓角浮動按鈕，貼齊整個彈窗右上角） */}
        <button onClick={onClose} aria-label="關閉"
          className="absolute top-4 right-4 z-20 bg-white border border-stone-200 rounded-md p-1.5 hover:bg-stone-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-stone-600"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        {/* ── LEFT：海報編輯器（controls） ── */}
        <div className="order-2 md:order-1 flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="shrink-0 border-b border-stone-100 px-4 pt-5 pb-4">
            <h3 className="text-stone-600 font-bold text-xl">海報編輯器</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {/* 主視覺色彩 */}
            <section>
              <p className="text-sm font-medium text-stone-500 mb-2">主視覺色彩</p>
              <div className="bg-stone-100 rounded-[10px] px-4 py-2 flex items-center justify-between gap-1">
                {SCHEMES.map(s=>(
                  <button key={s.id} title={s.label} aria-label={s.label}
                    onClick={()=>{ setScheme(s); setCustomBg('') }}
                    className="rounded-full transition-transform active:scale-95 shrink-0"
                    style={{ width:'28px', height:'28px', background:s.bg, outline:(!customBg&&scheme.id===s.id)?'2px solid #f97316':'2px solid transparent', outlineOffset:'2px',
                      boxShadow:s.id==='white'?'inset 0 0 0 1px rgba(0,0,0,0.15)':'0px 0px 0px 0.5px rgba(0,0,0,0.09)' }} />
                ))}
                <label className="rounded-full cursor-pointer transition-transform hover:scale-105 flex items-center justify-center shrink-0 relative border border-dashed border-stone-400 bg-white"
                  style={{ width:'28px', height:'28px', outline:customBg?'2px solid #f97316':'none', outlineOffset:'2px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                  <input type="color" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    value={customBg||scheme.bg} onChange={e=>setCustomBg(e.target.value)} />
                </label>
              </div>
            </section>

            {/* Tab bar：字體設定／裝飾 */}
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
                  <div className="bg-stone-100 rounded-lg p-3 grid grid-cols-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">中文字體</p>
                      <div className="relative">
                        <select value={zhFontIdx} onChange={e=>setZhFontIdx(parseInt(e.target.value))}
                          className="w-full h-9 appearance-none bg-white border border-stone-200 rounded-md pl-2 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300">
                          {ZH_FONTS.map((f,i)=><option key={f.label} value={i} style={{fontFamily:f.value}}>{f.label}</option>)}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">文字顏色</p>
                      <ColorPickerDropdown label="中文字體顏色" value={tc} onChange={setTextColorOverride} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">字級大小</p>
                      <SizeSelect value={zhFontSize} options={ZH_SIZE_OPTIONS} unit="px" onChange={setZhFontSize} />
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
                  <div className="bg-stone-100 rounded-lg p-3 grid grid-cols-3 gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">英文字體</p>
                      <div className="relative">
                        <select value={enFontIdx} onChange={e=>setEnFontIdx(parseInt(e.target.value))}
                          className="w-full h-9 appearance-none bg-white border border-stone-200 rounded-md pl-2 pr-7 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300">
                          {EN_FONTS.map((f,i)=><option key={f.label} value={i} style={{fontFamily:f.value}}>{f.label}</option>)}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">文字顏色</p>
                      <ColorPickerDropdown label="英文字體顏色" value={enTc} onChange={setEnTextColorOverride} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-stone-500 mb-1">字級大小</p>
                      <SizeSelect value={enFontSize} options={EN_SIZE_OPTIONS} unit="px" onChange={setEnFontSize} />
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-stone-600">裝飾點</p>
                    <button onClick={()=>{
                        if (dotShape==='none') setDotShape(dotShapeMemory.current)
                        else { dotShapeMemory.current = dotShape; setDotShape('none') }
                      }} aria-label="切換裝飾點" className="relative rounded-full transition-colors shrink-0"
                      style={{ height:'18px', width:'30px', background:dotOn?'#f97316':'#d1d5db' }}>
                      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width:'14px', height:'14px', left:dotOn?'14px':'2px' }} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {DOT_SHAPES.map(d=>(
                        <button key={d.id} onClick={()=>setDotShape(d.id)}
                          className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg border transition-all"
                          style={{ border:dotShape===d.id?'1.5px solid #f97316':'1px solid #e7e5e4', background:dotShape===d.id?'#fff7ed':'transparent' }}>
                          <span className="text-sm leading-none">{d.symbol}</span>
                          <span className="text-[8px] text-stone-400">{d.label}</span>
                        </button>
                      ))}
                    </div>

                    {dotShape!=='none' && (<>
                      {dotShape==='custom' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 flex-shrink-0">自訂文字</span>
                          <input type="text" maxLength={1} value={dotCustomChar} onChange={e=>setDotCustomChar(e.target.value)}
                            className="w-10 text-center border border-stone-200 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] text-stone-400 mb-1">放置位置</p>
                        <div className="flex gap-1.5">
                          {(['photo','full'] as const).map(c=>(
                            <button key={c} onClick={()=>setDotCoverage(c)}
                              className="flex-1 py-1.5 rounded-lg border text-[11px] transition-all"
                              style={{ border:dotCoverage===c?'1.5px solid #f97316':'1px solid #e7e5e4', background:dotCoverage===c?'#fff7ed':'transparent', color:'#374151' }}>
                              {c==='photo'?'照片上':'滿版'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-stone-400 mb-1">排列方式</p>
                        <div className="flex gap-1.5">
                          {(['grid','random'] as const).map(a=>(
                            <button key={a} onClick={()=>{ setDotArrangement(a); if(a==='random') setDotSeed(s=>s+1) }}
                              className="flex-1 py-1.5 rounded-lg border text-[11px] transition-all flex items-center justify-center gap-1"
                              style={{ border:dotArrangement===a?'1.5px solid #f97316':'1px solid #e7e5e4', background:dotArrangement===a?'#fff7ed':'transparent', color:'#374151' }}>
                              {a==='grid'?'整齊格狀':(
                                <>隨機散落{dotArrangement==='random'&&(
                                  <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center" onClick={e=>{e.stopPropagation();setDotSeed(s=>s+1)}}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                                  </span>
                                )}</>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-400 flex-shrink-0 w-16">裝飾點顏色</span>
                        <div className="w-[140px]">
                          <ColorPickerDropdown label="裝飾點顏色" value={dotFill} showHex onChange={setDotColor} />
                        </div>
                        {dotColor && <button onClick={()=>setDotColor('')} className="text-[9px] text-stone-400 hover:text-orange-500 transition-colors ml-auto">重設</button>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <SliderRow label="大小" min={2} max={24} step={0.5} value={dotSize} onChange={setDotSize} unit="px" />
                        <SliderRow label="透明度" min={5} max={100} step={1} value={dotOpacity} onChange={setDotOpacity} unit="%" />
                        <SliderRow label="密度" min={10} max={90} step={1} value={dotDensity} onChange={setDotDensity} unit="" />
                      </div>
                    </>)}
                  </div>
                </section>

                {/* 邊框英文裝飾 */}
                <section className="border border-stone-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-stone-600">邊框英文裝飾</p>
                    <button onClick={()=>setBorderOn(v=>!v)} aria-label="切換邊框文字"
                      className="relative rounded-full transition-colors flex-shrink-0"
                      style={{ height:'18px', width:'30px', background:borderOn?'#f97316':'#d1d5db' }}>
                      <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width:'14px', height:'14px', left:borderOn?'14px':'2px' }} />
                    </button>
                  </div>
                  <input type="text" value={borderText} onChange={e=>setBorderText(e.target.value)} placeholder="請輸入邊框裝飾英文字"
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </section>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT：預覽畫面 ── */}
        <div className="order-1 md:order-2 md:w-[360px] w-full shrink-0 flex flex-col bg-gradient-to-b from-orange-50 to-white md:border-l border-stone-100 overflow-hidden">

          <div className="shrink-0 border-b border-stone-100 px-4 pt-5 pb-4 text-center">
            <h3 className="text-stone-600 text-xl">預覽畫面</h3>
          </div>

          <div className="flex-1 flex flex-col items-center min-h-0 px-4 py-3 gap-2">
            <div className="w-full flex-1 min-h-0 border border-dashed border-orange-400 bg-stone-50 rounded-xl overflow-hidden flex items-center justify-center">
              <div ref={stageRef} className="w-full h-full flex items-center justify-center">
                <div style={{ width:scaledW, height:scaledH, position:'relative', flexShrink:0, overflow:'hidden', borderRadius:'12px', boxShadow:'0px 0px 18px 0px rgba(0,0,0,0.11)' }}>
                  <div className="absolute top-0 left-0 origin-top-left"
                    style={{ transform:`scale(${previewScale})`, width:POSTER_W, height:POSTER_H }}>

                <div className="relative select-none"
                  style={{ width:POSTER_W, height:POSTER_H, backgroundColor:activeBg, overflow:'visible' }}>

                  {/* photo zone */}
                  <div className="absolute left-0 right-0 top-0 overflow-hidden"
                  style={{ height:PHOTO_H, cursor:imgSrc?(isDragging?'grabbing':'grab'):'default', zIndex:1, touchAction:'none' }}
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

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

                    {/* dots on photo */}
                    {dotOn && dotCoverage==='photo' && (
                      <DotPatternSvg shape={dotShape} customChar={dotCustomChar} color={dotFill}
                        opacity={dotOpacity} size={dotSize} density={dotDensity}
                        coverage="photo" arrangement={dotArrangement} seed={dotSeed}
                        totalHeight={POSTER_H} photoHeight={PHOTO_H} posterWidth={POSTER_W} />
                    )}

                    {/* border text U-path */}
                    {borderOn && borderText && (
                      <svg viewBox={`0 0 ${POSTER_W} ${PHOTO_H}`} xmlns="http://www.w3.org/2000/svg"
                        style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:3 }}>
                        <defs>
                          <path id="border-u-path"
                            d={`M 8,${PHOTO_H} L 8,16 Q 8,8 16,8 L ${POSTER_W-16},8 Q ${POSTER_W-8},8 ${POSTER_W-8},16 L ${POSTER_W-8},${PHOTO_H}`} />
                        </defs>
                        <text fontSize={borderFontSize} letterSpacing={enLetterPx} fill={enTc} opacity={0.42} fontFamily={enFont.value} dominantBaseline="middle">
                          <textPath href="#border-u-path" startOffset="0">{borderText.repeat(20)}</textPath>
                        </text>
                      </svg>
                    )}

                    {/* SEED COURSE tag — photo zone top-left, 16px from edges */}
                    <div style={{
                      position:'absolute', top:INFO_PAD, left:INFO_PAD, zIndex:10,
                      display:'inline-flex', alignItems:'center',
                      borderRadius:'20px', padding:'2px 7px',
                      background:tagBg, border:`0.5px solid ${tagBorder}`, color:enTc,
                      fontFamily:enFont.value, fontSize:'7px', letterSpacing:`${enLetterPx}px`, textTransform:'uppercase',
                    }}>SEED COURSE</div>
                  </div>

                  {/* dots full */}
                  {dotOn && dotCoverage==='full' && (
                    <div className="absolute inset-0 overflow-hidden" style={{zIndex:2,pointerEvents:'none'}}>
                      <DotPatternSvg shape={dotShape} customChar={dotCustomChar} color={dotFill}
                        opacity={dotOpacity} size={dotSize} density={dotDensity}
                        coverage="full" arrangement={dotArrangement} seed={dotSeed}
                        totalHeight={POSTER_H} photoHeight={PHOTO_H} posterWidth={POSTER_W} />
                    </div>
                  )}

                  {/* divider */}
                  <div style={{ position:'absolute', left:INFO_PAD, right:INFO_PAD, top:PHOTO_H, height:'0.5px', background:divider, zIndex:4 }} />

                  {/* info zone — 16px padding all sides, overflow visible */}
                  <div className="absolute left-0 right-0 flex flex-col"
                    style={{ top:PHOTO_H, bottom:0, padding:INFO_PAD, overflow:'visible', zIndex:3 }}>

                    {/* title */}
                    <div style={{
                      color:tc, fontWeight:TITLE_WEIGHT, lineHeight:1.3, marginBottom:`${titleGap}px`,
                      fontFamily:zhFont.value, fontSize:`${zhFontSize}px`, letterSpacing:`${zhLetterPx}px`, flexShrink:0,
                      overflow:'hidden', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical',
                    }}>
                      {course.title||'課程名稱'}
                    </div>

                    {/* time badge */}
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

                    {/* location */}
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

                    {/* instructor */}
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
            </div>

            {/* zoom（+ / − Scrollbar，調整照片在照片框中的呈現範圍） */}
            <div style={{ width:scaledW || 226 }} className="flex items-center gap-2 flex-shrink-0">
              <MinusIcon className="text-stone-400 flex-shrink-0" />
              <input type="range" min="0.5" max="3" step="0.05" value={imgScale} onChange={e=>setImgScale(parseFloat(e.target.value))}
                className="poster-slider flex-1 accent-orange-500" style={sliderTrackStyle(imgScale, 0.5, 3)} />
              <PlusIcon className="text-stone-400 flex-shrink-0" />
            </div>
          </div>

          {/* 儲存設定 / 變更圖片 */}
          <div className="shrink-0 px-4 pb-3 flex gap-3">
            <button onClick={handleSaveSettings}
              className="flex-1 h-9 rounded-lg border border-stone-300 bg-white text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors">
              {savedFlash ? '已儲存！' : '儲存設定'}
            </button>
            <button onClick={()=>setShowPhotoPicker(true)}
              className="flex-1 h-9 rounded-lg border text-sm font-medium transition-colors"
              style={{ background:'#fff7ed', borderColor:'#fed7aa', color:'#ea580c' }}>
              變更圖片
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* 完成！匯出 PNG */}
          <div className="shrink-0 border-t border-stone-200 px-4 py-4">
            <button onClick={handleExport} disabled={isExporting}
              className="w-full py-2.5 rounded-lg text-sm font-medium tracking-wide text-white transition-opacity disabled:opacity-60"
              style={{ background:'#f97316' }}>
              {isExporting ? '產生中...' : '完成！匯出 PNG'}
            </button>
          </div>
        </div>

        {/* 變更圖片 picker */}
        {showPhotoPicker && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40" onClick={e=>{ if (e.target===e.currentTarget) setShowPhotoPicker(false) }}>
            <div className="bg-white rounded-2xl shadow-2xl w-[300px] max-h-[80%] overflow-y-auto p-4">
              <p className="text-sm font-medium text-stone-600 mb-3">選擇課程照片</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(photos && photos.length ? photos : []).slice(0,5).map((p,i)=>(
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
      </div>
    </div>
  )
}
