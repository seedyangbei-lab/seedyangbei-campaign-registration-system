'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Tab = 'content' | 'kv' | 'schedule'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('content')
  const [isEditing, setIsEditing] = useState(false)
const [settings, setSettings] = useState({
    site_title: '', site_subtitle: '', site_description: '',
    contact_email: '', footer_note: '',
    hero_image_desktop: '', hero_image_mobile: '',
    hero_cutout_desktop: '',
    hero_cutout_mobile: '',
    hero_bg_opacity: '0.18',
    hero_title_color: '#1c1917',
    hero_title_stroke: '',
    line_community_url: '',
    schedule_phone: '',
    schedule_contact: '',
    schedule_hours: '',
    schedule_register_qr: '',
    schedule_community_qr: '',
    schedule_logo_1: '',
    schedule_logo_2: '',
    schedule_logo_3: '',
    schedule_logo_1_name: '新北市政府城鄉發展局',
    schedule_logo_2_name: '跨世代共居種子計畫',
    schedule_logo_3_name: '街道案子團隊',
    points_enabled: 'true',
  })
  const [savedSettings, setSavedSettings] = useState({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [aspectWarning, setAspectWarning] = useState<Record<string, string>>({})
  const [isKvEditing, setIsKvEditing] = useState(false)
  const [kvSaved, setKvSaved] = useState(false)
  const [kvSaving, setKvSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('site_settings').select('key, value').then(({ data }) => {
      const map = Object.fromEntries((data || []).map((s: any) => [s.key, s.value || '']))
      const merged = { ...settings, ...map }
      setSettings(merged)
      setSavedSettings(merged)
    })
  }, [])

  const upsertSettings = async (keys: (keyof typeof settings)[]) => {
    for (const key of keys) {
      await supabase.from('site_settings').upsert({ key, value: settings[key], updated_at: new Date().toISOString() }, { onConflict: 'key' })
    }
  }

  const handleContentSave = async () => {
    setSaving(true)
    await upsertSettings(['site_title','site_subtitle','site_description','contact_email','footer_note','line_community_url'])
    setSavedSettings(prev => ({ ...prev, site_title: settings.site_title, site_subtitle: settings.site_subtitle, site_description: settings.site_description, contact_email: settings.contact_email, footer_note: settings.footer_note }))
    setSaved(true); setSaving(false); setIsEditing(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleCancelContent = () => {
    setSettings(prev => ({ ...prev, ...savedSettings }))
    setIsEditing(false)
  }

  // 首頁 banner（桌機版背景底圖）建議比例為 16:9，超出容許誤差時提示但仍允許上傳
  const BANNER_RATIO_FIELDS: Record<string, number> = { hero_image_desktop: 16 / 9 }
  const RATIO_TOLERANCE = 0.05

  const checkAspectRatio = (field: string, file: File): Promise<void> => {
    const target = BANNER_RATIO_FIELDS[field]
    if (!target) return Promise.resolve()
    return new Promise(resolve => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        const ratio = img.width / img.height
        if (Math.abs(ratio - target) / target > RATIO_TOLERANCE) {
          setAspectWarning(w => ({ ...w, [field]: `目前圖片比例為 ${ratio.toFixed(2)}:1（建議 16:9 ≈ 1.78:1），畫面顯示時可能會被裁切` }))
        } else {
          setAspectWarning(w => { const next = { ...w }; delete next[field]; return next })
        }
        URL.revokeObjectURL(objectUrl)
        resolve()
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve() }
      img.src = objectUrl
    })
  }

  const handleUpload = async (field: string, file: File) => {
    setUploading(u => ({ ...u, [field]: true }))
    await checkAspectRatio(field, file)
    const ext = file.name.split('.').pop()
    const filename = `hero/${field}_${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('images').upload(filename, file, { upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(filename)
      setSettings(s => ({ ...s, [field]: urlData.publicUrl }))
    }
    setUploading(u => ({ ...u, [field]: false }))
  }

  const handleKvSave = async () => {
    setKvSaving(true)
    await upsertSettings(['hero_image_desktop','hero_image_mobile','hero_cutout_desktop','hero_cutout_mobile','hero_bg_opacity','hero_title_color','hero_title_stroke'])
    setSavedSettings(prev => ({ ...prev, hero_image_desktop: settings.hero_image_desktop, hero_image_mobile: settings.hero_image_mobile, hero_cutout_desktop: settings.hero_cutout_desktop, hero_cutout_mobile: settings.hero_cutout_mobile, hero_bg_opacity: settings.hero_bg_opacity,
    hero_title_color: settings.hero_title_color,hero_title_stroke: settings.hero_title_stroke }))
    setKvSaved(true); setKvSaving(false); setIsKvEditing(false)
    setTimeout(() => setKvSaved(false), 3000)
  }

  const togglePoints = async () => {
    const next = settings.points_enabled === 'true' ? 'false' : 'true'
    setSettings(s => ({ ...s, points_enabled: next }))
    setSavedSettings(s => ({ ...s, points_enabled: next }))
    await supabase.from('site_settings').upsert({ key: 'points_enabled', value: next, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }

  const handleCancelKv = () => {
    setSettings(prev => ({ ...prev, ...savedSettings }))
    setIsKvEditing(false)
  }

  const UploadField = ({ field, label, hint, accept = 'image/*' }: { field: string; label: string; hint: string; accept?: string }) => (
    <div>
      <label className="block text-stone-700 text-sm font-medium mb-1">{label}</label>
      <p className="text-stone-400 text-xs mb-2">{hint}</p>
      {isKvEditing ? (
        <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-stone-300 hover:border-orange-300 rounded-xl py-3 cursor-pointer transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span className="text-sm text-stone-500">{uploading[field] ? '上傳中...' : '點擊上傳'}</span>
          <input type="file" accept={accept} className="hidden" disabled={uploading[field]}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(field, f) }} />
        </label>
      ) : (
        <div className="w-full border border-stone-200 rounded-xl py-3 px-4 bg-stone-50 text-sm text-stone-400 text-center">
          {(settings as any)[field] ? '已上傳' : '未設定'}
        </div>
      )}
      {aspectWarning[field] && (
        <p className="text-xs text-orange-500 mt-1.5">{aspectWarning[field]}</p>
      )}
      {(settings as any)[field] && (
        <div className="mt-2 relative rounded-xl overflow-hidden border border-stone-200">
          <img src={(settings as any)[field]} alt={label} className="w-full h-28 object-cover" />
          {isKvEditing && (
            <button type="button" onClick={() => setSettings(s => ({ ...s, [field]: '' }))}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-stone-600 hover:text-red-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )

  // 影片上傳欄位
  const VideoUploadField = () => (
    <div>
      <label className="block text-stone-700 text-sm font-medium mb-1">背景影片</label>
      <p className="text-stone-400 text-xs mb-1">支援 MP4（H.264），建議小於 10MB，桌機手機共用</p>
      <p className="text-stone-400 text-xs mb-2">⚠️ 設定影片後，靜態背景底圖將被影片取代</p>
      {isKvEditing ? (
        <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-orange-200 hover:border-orange-400 rounded-xl py-3 cursor-pointer transition-colors bg-orange-50/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span className="text-sm text-orange-600">{uploading['hero_video'] ? '上傳中...' : '點擊上傳影片'}</span>
          <input type="file" accept="video/mp4,video/*" className="hidden" disabled={uploading['hero_video']}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload('hero_video', f) }} />
        </label>
      ) : (
        <div className="w-full border border-stone-200 rounded-xl py-3 px-4 bg-stone-50 text-sm text-stone-400 text-center">
          {settings.hero_video ? '已設定影片' : '未設定'}
        </div>
      )}
      {settings.hero_video && (
        <div className="mt-2 relative rounded-xl overflow-hidden border border-stone-200">
          <video src={settings.hero_video} className="w-full h-28 object-cover" muted />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          {isKvEditing && (
            <button type="button" onClick={() => setSettings(s => ({ ...s, hero_video: '' }))}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-stone-600 hover:text-red-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )

  const textFields = [
    { key: 'site_title', label: '網站主標題', placeholder: '央北社宅活動報名系統', hint: '顯示在 KV 上的大標題（不設定則不顯示）' },
    { key: 'site_subtitle', label: '網站副標題', placeholder: '歡迎報名參加社區活動', hint: '主標題下方說明文字' },
    { key: 'site_description', label: '活動介紹說明', placeholder: '歡迎加入央北社宅的活動！', hint: '首頁詳細說明文字', multiline: true },
    { key: 'footer_note', label: '頁面底部說明文字', placeholder: '央北社宅 · 種子戶團隊', hint: '顯示在網站最下方，可填聯絡資訊或注意事項' },
    { key: 'contact_email', label: '', placeholder: 'yangbeiseed2022@gmail.com', hint: '顯示在頁面底部' },
    { key: 'line_community_url', label: '央北社區大學 LINE 社群連結', placeholder: 'https://line.me/R/ti/g/xxxxxxxx', hint: '填入後，課程列表上方會顯示綠色「社區大學」入口按鈕' },
  ]

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-stone-800 text-2xl font-bold">網站設定</h2>
        <p className="text-stone-400 mt-1 text-sm">管理前台報名網站的顯示內容</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
{([['content','網站文字內容'],['kv','首頁視覺'],['schedule','課表設定']] as const).map(([t, label]) => (          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* 網站文字內容 Tab */}
      {tab === 'content' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h3 className="font-semibold text-stone-700">集點功能</h3>
              <p className="text-stone-400 text-xs mt-0.5">關閉後，前台個人中心不會顯示集點卡與兌換項目</p>
            </div>
            <button onClick={togglePoints}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${settings.points_enabled === 'true' ? 'bg-orange-500' : 'bg-stone-200'}`}
              title={settings.points_enabled === 'true' ? '關閉集點功能' : '開啟集點功能'}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.points_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}

      {tab === 'content' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-700">網站文字內容</h3>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium px-4 py-2 bg-orange-50 rounded-xl transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                編輯
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancelContent} className="text-sm text-stone-500 px-4 py-2 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors">取消</button>
                <button onClick={handleContentSave} disabled={saving}
                  className="text-sm text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl transition-colors disabled:bg-stone-300">
                  {saving ? '儲存中...' : saved ? '已儲存！' : '儲存'}
                </button>
              </div>
            )}
          </div>
          <div className="p-6 space-y-4">
            {textFields.map(f => (
              <div key={f.key}>
                <label className="block text-stone-700 text-sm font-medium mb-1">{f.label}</label>
                {f.hint && <p className="text-stone-400 text-xs mb-1.5">{f.hint}</p>}
                {(f as any).multiline ? (
                  <textarea value={(settings as any)[f.key]} onChange={e => isEditing && setSettings({...settings, [f.key]: e.target.value})}
                    placeholder={f.placeholder} rows={3} readOnly={!isEditing}
                    className={`w-full border rounded-xl px-4 py-3 text-sm resize-none transition-colors ${isEditing ? 'border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-800 bg-white' : 'border-stone-200 bg-stone-50 text-stone-600 cursor-not-allowed'}`} />
                ) : (
                  <input value={(settings as any)[f.key]} onChange={e => isEditing && setSettings({...settings, [f.key]: e.target.value})}
                    placeholder={f.placeholder} readOnly={!isEditing}
                    className={`w-full border rounded-xl px-4 py-3 text-sm transition-colors ${isEditing ? 'border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-300 text-stone-800 bg-white' : 'border-stone-200 bg-stone-50 text-stone-600 cursor-not-allowed'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KV Tab — 只有圖片/影片，已移除課程類別 */}
      {tab === 'schedule' && (
        <div className="space-y-6">
          {/* 聯繫資訊 */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <div>
                <h3 className="font-semibold text-stone-700">聯繫資訊</h3>
                <p className="text-stone-400 text-xs mt-0.5">顯示在課表底部</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'schedule_phone', label: '洽詢電話', placeholder: '03-286-0010' },
                { key: 'schedule_contact', label: '聯絡窗口', placeholder: '聯繫 街道案子有限公司 — 林小姐' },
                { key: 'schedule_hours', label: '服務時間', placeholder: '週一至週五 10:00 – 18:00' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-stone-700 text-sm font-medium mb-1.5">{f.label}</label>
                  <input
                    value={(settings as any)[f.key]}
                    onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full border border-stone-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setSaving(true)
                    await upsertSettings(['schedule_phone','schedule_contact','schedule_hours'])
                    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
                  }}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? '儲存中...' : saved ? '已儲存！' : '儲存'}
                </button>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700">QR Code 圖片</h3>
              <p className="text-stone-400 text-xs mt-0.5">課表左側顯示的兩個 QR Code</p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: 'schedule_register_qr', label: '活動報名 QR Code', hint: '建議 400×400px 以上，PNG/JPG' },
                { key: 'schedule_community_qr', label: '種子社區大學社群 QR Code', hint: '建議 400×400px 以上，PNG/JPG' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-stone-700 text-sm font-medium mb-1">{f.label}</label>
                  <p className="text-stone-400 text-xs mb-2">{f.hint}</p>
                  <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-stone-300 hover:border-orange-300 rounded-xl py-3 cursor-pointer transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-sm text-stone-500">{uploading[f.key] ? '上傳中...' : '點擊上傳'}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={uploading[f.key]}
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(f.key, file) }} />
                  </label>
                  {(settings as any)[f.key] && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-stone-200">
                      <img src={(settings as any)[f.key]} alt={f.label} className="w-full h-28 object-contain bg-stone-50" />
                      <button type="button" onClick={() => setSettings(s => ({ ...s, [f.key]: '' }))}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setSaving(true)
                    await upsertSettings(['schedule_register_qr','schedule_community_qr'])
                    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
                  }}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? '儲存中...' : saved ? '已儲存！' : '儲存'}
                </button>
              </div>
            </div>
          </div>

          {/* 合作夥伴 Logo */}
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-700">合作夥伴</h3>
              <p className="text-stone-400 text-xs mt-0.5">顯示在課表底部的 Logo 與名稱（共 3 個）</p>
            </div>
            <div className="p-6 space-y-6">
              {[
                { logoKey: 'schedule_logo_1', nameKey: 'schedule_logo_1_name', label: '合作夥伴 1' },
                { logoKey: 'schedule_logo_2', nameKey: 'schedule_logo_2_name', label: '合作夥伴 2' },
                { logoKey: 'schedule_logo_3', nameKey: 'schedule_logo_3_name', label: '合作夥伴 3' },
              ].map(f => (
                <div key={f.logoKey} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <label className="block text-stone-700 text-sm font-medium mb-1.5">{f.label} 名稱</label>
                    <input
                      value={(settings as any)[f.nameKey]}
                      onChange={e => setSettings({ ...settings, [f.nameKey]: e.target.value })}
                      className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-stone-700 text-sm font-medium mb-1.5">Logo</label>
                    <label className="flex items-center justify-center gap-1 w-full border-2 border-dashed border-stone-300 hover:border-orange-300 rounded-xl py-2 cursor-pointer transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span className="text-xs text-stone-500">{uploading[f.logoKey] ? '上傳中...' : '上傳'}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={uploading[f.logoKey]}
                        onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(f.logoKey, file) }} />
                    </label>
                    {(settings as any)[f.logoKey] && (
                      <div className="mt-1 relative rounded-lg overflow-hidden border border-stone-200">
                        <img src={(settings as any)[f.logoKey]} alt="" className="w-full h-12 object-contain bg-stone-50" />
                        <button type="button" onClick={() => setSettings(s => ({ ...s, [f.logoKey]: '' }))}
                          className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    setSaving(true)
                    await upsertSettings(['schedule_logo_1','schedule_logo_2','schedule_logo_3','schedule_logo_1_name','schedule_logo_2_name','schedule_logo_3_name'])
                    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000)
                  }}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors"
                >
                  {saving ? '儲存中...' : saved ? '已儲存！' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'kv' && (
        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <div>
              <h3 className="font-semibold text-stone-700">首頁視覺圖片（KV）</h3>
              <p className="text-stone-400 text-xs mt-0.5">分別上傳桌機版與手機版的背景底圖和去背人物圖</p>
            </div>
            {!isKvEditing ? (
              <button onClick={() => setIsKvEditing(true)}
                className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium px-4 py-2 bg-orange-50 rounded-xl transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                編輯
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleCancelKv} className="text-sm text-stone-500 px-4 py-2 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors">取消</button>
                <button onClick={handleKvSave} disabled={kvSaving}
                  className="text-sm text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl transition-colors disabled:bg-stone-300">
                  {kvSaving ? '儲存中...' : kvSaved ? '已儲存！' : '儲存'}
                </button>
              </div>
            )}
          </div>
          <div className="p-6 space-y-6">

            <div>
  <label className="block text-stone-700 text-sm font-medium mb-1">底圖透明度</label>
  <p className="text-stone-400 text-xs mb-3">數值越低越透明，0 = 完全隱藏，1 = 完全顯示</p>
  <div className="flex items-center gap-4">
    <input
      type="range" min="0" max="1" step="0.01"
      value={settings.hero_bg_opacity || '0.18'}
      disabled={!isKvEditing}
      onChange={e => setSettings({...settings, hero_bg_opacity: e.target.value})}
      className="flex-1"
    />
    <span className="text-sm font-medium text-stone-700 w-10 text-right">
      {parseFloat(settings.hero_bg_opacity || '0.18').toFixed(2)}
    </span>
  </div>
</div>
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-stone-700 text-sm font-medium mb-1">主標題顏色</label>
    <div className="flex items-center gap-3">
      <input type="color"
        value={settings.hero_title_color || '#1c1917'}
        disabled={!isKvEditing}
        onChange={e => setSettings({...settings, hero_title_color: e.target.value})}
        className="w-10 h-10 rounded-lg border border-stone-300 cursor-pointer disabled:cursor-not-allowed" />
      <span className="text-sm text-stone-500 font-mono">{settings.hero_title_color || '#1c1917'}</span>
    </div>
  </div>
  <div>
    <label className="block text-stone-700 text-sm font-medium mb-1">外框顏色 <span className="text-stone-400 font-normal">（留空則無外框）</span></label>
    <div className="flex items-center gap-3">
      <input type="color"
        value={settings.hero_title_stroke || '#ffffff'}
        disabled={!isKvEditing}
        onChange={e => setSettings({...settings, hero_title_stroke: e.target.value})}
        className="w-10 h-10 rounded-lg border border-stone-300 cursor-pointer disabled:cursor-not-allowed" />
      <div className="flex items-center gap-2">
        <span className="text-sm text-stone-500 font-mono">{settings.hero_title_stroke || '無'}</span>
        {settings.hero_title_stroke && isKvEditing && (
          <button type="button" onClick={() => setSettings({...settings, hero_title_stroke: ''})}
            className="text-xs text-red-400 hover:text-red-600">清除</button>
        )}
      </div>
    </div>
  </div>
</div>
<div className="border-t border-stone-100 pt-6">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4">靜態背景底圖（影片未設定時顯示）</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">桌機版（16:9）</p>
                  <UploadField field="hero_image_desktop" label="背景底圖" hint="建議比例 16:9（例如 1920 × 1080px），JPG/PNG，小於 3MB" />
                  <UploadField field="hero_cutout_desktop" label="人物去背圖（PNG）" hint="PNG 透明背景，建議人物高度 800px 以上" accept="image/png" />
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">手機版（9:16）</p>
                  <UploadField field="hero_image_mobile" label="背景底圖" hint="建議：1080 × 1920px，JPG/PNG，小於 3MB" />
                  <UploadField field="hero_cutout_mobile" label="人物去背圖（PNG）" hint="PNG 透明背景，建議人物高度 600px 以上" accept="image/png" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
