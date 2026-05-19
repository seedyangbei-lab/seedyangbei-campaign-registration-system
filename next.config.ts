import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ["jiquqxptrpivqhsovmrv.supabase.co"],
  },
};

export default nextConfig;
