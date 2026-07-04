'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'

function getLineLoginUrl(token: string) {
  const nonce = Math.random().toString(36).slice(2)
  const statePayload = JSON.stringify({ instructorClaim: token, nonce })
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_CHANNEL_ID,
    redirect_uri: LINE_CALLBACK_URL,
    state: statePayload,
    scope: 'profile openid',
  })
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`
}

function ClaimContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')

  useEffect(() => {
    if (token && !error) {
      window.location.href = getLineLoginUrl(token)
    }
  }, [token, error])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-stone-800 font-semibold mb-2">邀請連結無效</p>
          <p className="text-stone-400 text-sm">請確認連結是否完整，或聯繫負責人重新產生。</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-stone-800 font-semibold mb-2">綁定失敗</p>
          <p className="text-stone-400 text-sm">
            {error === 'expired' ? '這組邀請連結已過期，請聯繫負責人重新產生。' : '邀請連結已被使用或無效，請聯繫負責人重新產生。'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <p className="text-stone-800 font-semibold mb-2">正在導向 LINE 登入…</p>
        <p className="text-stone-400 text-sm">請稍候，即將完成講師身份綁定。</p>
      </div>
    </div>
  )
}

export default function InstructorClaimPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <ClaimContent />
    </Suspense>
  )
}
