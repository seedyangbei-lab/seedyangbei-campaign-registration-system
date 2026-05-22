'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/admin/login') return
    const auth = localStorage.getItem('admin_auth')
    if (auth !== 'true') router.replace('/admin/login')
  }, [pathname])

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminSidebar />
      <div className="md:ml-60 pt-16 md:pt-0">
        {children}
      </div>
    </div>
  )
}
