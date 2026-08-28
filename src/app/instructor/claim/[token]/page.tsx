'use client'

import { Suspense, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

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
  const params = useParams()
  const raw = params?.token
  const token = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : null
  // error 理論上不會跟 token 同時出現在這個路徑格式（伺服器失敗時是導回不帶 token 的 /instructor/claim?error=xxx），
  // 這裡保留判斷純粹是防禦性寫法，避免有人手動組出奇怪的網址
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

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

  // 改成需要使用者真的點擊才會導向 LINE，不用頁面一載入就自動觸發：
  // 部分手機瀏覽器（尤其 Samsung Internet 等有預先載入/預覽機制的瀏覽器）
  // 會在使用者還沒真正點開連結前，就先在背景把頁面內容載入一次，
  // 如果是自動觸發的寫法，會在使用者不知情的狀況下先對 LINE 發出一次授權請求，
  // 等使用者真的點開時再發出第二次，兩次互相頂替導致 code 失效。
  // 改成真人點擊才觸發，瀏覽器的背景預覽機制不會模擬點擊，能徹底避免這個情況
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-5">
        <div>
          <p className="text-stone-800 font-semibold mb-2">講師身份綁定</p>
          <p className="text-stone-400 text-sm">請點下方按鈕，用你的 LINE 帳號完成綁定。</p>
        </div>
        <ClaimButton token={token} />
      </div>
    </div>
  )
}

function ClaimButton({ token }: { token: string }) {
  // 網路較慢時，使用者常常以為沒反應而重複點擊：這組邀請連結一旦第一次點擊成功綁定，
  // claim_token 就會被清空，緊接著的第二次點擊會被判定「邀請連結已失效」，變成後台系統健康頁
  // 常見的誤判來源。href 仍維持靜態產生（不是點擊時才組網址），避免上面提到的瀏覽器預覽機制
  // 誤觸發；只是額外擋掉「同一頁面內的第二次真人點擊」
  const clickedRef = useRef(false)
  const [clicked, setClicked] = useState(false)

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (clickedRef.current) { e.preventDefault(); return }
    clickedRef.current = true
    setClicked(true)
  }

  return (
    <a
      href={getLineLoginUrl(token)}
      onClick={handleClick}
      aria-disabled={clicked}
      className={`inline-block bg-orange-500 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors ${clicked ? 'opacity-50 pointer-events-none' : 'hover:bg-orange-600'}`}
    >
      {clicked ? '導向 LINE 登入中…' : '用 LINE 登入完成綁定'}
    </a>
  )
}

export default function InstructorClaimTokenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone-400 text-sm">載入中…</div>}>
      <ClaimContent />
    </Suspense>
  )
}
