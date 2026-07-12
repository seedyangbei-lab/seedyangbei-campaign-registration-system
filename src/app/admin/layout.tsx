'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminNavbar from '@/components/AdminNavbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/admin/login') return
    try {
      const raw = localStorage.getItem('admin_auth')
      if (!raw) { router.replace('/admin/login'); return }
      const auth = JSON.parse(raw)
      if (!auth.token || !auth.expires || Date.now() > auth.expires) {
        localStorage.removeItem('admin_auth')
        router.replace('/admin/login')
      }
    } catch {
      localStorage.removeItem('admin_auth')
      router.replace('/admin/login')
    }
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNavbar />
      <AdminSidebar />
      <div className="md:ml-60 pt-16 md:pt-14">
        {children}
      </div>
    </div>
  )
}
