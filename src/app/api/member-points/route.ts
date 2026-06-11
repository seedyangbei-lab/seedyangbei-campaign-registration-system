import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get('line_user_id')
  if (!lineUserId) return NextResponse.json(null)

  const { data } = await supabase
    .from('line_members')
    .select('id, points')
    .eq('line_user_id', lineUserId)
    .maybeSingle()

  return NextResponse.json(data ?? null)
}
