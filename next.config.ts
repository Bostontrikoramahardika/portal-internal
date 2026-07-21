import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  // Existing: pdfjs-dist di-external supaya tidak dibundle
  serverExternalPackages: ['pdfjs-dist'],

  // ✨ Kompres response (gzip/brotli) — 30-50% lebih kecil
  compress: true,

  // ✨ Optimasi gambar otomatis
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    minimumCacheTTL: 3600,
  },

  // ✨ Production optimization
  reactStrictMode: true,
  poweredByHeader: false,

  // ✨ Turbopack config
  turbopack: {
    resolveAlias: {
      canvas: { browser: './empty-module.js' },
    },
  },

  // ✨ HTTP Cache Headers
  async headers() {
    return [
      {
        // Cache static assets 1 tahun
        source: '/:path*.(jpg|jpeg|png|webp|avif|svg|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Cache menu API 30 detik
        source: '/api/menus',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=30, stale-while-revalidate=300' },
        ],
      },
      {
        // DNS prefetch
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
};

export default nextConfig;