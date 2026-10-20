function getSessionId(): string {
  let id = localStorage.getItem('funnel_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('funnel_session_id', id)
  }
  return id
}

// fire-and-forget：不 await，失敗也不影響使用者操作，長輩端完全無感。
// supabase client 用動態 import 延後載入：前台首頁的課程卡片會引用這支檔案，
// 靜態 import 會讓整包 supabase-js 跟著首頁一起下載，拖慢首頁可以操作的時間。
export function logFunnelStep(step: string, courseIds?: string, detail?: Record<string, any>) {
  try {
    const row = {
      session_id: getSessionId(),
      step,
      course_ids: courseIds || null,
      detail: detail || null,
    }
    import('@/lib/supabase')
      .then(({ createClient }) => createClient().from('funnel_logs').insert(row))
      .then(() => {}, () => {})
  } catch {}
}
