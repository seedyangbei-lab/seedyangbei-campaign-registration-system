import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://yangbei-campaign.vercel.app";
const shareBanner = "/illustrations/share-link-banner.png";

// Vercel 會自動幫每個部署設這個環境變數（production／preview／development），不用自己配置。
// 拿來區分「這是不是正式站」，讓測試站在瀏覽器分頁標題、favicon、頁面頂端都能一眼看出跟正式站不一樣，
// 避免測試的時候搞混兩邊（favicon 原本完全共用，兩邊分頁長得一模一樣）。
const isPreview = process.env.VERCEL_ENV !== "production";
const titlePrefix = isPreview ? "[測試站] " : "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${titlePrefix}央北社宅活動報名`,
  description: "央北社宅活動課程報名平台",
  icons: isPreview
    ? { icon: "/favicons/preview.svg", shortcut: "/favicons/preview.svg" }
    : {
        icon: [
          { url: "/favicons/front-16.png", sizes: "16x16", type: "image/png" },
          { url: "/favicons/front-32.png", sizes: "32x32", type: "image/png" },
          { url: "/favicons/front-64.png", sizes: "64x64", type: "image/png" },
        ],
        shortcut: "/favicons/front-32.png",
        apple: "/favicons/front-64.png",
      },
  openGraph: {
    title: "央北社宅活動報名",
    description: "央北社宅活動課程報名平台",
    url: siteUrl,
    siteName: "央北社宅活動報名",
    images: [{ url: shareBanner, width: 1200, height: 630 }],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "央北社宅活動報名",
    description: "央北社宅活動課程報名平台",
    images: [shareBanner],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">
        {isPreview && (
          <div
            style={{
              position: "sticky", top: 0, zIndex: 9999,
              background: "#dc2626", color: "#fff",
              textAlign: "center", fontSize: "12px", fontWeight: 700,
              padding: "4px 8px", letterSpacing: "1px",
            }}
          >
            測試站 PREVIEW — 非正式環境，資料與正式站共用
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
