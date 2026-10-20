'use client'

// 用戶查詢頁（admin/members）的三張 recharts 圖表。
// recharts 本身約 100kB，獨立成一支檔案讓頁面用 next/dynamic 延後載入，
// 會員列表可以先出來，圖表的程式碼在背景下載完再補上。
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const OverallTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid #e7e5e4', borderRadius: 12, padding: '10px 14px', fontSize: 12 }}>
      <p style={{ color: '#78716c', marginBottom: 4 }}>{payload[0]?.payload?.month}</p>
      <p style={{ color: '#f97316', fontWeight: 600 }}>報名次數：{payload[0]?.value} 次</p>
      <p style={{ color: '#a8a29e', fontSize: 11, marginTop: 6 }}>點擊查看當月課程細項 →</p>
    </div>
  )
}

export function PersonalTrendChart({ data, isMobile, memberName }: {
  data: any[]; isMobile: boolean | null; memberName: string
}) {
  return (
    <ResponsiveContainer width="100%" height={isMobile === true ? 150 : 200}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
        {isMobile !== true && <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />}
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }}
          formatter={(v: any) => [`${v} 次`, memberName]}
        />
        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function OverallTrendChart({ data, isMobile, onMonthClick }: {
  data: any[]; isMobile: boolean | null; onMonthClick: (key: string) => void
}) {
  return (
    <ResponsiveContainer width="100%" height={isMobile === true ? 150 : 200}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
        onClick={(e) => {
          if (e?.activePayload?.[0]) onMonthClick(e.activePayload[0].payload.key)
        }}
        style={{ cursor: 'pointer' }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#78716c' }} />
        {isMobile !== true && <YAxis tick={{ fontSize: 12, fill: '#78716c' }} allowDecimals={false} />}
        <Tooltip content={<OverallTooltip />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ fill: '#f97316', r: 5, cursor: 'pointer' }}
          activeDot={{ r: 7, stroke: '#f97316', strokeWidth: 2, fill: 'white' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function MonthBarChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 80 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
        <XAxis
          dataKey="title"
          tick={{ fontSize: 11, fill: '#57534e' }}
          angle={-45}
          textAnchor="end"
          interval={0}
          dy={4}
        />
        <YAxis tick={{ fontSize: 11, fill: '#78716c' }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }}
          formatter={(v: any) => [`${v} 人`, '報名人數']}
        />
        <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
