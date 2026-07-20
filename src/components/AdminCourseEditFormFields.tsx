'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@/components/InstructorMobileUI'
import CoursePhotoGrid from '@/components/CoursePhotoGrid'
import SuitableAgeSelector from '@/components/SuitableAgeSelector'
import {
  LOCATIONS, DESCRIPTION_MAX, MAX_SEATS_OPTIONS, TIME_OPTIONS,
  InstructorMultiSelect, withCurrentValue, type InstructorOption,
} from '@/components/CourseEditFormFields'

export { LOCATIONS }

export type AdminCategory = { id: string; name: string; color: string }

export type AdminCourseForm = {
  title: string
  description: string
  date: string
  time_start: string
  time_end: string
  location: string
  custom_location: string
  max_seats: number
  photo_urls: string[]
  instructor_ids: string[]
  category_id: string
  notes: string
  suitable_age: string
  custom_age: string
}

export const emptyAdminCourseForm: AdminCourseForm = {
  title: '', description: '', date: '', time_start: '', time_end: '',
  location: '', custom_location: '', max_seats: 20,
  photo_urls: [], instructor_ids: [], category_id: '',
  notes: '', suitable_age: '全年齡', custom_age: '',
}

const NOTES_MAX = 40

// 活動日期下拉月曆（從 admin/courses/page.tsx 搬過來，不含資料邏輯，供桌機彈窗與手機獨立頁共用）
export function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear())
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('-')[1]) - 1 : today.getMonth())
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) { week.push(d); if (week.length === 7) { weeks.push(week); week = [] } }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)])
  const selDay = value ? parseInt(value.split('-')[2]) : null
  const selMon = value ? parseInt(value.split('-')[1]) - 1 : null
  const selYear = value ? parseInt(value.split('-')[0]) : null
  const isPast = (d: number) => { const date = new Date(viewYear, viewMonth, d); const t = new Date(); t.setHours(0, 0, 0, 0); return date < t }
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-lg w-72 z-50">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) } else setViewMonth(m => m - 1) }} className="p-1 hover:bg-stone-100 rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm font-semibold text-stone-700">{viewYear} 年 {monthNames[viewMonth]}</span>
        <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) } else setViewMonth(m => m + 1) }} className="p-1 hover:bg-stone-100 rounded-lg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">{['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-center text-xs text-stone-400 py-1">{d}</div>)}</div>
      {weeks.map((wk, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {wk.map((d, di) => {
            const isSel = d && selDay === d && selMon === viewMonth && selYear === viewYear
            const isToday = d && today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear
            const past = d && isPast(d)
            return <button key={di} type="button" disabled={!!past} onClick={() => d && !past && onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)}
              className={`text-center text-sm py-1.5 rounded-lg transition-colors ${!d ? '' : past ? 'text-stone-300 cursor-not-allowed' : isSel ? 'bg-orange-500 text-white' : isToday ? 'bg-orange-50 text-orange-600' : 'hover:bg-stone-100 text-stone-700'}`}>{d || ''}</button>
          })}
        </div>
      ))}
      <p className="text-xs text-stone-400 text-center mt-2">灰色為過去日期，無法選擇</p>
    </div>
  )
}

type Props = {
  form: AdminCourseForm
  setForm: (next: AdminCourseForm) => void
  categories: AdminCategory[]
  instructorOptions: InstructorOption[]
  timeError: string
  showCalendar: boolean
  setShowCalendar: (v: boolean) => void
  uploadCoursePhoto: (blob: Blob) => Promise<string | null>
}

// 後台課程編輯表單欄位（不含外層 modal/page 外框與送出按鈕），對照 Figma node 359-27297，
// 與中台 CourseEditFormFields 共用 24 小時制時間下拉與合作講師搜尋多選 chips
export default function AdminCourseEditFormFields({
  form, setForm, categories, instructorOptions, timeError, showCalendar, setShowCalendar, uploadCoursePhoto,
}: Props) {
  const timeStartOptions = withCurrentValue(TIME_OPTIONS, form.time_start)
  const timeEndOptions = withCurrentValue(TIME_OPTIONS, form.time_end)
  const seatOptions = MAX_SEATS_OPTIONS.includes(form.max_seats) ? MAX_SEATS_OPTIONS : [...MAX_SEATS_OPTIONS, form.max_seats].sort((a, b) => a - b)
  const notesCount = form.notes.length
  const notesOver = notesCount > NOTES_MAX

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">課程名稱 *</label>
        <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">課程說明</label>
        <textarea value={form.description} maxLength={DESCRIPTION_MAX} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
        <p className="text-right text-stone-400 text-xs mt-1">{form.description.length}/{DESCRIPTION_MAX}</p>
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">課程類別 *</label>
        <div className="relative">
          <select required value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
            className="w-full appearance-none border border-stone-300 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            {/* 課程類別改為必填，移除「不分類」這個可選值；這個 placeholder 是 disabled 的，
                只用來在還沒選之前顯示提示文字，選過一次之後就選不回來了，逼使用者一定要選一個真正的類別 */}
            <option value="" disabled>請選擇課程類別</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">適合年齡</label>
        <SuitableAgeSelector
          value={form.suitable_age}
          customValue={form.custom_age}
          onChange={v => setForm({ ...form, suitable_age: v })}
          onCustomChange={v => setForm({ ...form, custom_age: v })}
        />
      </div>

      <div className="relative">
        <label className="block text-stone-600 text-sm font-medium mb-1.5">活動日期 *</label>
        <button type="button" onClick={() => setShowCalendar(!showCalendar)} className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-orange-300">
          <span className={form.date ? 'text-stone-800' : 'text-stone-400'}>{form.date || '選擇日期'}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        </button>
        {showCalendar && <div className="absolute top-full left-0 mt-1 z-20"><CalendarPicker value={form.date} onChange={v => { setForm({ ...form, date: v }); setShowCalendar(false) }} /></div>}
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-2">時間 *</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <select required value={form.time_start} onChange={e => setForm({ ...form, time_start: e.target.value })}
              className="w-full appearance-none border border-stone-300 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="" disabled>開始時間</option>
              {timeStartOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
          <span className="text-stone-500 text-sm shrink-0">~</span>
          <div className="relative flex-1 min-w-0">
            <select required value={form.time_end} onChange={e => setForm({ ...form, time_end: e.target.value })}
              className="w-full appearance-none border border-stone-300 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="" disabled>結束時間</option>
              {timeEndOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
        {timeError && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{timeError}</p>}
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">地點 *</label>
        <div className="relative">
          <select required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full appearance-none border border-stone-300 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            <option value="">選擇地點</option>
            {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
        {form.location === '其他' && (
          <input required value={form.custom_location} onChange={e => setForm({ ...form, custom_location: e.target.value })} placeholder="請填寫實際地點" className="w-full mt-2 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
        )}
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">名額上限 *</label>
        <div className="relative">
          <select value={form.max_seats} onChange={e => setForm({ ...form, max_seats: parseInt(e.target.value) || 1 })}
            className="w-full appearance-none border border-stone-300 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            {seatOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">
          合作講師 <span className="text-stone-400 font-normal">（選填）</span>
        </label>
        <InstructorMultiSelect
          options={instructorOptions}
          selectedIds={form.instructor_ids}
          onChange={ids => setForm({ ...form, instructor_ids: ids })}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-stone-600 text-sm font-medium">注意事項 <span className="text-stone-400 font-normal">（選填，最多顯示兩行）</span></label>
          <span className={`text-xs font-medium tabular-nums ${notesOver ? 'text-red-500' : notesCount >= NOTES_MAX * 0.8 ? 'text-orange-500' : 'text-stone-400'}`}>{notesCount} / {NOTES_MAX}</span>
        </div>
        <textarea value={form.notes}
          onChange={e => { const newVal = e.target.value; if (newVal.length <= NOTES_MAX || newVal.length < form.notes.length) setForm({ ...form, notes: newVal }) }}
          rows={2} placeholder="例：閱覽室內書籍僅供室內閱讀，不可私自帶離。"
          className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${notesOver ? 'border-red-400 focus:ring-red-300 bg-red-50' : 'border-stone-300 focus:ring-orange-300'}`} />
        {notesOver && <p className="text-red-500 text-xs mt-1">已達字數上限（{NOTES_MAX} 字），請刪減內容</p>}
      </div>

      <CoursePhotoGrid
        photos={form.photo_urls}
        onChange={photo_urls => setForm({ ...form, photo_urls })}
        uploadImage={uploadCoursePhoto}
      />
    </div>
  )
}
