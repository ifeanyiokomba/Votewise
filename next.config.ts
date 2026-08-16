import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Finding #11: ignoreBuildErrors removed — the build now catches type errors.
  // Finding #19: allowedDevOrigins cleared of Z.ai sandbox domains.
  reactStrictMode: false,
};

export default nextConfig;
