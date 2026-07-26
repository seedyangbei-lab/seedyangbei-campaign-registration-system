import { createServerClient } from '@/lib/supabase-server'
import HeroDesktop from '@/components/HeroDesktop'
import WorldScrollHero from '@/components/WorldScrollHero'
import CourseCard from '@/components/CourseCard'
import GreetingBar from '@/components/GreetingBar'
import RegistrationSteps from '@/components/RegistrationSteps'
import FirstVisitLoginModal from '@/components/FirstVisitLoginModal'
import SiteNavbar from '@/components/SiteNavbar'

export const revalidate = 60

export default async function HomePage() {
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

  // 合作講師：courses.instructor_ids 是多人陣列，這裡解析成完整姓名清單給 CourseCard 顯示（對照 Figma node 224-11542/128-7754）
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
      <FirstVisitLoginModal />
      <SiteNavbar siteTitle={s.site_title} />

      {/* 手機版 Hero：Scroll to World 捲動大門動畫，取代原本的底圖＋KV 插圖橫幅。
          順序照 /world 試看頁驗證過的邏輯：導覽列 > 報名步驟條 > 捲動影片，
          三段要收在第一個 100vh 裡，WorldScrollHero 內部會量測步驟條實際高度去扣。
          只在 md 以下顯示，桌機版完全不受影響。 */}
      <div className="md:hidden">
        <RegistrationSteps id="world-steps" />
        <WorldScrollHero mobileOnly />
      </div>

      {/* 桌機版 Hero：左文右圖不對稱佈局，維持原樣不動，只在 md 以上顯示 */}
      <HeroDesktop settings={s} />
      <div className="hidden md:block">
        <RegistrationSteps />
      </div>

      <GreetingBar course={activeCourses[0] ? {
        title: activeCourses[0].title,
        date: activeCourses[0].date,
        time_start: activeCourses[0].time_start,
        location: activeCourses[0].location,
      } : null} />

      {/* 從課程列表開始才鋪頁面底色 */}
      <div className="relative bg-stone-50">
        {/* Course List */}
        <section id="courses" className="max-w-[800px] mx-auto px-6 py-8 scroll-mt-20">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-4 mb-4">
            {/* 「近期課程活動」標題跟「N 個課程開放報名」合成一個直向 grid，置左 */}
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-stone-600">近期課程活動</h2>
              {courses && courses.length > 0 && (
                <span className="text-sm text-stone-500 whitespace-nowrap">{activeCourses.length} 個課程開放報名</span>
              )}
            </div>
            {/* 手機版專用的「加入社群」入口，桌機版改放在 Hero 主標題旁邊當次要按鈕（見 HeroDesktop.tsx）
                items-center 讓按鈕跟左側兩行文字垂直置中對齊 */}
            {s.line_community_url && (
              <a
                href={s.line_community_url}
                target="_blank"
                rel="noopener noreferrer"
                className="md:hidden flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80 flex-shrink-0"
                style={{ backgroundColor: '#06C755' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                加入社群
              </a>
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
