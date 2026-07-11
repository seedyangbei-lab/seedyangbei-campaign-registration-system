'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const LINE_CHANNEL_ID = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '2010077816'
const LINE_CALLBACK_URL = process.env.NEXT_PUBLIC_LINE_CALLBACK_URL || 'https://yangbei-campaign.vercel.app/api/auth/line/callback'

type SiteNavbarProps = {
  siteTitle?: string
  /** 'home'：首頁，左側顯示網站標題。'inner'：其他內頁，左側顯示「‹ 返回首頁」 */
  variant?: 'home' | 'inner'
  /** 登出後要額外做的事（例如內頁需要導回首頁），單純首頁不用傳 */
  onLogout?: () => void
}

// 全站共用的導覽列：首頁與所有內頁都用同一個元件，只用 variant 切換左側內容，
// 確保「捲動時導覽列不會被滑走」的行為和樣式在每個頁面都一致。
export default function SiteNavbar({ siteTitle, variant = 'home', onLogout }: SiteNavbarProps) {
  const [lineUser, setLineUser] = useState<any>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('line_user')
      if (stored) setLineUser(JSON.parse(stored))
    } catch {}
    const params = new URLSearchParams(window.location.search)
    const lu = params.get('line_user')
    if (lu) {
      try {
        const user = JSON.parse(decodeURIComponent(lu))
        setLineUser(user)
        localStorage.setItem('line_user', JSON.stringify(user))
        window.history.replaceState({}, '', window.location.pathname)
      } catch {}
    }
  }, [])

  const handleLogin = () => {
    const registerUrl = `${window.location.origin}/register`
    const nonce = Math.random().toString(36).slice(2)
    const statePayload = JSON.stringify({ url: registerUrl, nonce })
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINE_CHANNEL_ID,
      redirect_uri: LINE_CALLBACK_URL,
      state: statePayload,
      scope: 'profile openid email',
    })
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params}`
  }

  const handleLogout = () => {
    localStorage.removeItem('line_user')
    setLineUser(null)
    onLogout?.()
  }

  return (
    <div className="sticky top-0 z-40 w-full h-[52px] md:h-14 px-4 md:px-6 flex items-center justify-between bg-white shadow-[0px_4px_2px_rgba(0,0,0,0.03)]">
      {/* 左側：未登入時一律顯示站名（比照 Figma 未登入版，不分首頁/內頁）；已登入時才依 variant 切換 */}
      {!lineUser || variant === 'home' ? (
        <p className="text-sm md:text-xl font-bold text-stone-600 tracking-[3px]">{siteTitle || '央北種子計畫'}</p>
      ) : (
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-stone-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 md:w-5 md:h-5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="text-sm md:text-base font-normal whitespace-nowrap">返回首頁</span>
        </Link>
      )}

      {!lineUser ? (
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 bg-white border border-white rounded-xl px-2.5 py-2 md:px-3 md:py-2.5 shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#06C755">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          <span className="text-xs md:text-base font-medium md:font-normal text-stone-700">LINE 登入</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {/* 大頭貼＋名字：手機／電腦版都顯示，內頁跟首頁一致（比照 Figma） */}
          <Link
            href="/profile"
            className="flex items-center gap-2 h-[34px] bg-white border border-white rounded-xl px-2.5 shadow-[0px_1px_1.5px_rgba(0,0,0,0.1),0px_1px_1px_rgba(0,0,0,0.1)]"
          >
            {lineUser.pictureUrl ? (
              <img src={lineUser.pictureUrl} alt="" className="w-5 h-5 rounded-full flex-shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">{lineUser.displayName?.[0]}</span>
              </div>
            )}
            <span className="text-xs font-medium text-stone-700 max-w-[80px] truncate">{lineUser.displayName}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-white border border-white rounded-xl px-2.5 py-2 md:px-3 md:py-2.5"
          >
            <span className="text-xs text-stone-500">登出</span>
          </button>
        </div>
      )}
    </div>
  )
}
