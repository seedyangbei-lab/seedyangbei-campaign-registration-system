import { getInstructorToken } from './instructor-auth'

async function instructorFetch(path: string, options: RequestInit = {}) {
  const token = getInstructorToken()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-instructor-token': token || '', ...(options.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
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
