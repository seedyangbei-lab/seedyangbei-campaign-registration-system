import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 「用戶查詢」頁面資料來源：合併兩種身份
// - LINE 會員（line_members 表）
// - 未綁定 LINE、但曾經被建檔的居民（users 表裡 line_id 是 null 的人，通常是現場報到建的檔）
// 用 source 欄位標記身份，前端據此決定要顯示 LINE 徽章還是「未綁定LINE」徽章、
// 以及集點功能只對 LINE 會員開放（未綁定的人在資料結構上沒有點數欄位）
export async function GET() {
  const [lineRes, userRes] = await Promise.all([
    supabase.from('line_members').select('*').order('created_at', { ascending: false }),
    supabase.from('users').select('id, name, room_number, created_at').is('line_id', null).order('created_at', { ascending: false }),
  ])

  if (lineRes.error) return NextResponse.json({ error: lineRes.error.message }, { status: 500 })
  if (userRes.error) return NextResponse.json({ error: userRes.error.message }, { status: 500 })

  const lineMembers = (lineRes.data || []).map(m => ({ ...m, source: 'line' as const }))
  const unboundMembers = (userRes.data || []).map(u => ({
    id: u.id,
    source: 'unbound' as const,
    display_name: u.name,
    line_user_id: null,
    picture_url: null,
    building: null,
    unit_number: null,
    floor_number: null,
    notes: null,
    points: null,
    created_at: u.created_at,
    room_number: u.room_number,
  }))

  return NextResponse.json([...lineMembers, ...unboundMembers])
}
