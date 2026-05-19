import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "央北社宅活動報名系統",
  description: "央北社宅活動課程報名平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}
