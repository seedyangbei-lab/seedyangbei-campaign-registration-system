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
