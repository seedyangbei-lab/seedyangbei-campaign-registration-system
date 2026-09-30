'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ResidentFeedbackForm } from '@/components/CourseFeedbackForm'
import { getStoredLineUser } from '@/lib/resident-auth'

// 手機版課程回饋問卷（電腦版在個人頁用彈窗開同一個表單元件）
function FeedbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registrationId = searchParams.get('registrationId')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      if (!getStoredLineUser()) { router.replace('/'); return }
    } catch {
      router.replace('/'); return
    }
    if (!registrationId) { router.replace('/profile'); return }
    setReady(true)
  }, [registrationId])

  if (!ready || !registrationId) return null
  return <ResidentFeedbackForm registrationId={registrationId} variant="page" onClose={() => router.push('/profile')} />
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <FeedbackContent />
    </Suspense>
  )
}
