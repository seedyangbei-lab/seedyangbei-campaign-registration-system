import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get('line_user_id')
  if (!lineUserId) return NextResponse.json([])

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('line_id', lineUserId)
    .single()

  if (!user) return NextResponse.json([])

  const { data: regs } = await supabase
    .from('registrations')
    .select('course_id')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')

  return NextResponse.json(regs ?? [])
}
