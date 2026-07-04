import { createClient } from '@/lib/supabase'

function getSessionId(): string {
  let id = localStorage.getItem('funnel_session_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('funnel_session_id', id)
  }
  return id
}

// fire-and-forget：不 await，失敗也不影響使用者操作，長輩端完全無感
export function logFunnelStep(step: string, courseIds?: string, detail?: Record<string, any>) {
  try {
    const supabase = createClient()
    supabase.from('funnel_logs').insert({
      session_id: getSessionId(),
      step,
      course_ids: courseIds || null,
      detail: detail || null,
    }).then(() => {})
  } catch {}
}
