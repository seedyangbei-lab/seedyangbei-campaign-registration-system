import { getAdminToken } from './admin-auth'

export async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '', ...(options.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || '操作失敗')
  return body
}

export function cancelRegistration(id: string) {
  return adminFetch(`/api/admin/registrations/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) })
}

export function deleteRegistration(id: string) {
  return adminFetch(`/api/admin/registrations/${id}`, { method: 'DELETE' })
}

export function updateUserRoomNumber(id: string, room_number: string | null) {
  return adminFetch(`/api/admin/members/${id}`, { method: 'PATCH', body: JSON.stringify({ table: 'users', room_number }) })
}

export function updateLineMember(id: string, payload: {
  building: string | null; unit_number: string | null; floor_number: string | null; notes: string | null
}) {
  return adminFetch(`/api/admin/members/${id}`, { method: 'PATCH', body: JSON.stringify({ table: 'line_members', ...payload }) })
}

export function getFeedbackOverview(params: { month?: string; responses?: boolean } = {}) {
  const q = new URLSearchParams()
  if (params.month) q.set('month', params.month)
  if (params.responses) q.set('responses', '1')
  return adminFetch(`/api/admin/feedback${q.toString() ? `?${q}` : ''}`)
}

export function getCourseFeedbackDetail(courseId: string) {
  return adminFetch(`/api/admin/feedback/${courseId}`)
}

export function getMembers() {
  return adminFetch('/api/admin/members')
}

export function getRegistrations(params: {
  courseId?: string; userId?: string; lineUserId?: string
  statuses?: string[]; view?: 'participation'; order?: 'asc' | 'desc'
} = {}) {
  const q = new URLSearchParams()
  if (params.courseId) q.set('courseId', params.courseId)
  if (params.userId) q.set('userId', params.userId)
  if (params.lineUserId) q.set('lineUserId', params.lineUserId)
  if (params.statuses?.length) q.set('statuses', params.statuses.join(','))
  if (params.view) q.set('view', params.view)
  if (params.order) q.set('order', params.order)
  return adminFetch(`/api/admin/registrations${q.toString() ? `?${q}` : ''}`)
}

export function generateInstructorClaimLink(instructorId: string) {
  return adminFetch('/api/instructor/generate-claim-link', { method: 'POST', body: JSON.stringify({ instructorId }) })
}
