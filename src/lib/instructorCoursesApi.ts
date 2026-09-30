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

export function getInstructorCourseFeedback(courseId: string) {
  return instructorFetch(`/api/instructor/courses/${courseId}/feedback`)
}

// 講師幫沒有 LINE 帳號的學員代填課程回饋
export function proxyFillCourseFeedback(courseId: string, registrationId: string, answers: Record<string, any>) {
  return instructorFetch(`/api/instructor/courses/${courseId}/feedback`, { method: 'POST', body: JSON.stringify({ registrationId, answers }) })
}

// 目前登入的講師本人資料（身份由伺服器從講師 token 解出）。token 過期／已被後台解除綁定時會丟錯並清掉本機登入狀態
export function getMyInstructorProfile() {
  return instructorFetch('/api/instructor/me')
}

// 講師修改自己的個人資料或海報樣式設定
export function updateMyInstructorProfile(payload: Record<string, any>) {
  return instructorFetch('/api/instructor/me', { method: 'PATCH', body: JSON.stringify(payload) })
}

// 講師自己課程的報名名單（伺服器端會確認這堂課屬於目前登入的講師）
export function getInstructorCourseRegistrations(courseId: string, statuses: string[], order: 'asc' | 'desc' = 'desc') {
  const q = new URLSearchParams({ courseId, statuses: statuses.join(','), order })
  return instructorFetch(`/api/instructor/registrations?${q}`)
}
