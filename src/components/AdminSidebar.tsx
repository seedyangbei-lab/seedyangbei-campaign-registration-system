'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useBodyScrollLock } from '@/lib/useBodyScrollLock'

type IconFn = (size: number) => React.ReactElement

const navItems: { href: string; label: string; icon: IconFn }[] = [
  {
    href: '/admin',
    label: '總覽',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    ),
  },
  {
    href: '/admin/courses',
    label: '課程管理',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
  },
  {
    href: '/admin/instructors',
    label: '講師管理',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    ),
  },
  {
    href: '/admin/members',
    label: 'LINE 會員',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
  },
  {
    href: '/admin/rewards',
    label: '集點獎勵',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
    ),
  },
  {
    href: '/admin/settings',
    label: '網站設定',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    ),
  },
  {
    href: '/admin/health',
    label: '系統健康',
    icon: (size) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    ),
  },
]

const logoutIcon: IconFn = (size) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
)

const menuIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
)

const closeIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  useBodyScrollLock(mobileOpen)

  const handleLogout = () => {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* 電腦版側邊欄 */}
      <aside className="hidden md:flex w-60 bg-white border-r border-stone-200 flex-col fixed h-full z-40">
        <div className="px-6 py-5 border-b border-stone-200">
          <p className="text-xs text-stone-400 mb-1">央北種子計畫</p>
          <h1 className="text-stone-800 font-bold text-lg">活動管理後台</h1>
        </div>
        <ul className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={true}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${isActive(item.href) ? 'bg-orange-50 text-orange-600' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'}`}
              >
                <span className={isActive(item.href) ? 'text-orange-500' : 'text-stone-400'}>{item.icon(20)}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="px-3 py-4 border-t border-stone-200">
          <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-base font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors">
            <span className="text-orange-500">{logoutIcon(20)}</span>
            <span>登出</span>
          </button>
        </div>
      </aside>

      {/* 手機版頂部列 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 z-50 px-4 flex items-center justify-between">
        <h1 className="text-stone-800 font-bold">活動管理後台</h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? '關閉選單' : '開啟選單'}
          className="text-stone-600 p-1.5 border border-stone-200 rounded-lg"
        >
          {mobileOpen ? closeIcon : menuIcon}
        </button>
      </div>

      {/* 手機版背景遮罩：抽屜展開時鎖住底下畫面 */}
      <div
        onClick={() => setMobileOpen(false)}
        className={`md:hidden fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* 手機版側邊抽屜：由右至左展開，寬度不滿版（300px，依 Figma） */}
      <div
        className={`md:hidden fixed top-16 bottom-0 right-0 w-[300px] bg-white z-40 shadow-xl transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <nav className="flex flex-col h-full">
          <ul className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  prefetch={true}
                  className={`flex items-center gap-2 px-3 h-10 rounded-lg text-sm transition-colors ${isActive(item.href) ? 'bg-orange-50 text-orange-600 font-medium' : 'text-stone-600 font-normal hover:bg-stone-100'}`}
                >
                  <span className={isActive(item.href) ? 'text-orange-500' : 'text-stone-400'}>{item.icon(18)}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-3 py-4 border-t border-stone-200">
            <button
              onClick={() => { setMobileOpen(false); handleLogout() }}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-base font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <span className="text-orange-500">{logoutIcon(24)}</span>
              <span>登出</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  )
}
