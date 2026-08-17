import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: "output: standalone" removed — it causes ENOENT: next-server.js.nft.json
  // on Vercel with Next.js 16 + Turbopack. Vercel handles output automatically.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
