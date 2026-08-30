// 課程首頁列表用：把「已確認 + 已出席」的報名筆數依課程分組計算，
// 附加到課程物件上，讓 CourseCard 可以在額滿時鎖住選取、不用等使用者填完表單才被 DB 擋下來
export function withRegisteredCounts<T extends { id: string }>(
  courses: T[],
  registrations: { course_id: string | null }[]
): (T & { registered_count: number })[] {
  const counts = new Map<string, number>()
  for (const r of registrations) {
    if (!r.course_id) continue
    counts.set(r.course_id, (counts.get(r.course_id) || 0) + 1)
  }
  return courses.map(c => ({ ...c, registered_count: counts.get(c.id) || 0 }))
}
