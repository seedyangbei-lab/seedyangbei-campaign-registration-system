'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ClaimContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')

  // 相容舊格式連結（?token=xxx query string）：一律轉址到新的路徑格式 /instructor/claim/xxx。
  // 改用路徑參數是因為部分 Android 裝置／訊息 App 的連結預覽或清除追蹤參數機制，
  // 偶爾會把 query string 整個拿掉，導致這裡讀不到 token（畫面會誤判成「邀請連結無效」），
  // 路徑參數是網址本身的一部分，不會被這類機制單獨拆掉
  useEffect(() => {
    if (token && !error) {
      router.replace(`/instructor/claim/${token}`)
    }
  }, [token, error, router])

  // error 一定要優先判斷：伺服器導回的錯誤網址本來就不會帶 token，
  // 如果先判斷 !token 會讓「綁定失敗（連結已被取代/過期）」永遠被誤判成通用的「邀請連結無效」，
  // 使用者看到的訊息會對不上真正發生的狀況，不利於判斷根因
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-stone-800 font-semibold mb-2">綁定失敗</p>
          <p className="text-stone-400 text-sm">
            {error === 'expired' ? '這組邀請連結已過期，請聯繫負責人重新產生。' : '這組邀請連結已被新產生的連結取代，或已完成綁定，請聯繫負責人確認最新連結。'}
          </p>
        </div>
      </div>
    )
  }

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
