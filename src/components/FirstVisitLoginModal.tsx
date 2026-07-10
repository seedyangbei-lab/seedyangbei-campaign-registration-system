'use client'

import { useEffect, useState } from 'react'

const SEEN_KEY = 'yangbei_seen_login_prompt'
const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'

type Step = 'prompt' | 'benefits'

// 好處清單的 icon 用同一顆 sprite SVG 裁切三個 24x24 的 frame，統一主色橘 #F97316。
function BenefitSpriteIcon({ y }: { y: number }) {
  return (
    <div className="w-6 h-6 overflow-hidden relative flex-shrink-0">
      <svg width="24" height="216" viewBox="0 0 24 216" fill="none" className="absolute left-0" style={{ top: `-${y}px` }} aria-hidden="true">
        {/* frame 1（0-24）：時鐘 - 報名更快速 */}
        <circle cx="12" cy="12" r="9" stroke="#F97316" strokeWidth="1.8" />
        <path d="M12 7v5l3.5 2" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* frame 2（96-120）：旗標/紀錄 - 查看活動紀錄 */}
        <path d="M9 99v18" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 100c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0v9c-1.5 1.5-3 1.5-4.5 0s-3-1.5-4.5 0z" stroke="#F97316" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="16.5" cy="105" r="0.75" fill="#78716C" />

        {/* frame 3（192-216）：擴音器 - 第一手活動消息 */}
        <path d="M3 199v6a2 2 0 0 0 2 2h1l1 5h2l-1-5h1l9 4v-16l-9 4H5a2 2 0 0 0-2 2z" stroke="#F97316" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M19 200a5 5 0 0 1 0 8" stroke="#78716C" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  )
}

const BENEFITS: { title: string; desc: string; icon: React.ReactNode }[] = [
  {
    title: '報名更快速',
    desc: '自動帶入你的資料，下次報名不用重填',
    icon: <BenefitSpriteIcon y={0} />,
  },
  {
    title: '查看活動紀錄',
    desc: '隨時回顧你參加過的所有活動',
    icon: <BenefitSpriteIcon y={96} />,
  },
  {
    title: '第一手活動消息',
    desc: '最新活動資訊在這裡最快公布',
    icon: <BenefitSpriteIcon y={192} />,
  },
]


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
              <div className="w-[200px] h-[200px] flex items-center justify-center flex-shrink-0">
                <img src="/illustrations/modal-login-guide.png" alt="" width={200} height={200} className="w-full h-full object-contain" />
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
                className="w-full bg-orange-500 hover:bg-orange-600 transition-colors text-white text-base font-medium rounded-[10px] px-4 py-2"
              >
                綁定 LINE 帳號
              </button>
              <button
                onClick={() => setStep('benefits')}
                className="w-full text-center text-base font-medium text-stone-600 rounded-[10px] px-4 py-2 hover:bg-stone-100 transition-colors"
              >
                我先了解一下
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-[200px] h-[200px] flex items-center justify-center flex-shrink-0">
                <img src="/illustrations/modal-benefits.png" alt="" width={200} height={200} className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-xl font-bold text-stone-600 leading-7">
                  綁定 <span className="text-green-600">LINE</span> 後，有這些好處！
                </p>
                <p className="text-sm text-stone-500">只要一個步驟，馬上享有以下功能</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3">
              {BENEFITS.map((b, i) => (
                <div
                  key={b.title}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col gap-1 benefit-slide-in"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  <div className="flex items-center gap-1.5 text-orange-500">
                    {b.icon}
                    <p className="text-base font-bold text-stone-800">{b.title}</p>
                  </div>
                  <p className="text-sm text-stone-600">{b.desc}</p>
                </div>
              ))}
              <button
                onClick={handleBind}
                className="w-full bg-orange-500 hover:bg-orange-600 transition-colors text-white text-base font-medium rounded-[10px] px-4 py-2 mt-1"
              >
                綁定 LINE 帳號
              </button>
              <button
                onClick={close}
                className="w-full text-center text-base font-medium text-stone-600 rounded-[10px] px-4 py-2 hover:bg-stone-100 transition-colors"
              >
                先等等好了
              </button>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .benefit-slide-in {
          opacity: 0;
          transform: translateX(24px);
          animation: benefitSlideIn 0.4s ease-out forwards;
        }
        @keyframes benefitSlideIn {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
