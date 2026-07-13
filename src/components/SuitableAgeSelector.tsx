'use client'

export const AGE_OPTIONS = ['全年齡', '16歲以上', '親子友善', '長輩友善', '其他']

type Props = {
  value: string // 目前選中的 pill：'全年齡' | '16歲以上' | '親子友善' | '長輩友善' | '其他'
  customValue: string // 選「其他」時的自訂內容
  onChange: (value: string) => void
  onCustomChange: (value: string) => void
}

export default function SuitableAgeSelector({ value, customValue, onChange, onCustomChange }: Props) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap gap-2 w-full">
        {AGE_OPTIONS.map(opt => {
          const isSelected = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 px-1.5 py-2 rounded-md text-[11px] leading-none font-medium whitespace-nowrap transition-colors ${
                isSelected ? 'bg-orange-500 text-white' : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {value === '其他' && (
        <input
          value={customValue}
          onChange={e => onCustomChange(e.target.value)}
          placeholder="請說明適合年齡（例：6歲以下需要長輩陪同）"
          className="w-full h-9 bg-white border border-stone-200 rounded-md px-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      )}
    </div>
  )
}
