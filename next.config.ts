import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ["lpqdnqczyqnhlsnsprht.supabase.co"],
  },
};

export default nextConfig;
