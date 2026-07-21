import WorldScrollHero from '@/components/WorldScrollHero'

// 試看頁，不放進主導覽、也不影響現正上線的首頁。
// 網址：/world。等五段影片生成好放進 public/videos/world/ 之後就會自動生效。
export const metadata = { title: '央北社宅 · 滾動世界試看' }

export default function WorldPage() {
  return (
    <main>
      <WorldScrollHero />
    </main>
  )
}
