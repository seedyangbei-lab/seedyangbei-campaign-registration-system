import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { verifyAdminToken } from '@/lib/admin-auth-server'
import { loadCourseFeedbackDetail } from '@/lib/courseFeedbackServer'

// 後台：單一課程的回饋明細（含填寫者姓名、房號、是否講師代填）
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  if (!verifyAdminToken(req.headers.get('x-admin-token'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { courseId } = await params
  const detail = await loadCourseFeedbackDetail(createServerClient(), courseId)
  if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(detail)
}
