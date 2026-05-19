import { createServerClient } from '@/lib/supabase-server'
import HeroSection from '@/components/HeroSection'
import CourseCard from '@/components/CourseCard'

export const revalidate = 60

export default async function HomePage() {
  const supabase = createServerClient()
  const [{ data: settings }, { data: courses }, { data: categories }] = await Promise.all([
    supabase.from('site_settings').select('key, value'),
    supabase.from('courses')
     .select('*, instructors(id, name, phone, line_id), course_categories(id, name, color)')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true }),
    supabase.from('course_categories').select('*').order('created_at'),
  ])

  const s = Object.fromEntries((settings || []).map((x: any) => [x.key, x.value]))

  return (
    <main className="min-h-screen bg-stone-50">
      <HeroSection settings={s} />

      {/* 報名步驟 */}
      <section className="bg-orange-50 border-b border-orange-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-3.5">
          <div className="flex flex-wrap gap-3 md:gap-8 items-center text-sm text-stone-600">
            <p className="text-sm font-bold text-stone-700 hidden md:block">如何報名？</p>
            {['用 LINE 帳號登入', '勾選想參加的課程', '確認資料送出完成'].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                <span className="text-xs md:text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 活動介紹說明（如果有設定才顯示） */}
      {s.site_description && (
        <section className="max-w-4xl mx-auto px-6 pt-8">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-6 py-4">
            <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{s.site_description}</p>
          </div>
        </section>
      )}

      {/* Course List */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-stone-700">近期課程活動</h2>
          {courses && courses.length > 0 && (
            <span className="text-sm text-stone-400">{courses.length} 個課程開放報名</span>
          )}
        </div>
        {!courses || courses.length === 0 ? (
          <div className="text-center py-24 text-stone-400">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-30">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
            </svg>
            <p className="text-lg font-medium text-stone-500">目前尚無開放報名的課程</p>
            <p className="text-sm mt-1">請稍後再回來查看</p>
          </div>
        ) : (
        <CourseCard courses={courses as any} categories={categories || []} lineCommunityUrl={s.line_community_url || ''} />
      )}
      </section>

      <footer className="border-t border-stone-200 py-10 px-6">
        <div className="max-w-4xl mx-auto text-center text-stone-400 text-sm space-y-1">
          {s.footer_note ? <p className="whitespace-pre-line">{s.footer_note}</p> : <p>央北社宅 · 種子戶團隊</p>}
          {s.contact_email && <p>聯絡信箱：{s.contact_email}</p>}
        </div>
      </footer>
    </main>
  )
}
