import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://yangbei-campaign.vercel.app";
const shareBanner = "/illustrations/share-link-banner.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
