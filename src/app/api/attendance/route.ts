import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { verifyInstructorToken } from '@/lib/instructor-auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 這支 API 後台跟講師中台共用（出席勾選、手動調點），原本完全沒有驗證身份，
// 任何人送對格式的請求就能任意把某筆報名標記出席/未出席、甚至亂發點數。
export async function POST(req: NextRequest) {
  const isAdmin = verifyAdminToken(req.headers.get('x-admin-token'))
  const instructorId = verifyInstructorToken(req.headers.get('x-instructor-token'))
  if (!isAdmin && !instructorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { registrationId, courseTitle, lineUserId, action, delta: manualDelta, reason: manualReason } = body

  // 手動加減點是後台專屬功能，沒有課程可以檢查「是不是你的課」，只信任已登入的後台，講師不開放
  if ((action === 'manual_add' || action === 'manual_deduct') && !isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 講師只能改自己課程底下的報名紀錄的出席狀態，不能亂改別堂課的
  if (!isAdmin && instructorId && registrationId) {
    const { data: reg } = await supabase.from('registrations').select('course_id').eq('id', registrationId).maybeSingle()
    if (!reg) return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
    const { data: course } = await supabase.from('courses').select('instructor_ids').eq('id', reg.course_id).maybeSingle()
    if (!course || !(course.instructor_ids || []).includes(instructorId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  // 出席狀態現在分三種：confirmed(未確認，剛報名還沒被講師review) / attended(已出席) / absent(未出席，講師已review但沒出席)
  // - attend：勾選出席，發點數
  // - unattend：原本已出席被取消勾選，狀態改為 absent，並收回點數
  // - mark_absent：原本從沒出席過（未確認）、講師review後仍未勾選，狀態改為 absent，但沒有點數可收回，不寫 point_logs
  const nextStatus = action === 'attend' ? 'attended' : action === 'mark_absent' ? 'absent' : 'absent'
  const delta = action === 'attend' ? 1
    : action === 'unattend' ? -1
    : (manualDelta ?? 1)

  const reason = action === 'attend' ? `出席課程：${courseTitle}`
    : action === 'unattend' ? `撤銷出席：${courseTitle}`
    : (manualReason || '手動調整')

  // 更新報名狀態、查詢 LINE 會員這兩件事互不相依，平行處理縮短單次請求耗時
  const [, memberResult] = await Promise.all([
    registrationId
      ? supabase.from('registrations').update({ status: nextStatus }).eq('id', registrationId)
      : Promise.resolve(null),
    lineUserId && action !== 'mark_absent'
      ? supabase.from('line_members').select('id').eq('line_user_id', lineUserId).maybeSingle()
      : Promise.resolve(null),
  ])

  // mark_absent 不牽涉點數異動（人本來就沒被記點過），到此結束即可
  if (lineUserId && action !== 'mark_absent') {
    const member = memberResult?.data
    if (member) {
      const { error } = await supabase.from('point_logs').insert({
        line_member_id: member.id,
        delta,
        reason,
        related_registration_id: registrationId || null,
      })
      if (error) console.error('point_logs insert error:', error)
    } else {
      console.error('member not found for lineUserId:', lineUserId)
    }
  }

  return NextResponse.json({ ok: true })
}
