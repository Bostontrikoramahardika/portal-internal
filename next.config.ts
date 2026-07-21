import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // Beritahu Next.js untuk tidak bundle pdfjs-dist (biarkan Node.js handle)
  serverExternalPackages: ['pdfjs-dist'],

  // Turbopack config (Next.js 16 default pakai Turbopack)
  turbopack: {
    resolveAlias: {
      canvas: { browser: './empty-module.js' },
    },
  },
};

export default nextConfig;