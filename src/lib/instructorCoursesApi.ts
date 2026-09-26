import { getInstructorToken, clearInstructorSession } from './instructor-auth'

async function instructorFetch(path: string, options: RequestInit = {}) {
  const token = getInstructorToken()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-instructor-token': token || '', ...(options.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (res.status === 401) {
    // 登入憑證過期或不存在：清掉本機登入狀態，讓講師回首頁重新用 LINE 登入
    clearInstructorSession()
    throw new Error('登入已過期，請重新用 LINE 登入後再操作')
  }
  if (!res.ok) throw new Error(body.error || '操作失敗')
  return body
}

export function createInstructorCourse(payload: Record<string, any>) {
  return instructorFetch('/api/instructor/courses', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateInstructorCourse(id: string, payload: Record<string, any>) {
  return instructorFetch(`/api/instructor/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

// 更新課程並順便寫一筆課程異動紀錄（course_edit_logs），對應原本編輯課程表單那個 update
export function updateInstructorCourseWithLog(id: string, data: Record<string, any>) {
  return instructorFetch(`/api/instructor/courses/${id}`, { method: 'PATCH', body: JSON.stringify({ logChange: true, data }) })
}

export function cancelInstructorRegistration(id: string) {
  return instructorFetch(`/api/instructor/registrations/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })
}

export function deleteInstructorRegistration(id: string) {
  return instructorFetch(`/api/instructor/registrations/${id}`, { method: 'DELETE' })
}
