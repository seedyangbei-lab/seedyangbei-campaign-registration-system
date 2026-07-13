'use client'

import { useRef, useState } from 'react'
import PhotoCropModal from './PhotoCropModal'

const MAX_PHOTOS = 5

type Props = {
  photos: string[]
  onChange: (next: string[]) => void
  uploadImage: (blob: Blob) => Promise<string | null>
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export default function CoursePhotoGrid({ photos, onChange, uploadImage }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [pendingFileSrc, setPendingFileSrc] = useState<string | null>(null) // 新上傳、還沒裁切的圖
  const [editIndex, setEditIndex] = useState<number | null>(null) // 正在重新裁切的既有照片 index
  const [editChooserOpen, setEditChooserOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPendingFileSrc(URL.createObjectURL(file))
  }

  const handleNewCropConfirm = async (blob: Blob) => {
    setPendingFileSrc(null)
    setUploading(true)
    const url = await uploadImage(blob)
    setUploading(false)
    if (url) onChange([...photos, url].slice(0, MAX_PHOTOS))
  }

  const handleReCropConfirm = async (blob: Blob) => {
    if (editIndex === null) return
    setUploading(true)
    const url = await uploadImage(blob)
    setUploading(false)
    if (url) {
      const next = [...photos]
      next[editIndex] = url
      onChange(next)
    }
    setEditIndex(null)
  }

  const removePhoto = (idx: number) => onChange(photos.filter((_, i) => i !== idx))

  const emptySlots = Math.max(0, MAX_PHOTOS - photos.length)

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-end justify-between w-full gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-stone-600">
            <span className="text-red-500 text-xs leading-none">*</span>課程照片
          </span>
          {photos.length > 0 ? (
            <span className="text-xs text-stone-400">已上傳 {photos.length}/{MAX_PHOTOS}</span>
          ) : null}
        </div>
        {photos.length === 0 ? (
          <span className="text-xs text-stone-400 whitespace-nowrap">最少上傳1張，最多5張</span>
        ) : (
          <button
            type="button"
            onClick={() => setEditChooserOpen(true)}
            className="shrink-0 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-xs font-medium px-2.5 h-6 rounded-md transition-colors"
          >
            編輯照片
          </button>
        )}
      </div>

      {photos.length === 0 ? (
        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          className="w-full h-8 flex items-center justify-center gap-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 text-xs font-medium rounded-md transition-colors disabled:opacity-60"
        >
          <PlusIcon />{uploading ? '上傳中...' : '上傳照片'}
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 w-full">
          {photos.map((url, i) => (
            <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden border border-stone-300">
              <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-orange-500 text-white rounded-full p-1 shadow drop-shadow-sm"
                aria-label="刪除照片"
              >
                <CloseIcon />
              </button>
            </div>
          ))}
          {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={openFilePicker}
              disabled={uploading}
              className="aspect-square rounded-xl border border-dashed border-stone-300 hover:border-orange-400 flex items-center justify-center text-stone-400 hover:text-orange-500 transition-colors disabled:opacity-60"
            >
              <PlusIcon />
            </button>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {pendingFileSrc && (
        <PhotoCropModal
          src={pendingFileSrc}
          onCancel={() => setPendingFileSrc(null)}
          onConfirm={handleNewCropConfirm}
        />
      )}

      {editIndex !== null && (
        <PhotoCropModal
          src={photos[editIndex]}
          onCancel={() => setEditIndex(null)}
          onConfirm={handleReCropConfirm}
        />
      )}

      {editChooserOpen && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEditChooserOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-800 text-base">選擇要編輯的照片</h3>
              <button onClick={() => setEditChooserOpen(false)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors" aria-label="關閉">
                <CloseIcon />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <button
                  key={url + i}
                  type="button"
                  onClick={() => { setEditChooserOpen(false); setEditIndex(i) }}
                  className="relative aspect-square rounded-xl overflow-hidden border border-stone-300 group"
                >
                  <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                    <span className="opacity-0 group-hover:opacity-100 bg-white rounded-full p-2 text-stone-700 transition-opacity">
                      <EditIcon />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
