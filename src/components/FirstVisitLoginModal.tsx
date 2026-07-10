'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY = 'yangbei_seen_login_prompt'
const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'

type Step = 'prompt' | 'benefits'

const BENEFITS: { title: string; desc: string; icon: React.ReactNode }[] = [
  {
    title: '報名更快速',
    desc: '自動帶入你的資料，下次報名不用重填',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
      </svg>
    ),
  },
  {
    title: '查看活動紀錄',
    desc: '隨時回顧你參加過的所有活動',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    title: '第一手活動消息',
    desc: '最新活動資訊在這裡最快公布',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-6v14l-18-6v-2z" /><path d="M8 15v4a2 2 0 0 0 2 2h1v-6" />
      </svg>
    ),
  },
]

function BindIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2" width="10" height="20" rx="2.2" />
      <path d="M11 18h2" />
      <path d="M3 8c1.4 0 2.4 1 2.4 2.4S4.4 12.8 3 12.8" />
      <path d="M21 8c-1.4 0-2.4 1-2.4 2.4S19.6 12.8 21 12.8" />
      <path d="M9.5 7.5l1.3 1.6L14 6.8" />
    </svg>
  )
}

function BenefitsIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      <circle cx="18" cy="6" r="3.4" fill="#f97316" stroke="none" />
      <path d="M16.7 6l1 1 1.8-1.8" stroke="white" strokeWidth="1.4" />
    </svg>
  )
}

export default function FirstVisitLoginModal() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('prompt')

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.has('line_user')) return
      if (localStorage.getItem('line_user')) return
      if (localStorage.getItem(SEEN_KEY) === 'true') return
      const timer = setTimeout(() => {
        setMounted(true)
        requestAnimationFrame(() => setVisible(true))
      }, 1200)
      return () => clearTimeout(timer)
    } catch {}
  }, [])

  const markSeen = () => {
    try { localStorage.setItem(SEEN_KEY, 'true') } catch {}
  }

  const close = () => {
    markSeen()
    setVisible(false)
    setTimeout(() => setMounted(false), 300)
  }

  const handleBind = () => {
    markSeen()
    const nonce = Math.random().toString(36).slice(2)
    const statePayload = JSON.stringify({ url: `${window.location.origin}/`, nonce })
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINE_CHANNEL_ID,
      redirect_uri: LINE_CALLBACK_URL,
      state: statePayload,
      scope: 'profile openid email',
    })
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={close}
      />
      <div
        className={`absolute left-1/2 bottom-0 -translate-x-1/2 w-full max-w-[390px] bg-stone-50 rounded-t-3xl px-6 pt-3 pb-10 flex flex-col items-center gap-4 shadow-[0_-4px_10px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <button onClick={close} className="w-full flex justify-center py-0.5" aria-label="關閉">
          <span className="w-10 h-1 rounded-full bg-stone-300" />
        </button>

        {step === 'prompt' ? (
          <>
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-[200px] h-[200px] rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <BindIllustration />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-xl font-bold text-stone-600 leading-7">
                  綁定 <span className="text-green-600">LINE</span> 後不錯過任何活動消息
                  <br />還可以隨時查看以前的活動紀錄喔！
                </p>
                <p className="text-sm text-stone-500">用 LINE 帳號登入，免費、安全、不會傳訊息給好友</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleBind}
                className="w-full bg-orange-500 hover:bg-orange-600 transition-colors text-white text-base font-medium rounded-xl px-4 py-2"
              >
                綁定 LINE 帳號
              </button>
              <button
                onClick={() => setStep('benefits')}
                className="w-full text-center text-base font-medium text-stone-600 rounded-xl px-4 py-2 hover:bg-stone-100 transition-colors"
              >
                我先了解一下
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-[200px] h-[200px] rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <BenefitsIllustration />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-xl font-bold text-stone-600 leading-7">
                  綁定 <span className="text-green-600">LINE</span> 後，有這些好處！
                </p>
                <p className="text-sm text-stone-500">只要一個步驟，馬上享有以下功能</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3">
              {BENEFITS.map(b => (
                <div key={b.title} className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-stone-800">
                    {b.icon}
                    <p className="text-base font-bold text-stone-800">{b.title}</p>
                  </div>
                  <p className="text-sm text-stone-600">{b.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
