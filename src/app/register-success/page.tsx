'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const lineUser = searchParams.get('line_user')

  const profileUrl = lineUser ? `/profile?line_user=${lineUser}` : '/'

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h1 className="text-3xl font-bold text-stone-800 mb-4">報名成功！</h1>
        <p className="text-stone-500 mb-8 leading-relaxed text-lg">
          感謝您的報名！<br />我們將透過 LINE 與您聯繫課程相關資訊。
        </p>
        <div className="flex flex-col gap-3">
          <a href={profileUrl}
            className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-base">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            查看我的報名記錄
          </a>
          <Link href="/"
            className="inline-flex items-center justify-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 font-medium px-8 py-3.5 rounded-xl transition-colors text-base">
            返回課程列表
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
