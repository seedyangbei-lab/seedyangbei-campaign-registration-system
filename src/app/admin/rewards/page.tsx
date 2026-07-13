'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface RewardItem {
  id: string
  name: string
  description: string
  points_required: number
  stock: number
  is_active: boolean
  created_at: string
}

interface Redemption {
  id: string
  status: string
  requested_at: string
  processed_at: string | null
  processed_by: string | null
  notes: string | null
  reward_items: { name: string; points_required: number } | null
  line_members: { id: string; display_name: string; picture_url: string | null; points: number } | null
}

const emptyForm = { name: '', description: '', points_required: 1, stock: 10, is_active: true }

export default function RewardsPage() {
  const [tab, setTab] = useState<'redemptions' | 'items'>('redemptions')
  const [items, setItems] = useState<RewardItem[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [filterStatus, setFilterStatus] = useState('pending')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<RewardItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [memberModal, setMemberModal] = useState<Redemption | null>(null)
  const [memberLogs, setMemberLogs] = useState<any[]>([])
  const [memberLogsLoading, setMemberLogsLoading] = useState(false)
  const [pointsEnabled, setPointsEnabled] = useState(true)
  const supabase = createClient()

  const fetchItems = async () => {
    const { data } = await supabase.from('reward_items').select('*').order('created_at')
    setItems(data || [])
  }

  const fetchRedemptions = async () => {
    const { data } = await supabase
      .from('redemptions')
      .select('*, reward_items(name, points_required), line_members(id, display_name, picture_url, points)')
      .order('requested_at', { ascending: false })
    setRedemptions(data || [])
  }

  const fetchPointsSetting = async () => {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'points_enabled').maybeSingle()
    setPointsEnabled((data?.value ?? 'true') === 'true')
  }

  const togglePoints = async () => {
    const next = !pointsEnabled
    setPointsEnabled(next)
    await supabase.from('site_settings').upsert({ key: 'points_enabled', value: String(next), updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }

  useEffect(() => { fetchItems(); fetchRedemptions(); fetchPointsSetting() }, [])

  const openAdd = () => { setEditTarget(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (item: RewardItem) => {
    setEditTarget(item)
    setForm({ name: item.name, description: item.description || '', points_required: item.points_required, stock: item.stock, is_active: item.is_active })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    if (editTarget) {
      await supabase.from('reward_items').update(form).eq('id', editTarget.id)
    } else {
      await supabase.from('reward_items').insert(form)
    }
    setShowModal(false); await fetchItems(); setLoading(false)
  }

  const handleApprove = async (redemption: Redemption) => {
    setProcessing(redemption.id)
    const memberId = redemption.line_members?.id
    const points = redemption.reward_items?.points_required || 0
    if (!memberId) { setProcessing(null); return }

    await supabase.from('redemptions').update({
      status: 'approved',
      processed_at: new Date().toISOString(),
      processed_by: '管理員',
    }).eq('id', redemption.id)

    await supabase.from('point_logs').insert({
      line_member_id: memberId,
      delta: -points,
      reason: `兌換獎勵：${redemption.reward_items?.name}`,
      related_redemption_id: redemption.id,
    })

    await supabase.from('reward_items').update({
      stock: Math.max(0, (items.find(i => i.name === redemption.reward_items?.name)?.stock || 0) - 1)
    }).eq('name', redemption.reward_items?.name || '')

    await fetchRedemptions(); await fetchItems()
    setProcessing(null)
  }

  const handleReject = async (id: string) => {
    setProcessing(id)
    await supabase.from('redemptions').update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
      processed_by: '管理員',
    }).eq('id', id)
    await fetchRedemptions()
    setProcessing(null)
  }

  const openMemberModal = async (redemption: Redemption) => {
    setMemberModal(redemption)
    setMemberLogsLoading(true)
    setMemberLogs([])
    const memberId = redemption.line_members?.id
    if (memberId) {
      const { data } = await supabase
        .from('point_logs')
        .select('*')
        .eq('line_member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(20)
      setMemberLogs(data || [])
    }
    setMemberLogsLoading(false)
  }

  const filtered = redemptions.filter(r => filterStatus === 'all' ? true : r.status === filterStatus)

  const statusLabel = (s: string) => ({ pending: '待審核', approved: '已核發', rejected: '已拒絕' }[s] || s)
  const statusStyle = (s: string) => ({
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-stone-100 text-stone-500',
  }[s] || 'bg-stone-100 text-stone-500')

  const pendingCount = redemptions.filter(r => r.status === 'pending').length

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-stone-800 text-2xl font-bold">集點獎勵</h2>
          <p className="text-stone-400 mt-1 text-sm">管理獎勵品項與兌換申請</p>
        </div>
        {tab === 'items' && (
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增獎勵
          </button>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h3 className="font-semibold text-stone-700">集點功能</h3>
            <p className="text-stone-400 text-xs mt-0.5">關閉後，前台個人中心不會顯示集點卡與兌換項目</p>
          </div>
          <button onClick={togglePoints}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${pointsEnabled ? 'bg-orange-500' : 'bg-stone-200'}`}
            title={pointsEnabled ? '關閉集點功能' : '開啟集點功能'}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${pointsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
        {([['redemptions', '兌換申請', pendingCount], ['items', '獎勵品項', 0]] as const).map(([t, label, count]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {label}
            {count > 0 && <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{count}</span>}
          </button>
        ))}
      </div>

      {/* 兌換申請 Tab */}
      {tab === 'redemptions' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[['pending','待審核'], ['approved','已核發'], ['rejected','已拒絕'], ['all','全部']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterStatus === v ? 'bg-stone-700 text-white' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                {l}
                {v !== 'all' && <span className="ml-1.5 opacity-70">{redemptions.filter(r => r.status === v).length}</span>}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400">尚無記錄</div>
            )}
            {filtered.map(r => (
              <div key={r.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  {r.line_members?.picture_url
                    ? <img src={r.line_members.picture_url} alt="" className="w-12 h-12 rounded-full flex-shrink-0" />
                    : <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-600 font-bold text-lg">{r.line_members?.display_name?.[0]}</span>
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-stone-800 font-semibold">{r.line_members?.display_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(r.status)}`}>{statusLabel(r.status)}</span>
                    </div>
                    <p className="text-stone-600 text-sm">
                      兌換：<span className="font-medium">{r.reward_items?.name}</span>
                      <span className="text-stone-400 ml-2">（{r.reward_items?.points_required} 點）</span>
                    </p>
                    <p className="text-stone-400 text-xs mt-0.5">
                      申請時間：{r.requested_at?.split('T')[0]}
                      {r.processed_at && <span className="ml-2">· 處理：{r.processed_at?.split('T')[0]}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openMemberModal(r)}
                      className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg transition-colors">
                      查看會員
                    </button>
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(r)} disabled={processing === r.id}
                          className="text-xs bg-green-500 hover:bg-green-600 disabled:bg-stone-300 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
                          {processing === r.id ? '處理中...' : '核發'}
                        </button>
                        <button onClick={() => handleReject(r.id)} disabled={processing === r.id}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                          拒絕
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {r.notes && (
                  <div className="mt-3 bg-stone-50 rounded-xl px-4 py-2.5 text-sm text-stone-600 border border-stone-100">
                    備註：{r.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 獎勵品項 Tab */}
      {tab === 'items' && (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400">尚無獎勵品項</div>
          )}
          {items.map(item => (
            <div key={item.id} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                  <path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="text-stone-800 font-semibold">{item.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                    {item.is_active ? '開放兌換' : '已關閉'}
                  </span>
                </div>
                {item.description && <p className="text-stone-400 text-sm truncate">{item.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-lg">{item.points_required} 點</span>
                  <span className="text-xs text-stone-400">庫存：{item.stock}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(item)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors text-stone-500">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onClick={async () => {
                  if (!confirm('確定要刪除這個獎勵品項嗎？')) return
                  await supabase.from('reward_items').delete().eq('id', item.id)
                  fetchItems()
                }} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-stone-400 hover:text-red-500">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 查看會員彈窗 */}
      {memberModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setMemberModal(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <div className="flex items-center gap-3">
                {memberModal.line_members?.picture_url
                  ? <img src={memberModal.line_members.picture_url} alt="" className="w-10 h-10 rounded-full" />
                  : <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><span className="text-green-600 font-bold">{memberModal.line_members?.display_name?.[0]}</span></div>
                }
                <div>
                  <h3 className="font-bold text-stone-800">{memberModal.line_members?.display_name}</h3>
                  <p className="text-stone-400 text-xs">目前點數：<span className="text-orange-500 font-bold">{memberModal.line_members?.points ?? 0} 點</span></p>
                </div>
              </div>
              <button onClick={() => setMemberModal(null)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-6 py-3 border-b border-stone-100 bg-stone-50">
              <p className="text-xs text-stone-500 font-medium">申請兌換：<span className="text-stone-700">{memberModal.reward_items?.name}</span> · {memberModal.reward_items?.points_required} 點</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">點數歷程（最近 20 筆）</p>
              {memberLogsLoading ? (
                <div className="text-center py-8 text-stone-400 text-sm">載入中...</div>
              ) : memberLogs.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">尚無點數記錄</div>
              ) : (
                <div className="space-y-2">
                  {memberLogs.map(log => (
                    <div key={log.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3 border border-stone-100">
                      <div>
                        <p className="text-stone-700 text-sm">{log.reason}</p>
                        <p className="text-stone-400 text-xs mt-0.5">{log.created_at?.split('T')[0]}</p>
                      </div>
                      <span className={`text-sm font-bold ${log.delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {log.delta > 0 ? '+' : ''}{log.delta}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯彈窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-stone-200">
              <h3 className="font-bold text-stone-800">{editTarget ? '編輯獎勵' : '新增獎勵'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-xl">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">獎勵名稱 *</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="例：環保購物袋"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-stone-600 text-sm font-medium mb-1.5">說明 <span className="text-stone-400 font-normal">（選填）</span></label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="簡短描述這個獎勵"
                  className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">所需點數 *</label>
                  <input required type="number" min="1" value={form.points_required}
                    onChange={e => setForm({...form, points_required: Number(e.target.value)})}
                    className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
                <div>
                  <label className="block text-stone-600 text-sm font-medium mb-1.5">庫存數量 *</label>
                  <input required type="number" min="0" value={form.stock}
                    onChange={e => setForm({...form, stock: Number(e.target.value)})}
                    className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
                <span className="text-stone-600 text-sm font-medium">開放兌換</span>
                <button type="button" onClick={() => setForm({...form, is_active: !form.is_active})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-orange-500' : 'bg-stone-200'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white font-medium py-3 rounded-xl text-sm transition-colors">
                  {loading ? '儲存中...' : '儲存'}
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-medium py-3 rounded-xl text-sm transition-colors">
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
