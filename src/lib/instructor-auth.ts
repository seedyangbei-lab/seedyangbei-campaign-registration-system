export function getInstructorToken(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem('instructor_line_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed.instructorToken || null
  } catch {
    return null
  }
}
