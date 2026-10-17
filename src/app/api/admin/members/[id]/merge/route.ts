import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'

const ACTIVE = ['confirmed', 'attended']

// 把「未綁定 LINE」的居民紀錄（通常是現場報到時找不到人、手動新建的）併進一位 LINE 會員：
// - 報名紀錄移到 LINE 會員的 users 帳號底下；同一堂課 LINE 會員已經有有效報名的話，保留 LINE 會員那筆，
//   手動那筆的回饋問卷（若 LINE 會員那筆還沒填）一併搬過去，再刪掉手動那筆
// - 手動帳號沒綁 LINE，當時出席沒記到點，搬過去的「已出席」紀錄補發點數（已經有點數紀錄的不重發）
// - 最後刪掉手動建的帳號
// LINE 會員還沒有 users 紀錄（從沒報名過）時，直接把手動帳號綁上這個 LINE，不用搬資料
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { targetLineMemberId } = await req.json() as { targetLineMemberId?: string }
  if (!targetLineMemberId) return NextResponse.json({ error: '請選擇要合併的 LINE 會員' }, { status: 400 })

  const supabase = createServerClient()

  const [{ data: src }, { data: member }] = await Promise.all([
    supabase.from('users').select('id, name, line_id').eq('id', id).maybeSingle(),
    supabase.from('line_members').select('id, line_user_id, display_name').eq('id', targetLineMemberId).maybeSingle(),
  ])
  if (!src) return NextResponse.json({ error: '找不到這筆未綁定紀錄' }, { status: 404 })
  if (src.line_id) return NextResponse.json({ error: '這筆紀錄已經綁定 LINE，不能合併' }, { status: 400 })
  if (!member) return NextResponse.json({ error: '找不到這位 LINE 會員' }, { status: 404 })

  const { data: srcRegs, error: regErr } = await supabase
    .from('registrations').select('id, course_id, status, courses(title)').eq('user_id', src.id)
  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })

  const { data: target } = await supabase.from('users').select('id').eq('line_id', member.line_user_id).maybeSingle()

  // 要補點數的報名（搬過去且狀態是已出席）
  const toAward: { id: string; title: string }[] = []

  if (!target) {
    const { error } = await supabase.from('users').update({ line_id: member.line_user_id }).eq('id', src.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    for (const r of srcRegs || []) {
      if (r.status === 'attended') toAward.push({ id: r.id, title: (r.courses as any)?.title || '' })
    }
  } else {
    const { data: targetRegs } = await supabase
      .from('registrations').select('id, course_id, status').eq('user_id', target.id)
      .in('course_id', (srcRegs || []).map(r => r.course_id))

    for (const r of srcRegs || []) {
      const sameCourse = (targetRegs || []).filter(t => t.course_id === r.course_id)
      const targetActive = sameCourse.find(t => ACTIVE.includes(t.status))

      // 同一堂課兩邊都有紀錄、而 LINE 會員那筆有效 → 保留 LINE 會員那筆；
      // 兩邊都沒效（取消／未出席）也不必留重複的那筆
      if (targetActive || (sameCourse.length > 0 && !ACTIVE.includes(r.status))) {
        if (targetActive) {
          const { data: targetFb } = await supabase.from('course_feedbacks').select('id').eq('registration_id', targetActive.id).maybeSingle()
          if (!targetFb) {
            await supabase.from('course_feedbacks')
              .update({ registration_id: targetActive.id, user_id: target.id }).eq('registration_id', r.id)
          }
        }
        const { error } = await supabase.from('registrations').delete().eq('id', r.id)
        if (error) return NextResponse.json({ error: `刪除重複報名失敗：${error.message}` }, { status: 500 })
        // 手動那筆是現場報到（已出席），LINE 會員那筆還停在「已報名」→ 改成已出席並補點數
        if (targetActive && r.status === 'attended' && targetActive.status === 'confirmed') {
          await supabase.from('registrations').update({ status: 'attended' }).eq('id', targetActive.id)
          toAward.push({ id: targetActive.id, title: (r.courses as any)?.title || '' })
        }
        continue
      }

      const { error } = await supabase.from('registrations').update({ user_id: target.id }).eq('id', r.id)
      if (error) return NextResponse.json({ error: `搬移報名紀錄失敗：${error.message}` }, { status: 500 })
      await supabase.from('course_feedbacks').update({ user_id: target.id }).eq('registration_id', r.id)
      if (r.status === 'attended') toAward.push({ id: r.id, title: (r.courses as any)?.title || '' })
    }

    const { error } = await supabase.from('users').delete().eq('id', src.id)
    if (error) return NextResponse.json({ error: `刪除未綁定紀錄失敗：${error.message}` }, { status: 500 })
  }

  let awarded = 0
  if (toAward.length > 0) {
    const { data: existing } = await supabase.from('point_logs').select('related_registration_id')
      .in('related_registration_id', toAward.map(a => a.id))
    const already = new Set((existing || []).map(p => p.related_registration_id))
    const rows = toAward.filter(a => !already.has(a.id)).map(a => ({
      line_member_id: member.id,
      delta: 1,
      reason: `出席課程：${a.title}`,
      related_registration_id: a.id,
      created_by: 'admin',
    }))
    if (rows.length > 0) {
      const { error } = await supabase.from('point_logs').insert(rows)
      if (error) console.error('merge point_logs insert error:', error)
      else awarded = rows.length
    }
  }

  return NextResponse.json({ ok: true, moved: (srcRegs || []).length, awarded })
}
