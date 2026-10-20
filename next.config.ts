import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ["jiquqxptrpivqhsovmrv.supabase.co"],
  },
  // public/ 底下的靜態檔預設只快取很短，每次換頁都要重新驗證。字型分片內容不會變，給長快取；
  // 插圖／影片偶爾會換圖但檔名不變，給一天快取 + 背景更新，兼顧速度跟換圖後能生效。
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // 分片清單（gensen.css）重新產生時檔名不變，不能 immutable，不然改了也要等一年才生效
        source: "/fonts/gensen/gensen.css",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/:dir(illustrations|stamps|icons|videos|favicons)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
