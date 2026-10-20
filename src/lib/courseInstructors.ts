// 課程講師名單的共用邏輯：
//   - instructor_ids：實際參與的所有講師（權限、課後報告、後台統計都看這個）
//   - display_instructor_ids：對外要顯示的講師（海報、課程卡、居民報名紀錄），
//     例如一凡姐用自己的中台幫油漆哥開課，可以只勾油漆哥，海報就不會掛上一凡姐的名字
//     NULL／空陣列 = 全部顯示
type CourseInstructorFields = {
  instructor_id?: string | null
  instructor_ids?: string[] | null
  display_instructor_ids?: string[] | null
}

export function courseInstructorIds(course: CourseInstructorFields): string[] {
  if (course.instructor_ids && course.instructor_ids.length > 0) return course.instructor_ids
  return course.instructor_id ? [course.instructor_id] : []
}

// 依 instructor_ids 的順序回傳對外顯示的講師；勾選的人已經不在講師名單裡（被移除）就自動退回全部顯示
export function displayInstructorIds(course: CourseInstructorFields): string[] {
  const ids = courseInstructorIds(course)
  const picked = new Set(course.display_instructor_ids || [])
  const shown = ids.filter(id => picked.has(id))
  return shown.length > 0 ? shown : ids
}

// 存檔前整理：只留還在講師名單裡的人，勾了全部或全沒勾都存 null（= 全部顯示）
export function normalizeDisplayInstructorIds(displayIds: string[] | null | undefined, instructorIds: string[]): string[] | null {
  const shown = instructorIds.filter(id => (displayIds || []).includes(id))
  return shown.length === 0 || shown.length === instructorIds.length ? null : shown
}
