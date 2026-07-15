import type { Metadata } from "next";
import AdminLayoutClient from '@/components/AdminLayoutClient'

export const metadata: Metadata = {
  title: "央北社宅活動系統後台",
  icons: {
    icon: [
      { url: "/favicons/admin-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/admin-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/admin-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/favicons/admin-32.png",
    apple: "/favicons/admin-64.png",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
