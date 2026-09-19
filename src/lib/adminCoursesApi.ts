import { getAdminToken } from './admin-auth'

async function adminFetch(path: string, options: RequestInit = {}) {
  const token = getAdminToken()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '', ...(options.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || '操作失敗')
  return body
}

export function createCourse(payload: Record<string, any>) {
  return adminFetch('/api/admin/courses', { method: 'POST', body: JSON.stringify(payload) })
}

export function updateCourse(id: string, payload: Record<string, any>) {
  return adminFetch(`/api/admin/courses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
}

export function deleteCourse(id: string) {
  return adminFetch(`/api/admin/courses/${id}`, { method: 'DELETE' })
}
