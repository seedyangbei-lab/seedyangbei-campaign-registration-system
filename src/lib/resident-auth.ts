export function getResidentToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('line_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.residentToken || null
  } catch {
    return null
  }
}
