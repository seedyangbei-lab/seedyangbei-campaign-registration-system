'use client'

import { ChevronDownIcon } from '@/components/InstructorMobileUI'
import CoursePhotoGrid from '@/components/CoursePhotoGrid'
import SuitableAgeSelector from '@/components/SuitableAgeSelector'

export const LOCATIONS = ['C 小客廳', 'D 小客廳', '閱覽室 1', '閱覽室 2', '其他']
export const DESCRIPTION_MAX = 100
export const MAX_SEATS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 50]

// 上課時間下拉選項：每 30 分鐘一格，06:00~22:00
// 取代原生 time input（Safari 上下午分段選單在窄版彈窗裡很擠），改成跟地點欄位一致的下拉樣式
function buildTimeOptions() {
  const opts: string[] = []
  for (let h = 6; h <= 22; h++) {
    opts.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 22) opts.push(`${String(h).padStart(2, '0')}:30`)
  }
  return opts
}
export const TIME_OPTIONS = buildTimeOptions()

export type CourseForm = {
  title: string
  description: string
  date: string
  time_start: string
  time_end: string
  location: string
  custom_location: string
  notes: string
  suitable_age: string
  custom_age: string
  photos: string[]
  max_seats: number
}

// 下拉選單裡若目前值不在預設清單中（例如舊資料是 15 分鐘為單位），把它加進去，避免選單顯示空白
function withCurrentValue(options: string[], current: string) {
  if (current && !options.includes(current)) return [current, ...options]
  return options
}
function withCurrentSeats(options: number[], current: number) {
  if (!options.includes(current)) return [...options, current].sort((a, b) => a - b)
  return options
}

type Props = {
  form: CourseForm
  setForm: (next: CourseForm) => void
  uploadCoursePhoto: (blob: Blob) => Promise<string | null>
}

// 課程編輯表單欄位（不含外層 modal/page 外框與送出按鈕），供桌機彈窗與手機獨立頁共用
export default function CourseEditFormFields({ form, setForm, uploadCoursePhoto }: Props) {
  const timeStartOptions = withCurrentValue(TIME_OPTIONS, form.time_start)
  const timeEndOptions = withCurrentValue(TIME_OPTIONS, form.time_end)
  const seatOptions = withCurrentSeats(MAX_SEATS_OPTIONS, form.max_seats)

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
          <span className="text-red-500 text-xs leading-none">*</span>課程標題
        </label>
        <input
          required
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <div>
        <label className="block text-stone-600 text-sm font-medium mb-1.5">課程簡介</label>
        <textarea
          value={form.description}
          maxLength={DESCRIPTION_MAX}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
        />
        <p className="text-right text-stone-400 text-xs mt-1">{form.description.length}/{DESCRIPTION_MAX}</p>
      </div>

      <div>
        <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
          <span className="text-red-500 text-xs leading-none">*</span>上課時間
        </label>
        <div className="flex flex-col gap-2">
          <input
            required
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <select
                required
                value={form.time_start}
                onChange={e => setForm({ ...form, time_start: e.target.value })}
                className="w-full appearance-none border border-stone-300 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="" disabled>開始時間</option>
                {timeStartOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
            <span className="text-stone-500 text-sm shrink-0">~</span>
            <div className="relative flex-1 min-w-0">
              <select
                required
                value={form.time_end}
                onChange={e => setForm({ ...form, time_end: e.target.value })}
                className="w-full appearance-none border border-stone-300 rounded-xl pl-3 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              >
                <option value="" disabled>結束時間</option>
                {timeEndOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
          <span className="text-red-500 text-xs leading-none">*</span>上課地點
        </label>
        <div className="relative">
          <select
            value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full appearance-none border border-stone-300 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="">請選擇</option>
            {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
        {form.location === '其他' && (
          <input
            value={form.custom_location}
            onChange={e => setForm({ ...form, custom_location: e.target.value })}
            placeholder="輸入地點"
            className="w-full mt-2 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        )}
      </div>

      <div>
        <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
          <span className="text-red-500 text-xs leading-none">*</span>名額上限
        </label>
        <div className="relative">
          <select
            value={form.max_seats}
            onChange={e => setForm({ ...form, max_seats: parseInt(e.target.value) || 1 })}
            className="w-full appearance-none border border-stone-300 rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {seatOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1 text-stone-600 text-sm font-medium mb-1.5">
          <span className="text-red-500 text-xs leading-none">*</span>適合年齡
        </label>
        <SuitableAgeSelector
          value={form.suitable_age}
          customValue={form.custom_age}
          onChange={v => setForm({ ...form, suitable_age: v })}
          onCustomChange={v => setForm({ ...form, custom_age: v })}
        />
      </div>

      <CoursePhotoGrid
        photos={form.photos}
        onChange={photos => setForm({ ...form, photos })}
        uploadImage={uploadCoursePhoto}
      />
    </div>
  )
}
