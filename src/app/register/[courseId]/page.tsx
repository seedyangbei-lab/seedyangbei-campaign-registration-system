'use client'

import React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const AGE_GROUPS = [
  '18歲以下', '18~25歲', '26~35歲',
  '36~45歲', '46~55歲', '56~65歲', '65歲以上'
]

export default function RegisterPage({ params }: { params: Promise<{ courseId: string }> }) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSocialHousing, setIsSocialHousing] = useState(true)
  const [form, setForm] = useState({
    name: '',
    room_number: '',
    phone: '',
    email: '',
    line_id: '',
    age_group: '',
    other_community: '',
    questions: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()

      let userId: string

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', form.email)
        .single()

      if (existingUser) {
        userId = existingUser.id
      } else {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            name: form.name,
            room_number: isSocialHousing ? form.room_number : '非社宅居民',
            phone: form.phone,
            email: form.email,
            line_id: form.line_id || null,
            age_group: form.age_group,
          })
          .select('id')
          .single()

        if (userError) throw userError
        userId = newUser.id
      }

      const { error: regError } = await supabase
        .from('registrations')
        .insert({
          user_id: userId,
          course_id: resolvedParams.courseId,
          questions: form.questions || null,
          is_social_housing_resident: isSocialHousing,
          other_community: isSocialHousing ? null : form.other_community,
          status: 'confirmed',
        })

      if (regError) {
        if (regError.code === '23505') {
          setError('您已經報名過這個課程了！')
        } else {
          throw regError
        }
        return
      }

      router.push('/register-success')
    } catch (err: any) {
      setError(err.message || '報名失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="mb-8">
          <a href="/" className="text-stone-400 text-sm hover:text-stone-600">← 返回課程列表</a>
          <h1 className="text-3xl font-bold text-stone-800 mt-4">活動報名</h1>
          <p className="text-stone-500 mt-2">請填寫以下資料完成報名</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">

          {/* 姓名 */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">
              姓名 <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="請輸入您的姓名"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          {/* 居住身份 */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-3">
              居住身份 <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsSocialHousing(true)}
                className={`flex-1 py-3 rounded-xl border text-base font-medium transition-colors ${isSocialHousing ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                社宅居民
              </button>
              <button type="button" onClick={() => setIsSocialHousing(false)}
                className={`flex-1 py-3 rounded-xl border text-base font-medium transition-colors ${!isSocialHousing ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-stone-600 border-stone-300'}`}>
                非社宅居民
              </button>
            </div>
          </div>

          {/* 房號 */}
          {isSocialHousing && (
            <div>
              <label className="block text-base font-medium text-stone-700 mb-2">
                房號 <span className="text-rose-500">*</span>
              </label>
              <input required type="text" value={form.room_number}
                onChange={e => setForm({ ...form, room_number: e.target.value })}
                placeholder="例：A棟 1201"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
          )}

          {/* 其他社區 */}
          {!isSocialHousing && (
            <div>
              <label className="block text-base font-medium text-stone-700 mb-2">
                請說明來自哪個社區 <span className="text-rose-500">*</span>
              </label>
              <input required type="text" value={form.other_community}
                onChange={e => setForm({ ...form, other_community: e.target.value })}
                placeholder="例：附近里民、其他社宅"
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
          )}

          {/* 手機 */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">
              手機號碼 <span className="text-rose-500">*</span>
            </label>
            <input required type="tel" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="0912-345-678"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">
              聯絡 Email <span className="text-rose-500">*</span>
            </label>
            <p className="text-sm text-stone-400 mb-2">
              若無 Email 請填 yangbeiseed2022@gmail.com，將有專人於報名後回覆你
            </p>
            <input required type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="example@gmail.com"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>

          {/* LINE ID */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">
              LINE ID <span className="text-stone-400 font-normal text-sm">（選填）</span>
            </label>
            <input type="text" value={form.line_id}
              onChange={e => setForm({ ...form, line_id: e.target.value })}
              placeholder="請輸入您的 LINE ID"
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>

          {/* 年齡區間 */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-3">
              年齡區間 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AGE_GROUPS.map(age => (
                <button key={age} type="button"
                  onClick={() => setForm({ ...form, age_group: age })}
                  className={`py-3 rounded-xl border text-base transition-colors ${form.age_group === age ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-stone-600 border-stone-300 hover:border-rose-300'}`}>
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* 課前問題 */}
          <div>
            <label className="block text-base font-medium text-stone-700 mb-2">
              課前想說的話 / 想問的問題{' '}
              <span className="text-stone-400 font-normal text-sm">（選填）</span>
            </label>
            <textarea value={form.questions}
              onChange={e => setForm({ ...form, questions: e.target.value })}
              placeholder="有任何想法或問題都可以寫下來～"
              rows={3}
              className="w-full border border-stone-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit"
            disabled={loading || !form.age_group}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-stone-300 text-white font-semibold py-4 rounded-xl text-lg transition-colors">
            {loading ? '報名中...' : '確認報名'}
          </button>
        </form>
      </div>
    </main>
  )
}
