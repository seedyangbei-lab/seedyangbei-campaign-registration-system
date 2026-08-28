// 前臺課程列表只顯示「本月＋下個月」還沒開始的課程。
// 課程沒有特別標註年份，顯示範圍拉太長（比如從 9 月排到隔年 2 月）容易讓人搞混。
export function getCourseDisplayRangeEnd(now: Date = new Date()): string {
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  return rangeEnd.toISOString().split('T')[0]
}
