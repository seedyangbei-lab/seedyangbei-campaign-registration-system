import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyResidentToken } from '@/lib/resident-auth-server'

// 居民報名：原本前端直接用 anon key 寫 users（新建/更新）＋ registrations（insert），
// 而且 lineUserId 是前端自己宣告的，等於任何人都能冒用別人的 LINE 身份改資料、報名。
// 這是唯一「隨時都有真人在用、沒有講師/後台登入保護」的公開路徑，改法比照講師/後台：
// 只信任 x-resident-token 解出來的 lineUserId，不相信 request body 裡任何身份宣告。
// 報名表單預填：回傳本人上次報名填過的資料（身份從 resident token 解出）。
// 原本前端用 anon key 依 localStorage 自稱的 lineUserId 直接查 users，任何人都能查別人的姓名、電話、房號。
export async function GET(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) return NextResponse.json(null)
  const supabase = createServerClient()
  const { data } = await supabase
    .from('users')
    .select('name, room_number, phone, age_group, other_community')
    .eq('line_id', lineUserId)
    .maybeSingle()
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const lineUserId = verifyResidentToken(req.headers.get('x-resident-token'))
  if (!lineUserId) {
    return NextResponse.json({ error: '登入已過期，請重新用 LINE 登入' }, { status: 401 })
  }

  const { courseIds, name, phone, ageGroup, questions, isSocialHousing, roomNumber, otherCommunity } = await req.json() as {
    courseIds: string[]
    name: string
    phone: string
    ageGroup: string
    questions?: string
    isSocialHousing: boolean
    roomNumber: string
    otherCommunity?: string
  }

  if (!Array.isArray(courseIds) || courseIds.length === 0 || !name || !phone || !ageGroup || !roomNumber) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = createServerClient()

  try {
    let userId: string
    const { data: existingByLine } = await supabase
      .from('users').select('id').eq('line_id', lineUserId).maybeSingle()

    if (existingByLine) {
      userId = existingByLine.id
      await supabase.from('users').update({
        name, room_number: roomNumber,
        phone, age_group: ageGroup,
        other_community: isSocialHousing ? null : (otherCommunity || null),
      }).eq('id', userId)
    } else {
      const { data: newUser, error: userErr } = await supabase.from('users').insert({
        name, room_number: roomNumber, phone,
        email: `${lineUserId}@line.user`,
        line_id: lineUserId, age_group: ageGroup,
        other_community: isSocialHousing ? null : (otherCommunity || null),
      }).select('id').single()
      if (userErr) throw userErr
      userId = newUser.id
    }

    // 同一帳號同一堂課只能有一筆有效報名（已報名／已出席）。前台雖然會把已報名的課標成「已報名」，
    // 但登入過期時前台判斷不出來，學員重新登入後會把整批課再送一次（2026-10-07 發生過）。
    // 資料庫也有 partial unique index 擋（sql/2026-10-07_registrations_unique_active.sql），撞到 23505 一樣跳過
    const { data: activeRegs } = await supabase
      .from('registrations').select('course_id')
      .eq('user_id', userId).in('course_id', courseIds).in('status', ['confirmed', 'attended'])
    const alreadyRegistered = new Set((activeRegs || []).map((r: any) => r.course_id))

    for (const courseId of courseIds) {
      if (alreadyRegistered.has(courseId)) continue
      const { error: regErr } = await supabase.from('registrations').insert({
        user_id: userId, course_id: courseId,
        questions: questions || null,
        is_social_housing_resident: isSocialHousing,
        other_community: isSocialHousing ? null : (otherCommunity || null),
        status: 'confirmed',
      })
      if (regErr && regErr.code !== '23505') throw regErr
    }

    return NextResponse.json({ ok: true, userId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '報名失敗，請稍後再試' }, { status: 400 })
  }
}
