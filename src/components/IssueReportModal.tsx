'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { CloseIcon, ChevronDownIcon } from '@/components/InstructorMobileUI'

const MAX_SCREENSHOTS = 10

const ISSUE_TYPES = ['頁面顯示異常', '功能無法使用', '資料錯誤', '功能許願', '其他']

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

type Props = {
  instructorId: string
  onClose: () => void
  onSuccess: () => void
}

export default function IssueReportModal({ instructorId, onClose, onSuccess }: Props) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const openFilePicker = () => fileInputRef.current?.click()

  // 上傳原圖（不裁切）：預覽用 object-cover 顯示成正方形，但存進 storage 的是使用者上傳的原始檔案
  const uploadFiles = async (files: File[]) => {
    const room = MAX_SCREENSHOTS - screenshots.length
    if (room <= 0 || files.length === 0) return
    const toUpload = files.slice(0, room)
    setUploading(true)
    for (const file of toUpload) {
      const ext = file.name.split('.').pop() || 'png'
      const filename = `issue-reports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true, contentType: file.type || undefined })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
        setScreenshots(prev => [...prev, urlData.publicUrl].slice(0, MAX_SCREENSHOTS))
      }
    }
    setUploading(false)
  }

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    uploadFiles(files)
  }

  // 講師可直接貼圖（Ctrl+V / Cmd+V）
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items || [])
    const files = items
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((f): f is File => !!f)
    if (files.length === 0) return
    e.preventDefault()
    uploadFiles(files)
  }

  const removeScreenshot = (idx: number) => setScreenshots(prev => prev.filter((_, i) => i !== idx))

  const canSubmit = issueType !== '' && description.trim().length > 0 && !submitting && !uploading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    await supabase.from('issue_reports').insert({
      instructor_id: instructorId,
      issue_type: issueType,
      description: description.trim(),
      screenshot_urls: screenshots,
    })
    setSubmitting(false)
    onClose()
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        className="relative bg-white border border-stone-200 rounded-2xl w-full max-w-[400px] max-h-[90vh] overflow-y-auto flex flex-col gap-5 pt-8 pb-5 px-5"
      >
        <button type="button" onClick={onClose} className="absolute top-2.5 right-3 bg-white border border-stone-200 rounded-full p-1.5 hover:bg-stone-50 transition-colors" aria-label="關閉">
          <CloseIcon className="text-stone-600" />
        </button>

        <h3 className="text-stone-800 font-bold text-lg">問題通報</h3>

        <div className="flex flex-col gap-2 items-start w-full">
          <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
            <span className="text-red-500 text-xs leading-none">*</span>問題類型
          </label>
          <div className="relative w-full">
            <select
              required
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              className="w-full appearance-none bg-white border border-stone-200 rounded-md pl-3 pr-9 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="" disabled>請選擇問題類型</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          </div>
          {issueType === '功能許願' && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-2.5 py-1.5 w-full">
              許願不保證會做到，但我們會認真評估開發，謝謝你！
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 items-start w-full">
          <label className="flex items-center gap-1 text-sm font-medium text-stone-600">
            <span className="text-red-500 text-xs leading-none">*</span>{issueType === '功能許願' ? '許願內容' : '問題描述'}
          </label>
          <textarea
            required
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={issueType === '功能許願'
              ? '請描述你在執行上遇到的痛點，以及希望有什麼功能可以解決，例如：報名名單沒辦法一鍵匯出成 Excel，每次都要手動抄'
              : '請簡述遇到的問題，例如：點擊編輯課程後畫面空白'}
            className="w-full h-24 bg-white border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-600 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>

        <div className="flex flex-col gap-2 items-start w-full">
          <div className="flex items-center justify-between w-full">
            <label className="text-sm font-medium text-stone-600">截圖上傳（選填）</label>
            <span className="text-xs text-stone-400">{screenshots.length}/{MAX_SCREENSHOTS}</span>
          </div>
          <p className="text-xs text-stone-400">可直接貼圖（Cmd/Ctrl+V），幫助我們快速定位問題</p>

          <div className="grid grid-cols-4 gap-2 w-full">
            {screenshots.map((url, i) => (
              <div key={url + i} className="relative aspect-square rounded-lg overflow-hidden border border-stone-200">
                <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeScreenshot(i)}
                  className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-1 shadow drop-shadow-sm"
                  aria-label="移除截圖"
                >
                  <RemoveIcon />
                </button>
              </div>
            ))}
            {screenshots.length < MAX_SCREENSHOTS && (
              <button
                type="button"
                onClick={openFilePicker}
                disabled={uploading}
                className="aspect-square rounded-lg border border-dashed border-stone-300 hover:border-orange-400 flex items-center justify-center text-stone-400 hover:text-orange-500 transition-colors disabled:opacity-60"
              >
                <PlusIcon />
              </button>
            )}
          </div>
          {uploading && <p className="text-xs text-orange-500">上傳中...</p>}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-2.5 rounded-lg text-base transition-colors"
        >
          {submitting ? '送出中...' : '送出回報'}
        </button>
      </form>
    </div>
  )
}
