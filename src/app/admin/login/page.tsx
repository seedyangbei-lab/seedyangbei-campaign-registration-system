'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const secret = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'yangbei2024admin'
    if (password === secret) { localStorage.setItem('admin_auth', 'true'); router.push('/admin') }
    else { setError('密碼錯誤，請重新輸入'); setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-100 rounded-2xl mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <p className="text-stone-400 text-sm tracking-widest uppercase mb-1">央北社宅</p>
          <h1 className="text-stone-800 text-2xl font-bold">後台登入</h1>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm">
          <div>
            <label className="block text-stone-600 text-sm font-medium mb-2">管理密碼</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="請輸入管理密碼"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl transition-colors">
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      </div>
    </main>
  )
}
