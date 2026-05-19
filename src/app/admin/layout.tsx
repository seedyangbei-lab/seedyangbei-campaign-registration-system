import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminSidebar />
      <div className="md:ml-60 pt-16 md:pt-0">
        {children}
      </div>
    </div>
  )
}
