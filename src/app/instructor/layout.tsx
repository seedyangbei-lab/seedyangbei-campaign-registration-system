import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "央北社宅活動系統講師中台",
  icons: {
    icon: [
      { url: "/favicons/instructor-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/instructor-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/instructor-64.png", sizes: "64x64", type: "image/png" },
    ],
    shortcut: "/favicons/instructor-32.png",
    apple: "/favicons/instructor-64.png",
  },
};

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
