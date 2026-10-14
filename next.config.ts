import type { NextConfig } from "next";

// Disable SSL rejection for local development with corporate/antivirus proxy certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Allow external Cloudflare tunnel origins
  // @ts-ignore
  allowedDevOrigins: ['*.trycloudflare.com'],
};

export default nextConfig;
