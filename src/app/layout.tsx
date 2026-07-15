import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "央北社宅活動報名",
  description: "央北社宅活動課程報名平台",
  icons: {
    icon: [
      { url: "/favicons/front-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/front-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/front-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/favicons/front-32.png",
    apple: "/favicons/front-64.png",
  },
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
