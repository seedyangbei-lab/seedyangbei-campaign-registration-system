'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password }),
      })
      if (res.ok) {
        const { token, expires } = await res.json()
        localStorage.setItem('admin_auth', JSON.stringify({ token, expires }))
        router.push('/admin')
      } else {
        setError('帳號或密碼錯誤，請重新輸入')
        setLoading(false)
      }
    } catch {
      setError('網路錯誤，請稍後再試')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col">
      {/* 導覽列：跟全站其他頁面同樣的白底＋陰影樣式，後台登入頁不需要 LINE 登入/返回連結，只顯示站名 */}
      <div className="bg-white drop-shadow-[0px_4px_2px_rgba(0,0,0,0.03)] h-[52px] md:h-14 flex items-center px-4 md:px-6 flex-shrink-0">
        <p className="text-sm md:text-xl font-bold text-stone-600 tracking-[3px]">央北種子計畫</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10 md:py-[100px]">
        {/* 手機版：圖片＋標題＋表單直排置中 */}
        <div className="md:hidden w-full max-w-[384px] flex flex-col items-center gap-4">
          <img src="/illustrations/modal%20instructor.png" alt="" className="w-[200px] h-[200px] object-cover" />
          <div className="text-center -mt-2">
            <p className="font-['GenSenRounded2TW'] text-xs text-stone-400 tracking-[1.4px] uppercase">央北社宅</p>
            <p className="font-['GenSenRounded2TW'] font-bold text-2xl text-stone-800">後台登入</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-stone-200 p-[25px] space-y-4 shadow-sm w-full">
            <div>
              <label className="block font-['GenSenRounded2TW'] font-medium text-sm text-stone-600 mb-2">帳號</label>
              <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="請輸入管理帳號"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
            </div>
            <div>
              <label className="block font-['GenSenRounded2TW'] font-medium text-sm text-stone-600 mb-2">密碼</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="請輸入管理密碼"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg transition-colors">
              {loading ? '登入中...' : '登入'}
            </button>
          </form>
        </div>

        {/* 電腦版：圖片在左，標題＋表單在右（比照 Figma 兩欄式） */}
        <div className="hidden md:flex items-center justify-center gap-8">
          <img src="/illustrations/modal%20instructor.png" alt="" className="w-[429px] h-[429px] object-cover flex-shrink-0" />
          <div className="w-[451px] flex flex-col gap-8">
            <div className="text-center">
              <p className="font-['GenSenRounded2TW'] text-sm text-stone-400 tracking-[1.4px] uppercase">央北社宅</p>
              <p className="font-['GenSenRounded2TW'] font-bold text-2xl text-stone-800">後台登入</p>
            </div>
            <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-stone-200 p-[25px] space-y-4 shadow-sm w-full">
              <div>
                <label className="block font-['GenSenRounded2TW'] font-medium text-sm text-stone-600 mb-2">帳號</label>
                <input type="text" value={account} onChange={e => setAccount(e.target.value)} placeholder="請輸入管理帳號"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
              </div>
              <div>
                <label className="block font-['GenSenRounded2TW'] font-medium text-sm text-stone-600 mb-2">密碼</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="請輸入管理密碼"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-lg transition-colors">
                {loading ? '登入中...' : '登入'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}
