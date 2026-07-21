import { createServerClient } from '@/lib/supabase-server'
import WorldScrollHero from '@/components/WorldScrollHero'
import CourseCard from '@/components/CourseCard'
import SiteNavbar from '@/components/SiteNavbar'

export const revalidate = 60
export const metadata = { title: '央北社宅 · 滾動世界試看' }

// 試看頁，不放進主導覽、也不影響現正上線的首頁。網址：/world。
// 單幕滾動動畫（大門外觀→走進大門→開門見光）捲完之後，正常接續下方課程列表——
// 這段課程列表邏輯跟首頁一致（複製自 src/app/page.tsx），純粹是試看頁獨立運作，
// 改這裡不會動到首頁的 src/app/page.tsx。
export default async function WorldPage() {
  const supabase = createServerClient()
  const [{ data: settings }, { data: courses }, { data: categories }, { data: allInstructors }] = await Promise.all([
    supabase.from('site_settings').select('key, value'),
    supabase.from('courses')
      .select('*, instructors(id, name, phone, line_id), course_categories(id, name, color)')
      .eq('is_active', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .order('time_start', { ascending: true }),
    supabase.from('course_categories').select('*').order('created_at'),
    supabase.from('instructors').select('id, name'),
  ])

  const instructorMap = new Map((allInstructors || []).map((i: any) => [i.id, i]))
  const coursesWithInstructors = (courses || []).map((c: any) => {
    const ids: string[] = (c.instructor_ids && c.instructor_ids.length > 0) ? c.instructor_ids : (c.instructor_id ? [c.instructor_id] : [])
    const instructors_list = ids.map(id => instructorMap.get(id)).filter(Boolean)
    return { ...c, instructors_list }
  })

  const now = new Date()
  const activeCourses = coursesWithInstructors.filter((c: any) => {
    const endDt = new Date(`${c.date}T${c.time_end}`)
    return endDt > now
  })
  const s = Object.fromEntries((settings || []).map((x: any) => [x.key, x.value]))

  return (
    <main className="min-h-screen">
      <SiteNavbar siteTitle={s.site_title} variant="inner" />
      <WorldScrollHero />

      <div className="relative bg-stone-50">
        <section id="courses" className="max-w-[800px] mx-auto px-6 py-8 scroll-mt-20">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-4">
            <h2 className="text-xl font-bold text-stone-600">近期課程活動</h2>
            {courses && courses.length > 0 && (
              <span className="text-sm text-stone-500">{activeCourses.length} 個課程開放報名</span>
            )}
          </div>
          {!activeCourses || activeCourses.length === 0 ? (
            <div className="text-center py-24 text-stone-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-30">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
              </svg>
              <p className="text-lg font-medium text-stone-500">目前尚無開放報名的課程</p>
              <p className="text-sm mt-1">請稍後再回來查看</p>
            </div>
          ) : (
            <CourseCard courses={activeCourses as any} categories={categories || []} />
          )}
        </section>

        <footer className="border-t border-stone-200 py-10 px-6">
          <div className="max-w-4xl mx-auto text-center text-stone-400 text-sm space-y-1">
            {s.footer_note ? <p className="whitespace-pre-line">{s.footer_note}</p> : <p>央北社宅 · 種子戶團隊</p>}
            {s.contact_email && <p>聯絡信箱：{s.contact_email}</p>}
          </div>
        </footer>
      </div>
    </main>
  )
}
