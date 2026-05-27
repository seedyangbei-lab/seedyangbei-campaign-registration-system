export function getAdminToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('admin_auth')
    if (!raw) return null
    const auth = JSON.parse(raw)
    if (!auth.token || Date.now() > auth.expires) return null
    return auth.token
  } catch {
    return null
  }
}
