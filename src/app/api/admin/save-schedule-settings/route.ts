import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-token')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const updates: { key: string; value: string }[] = body.settings || []
  if (updates.length === 0) {
    return NextResponse.json({ ok: true })
  }
  const now = new Date().toISOString()
  const rows = updates.map(({ key, value }) => ({ key, value, updated_at: now }))
  // 原本是逐筆 await upsert（設定越多次數越多），改成一次陣列 upsert，只跑一次來回
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
