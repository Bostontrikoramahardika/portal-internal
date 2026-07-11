import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google' // Import Font Berkelas
import './globals.css'

// 1. Konfigurasi Font Plus Jakarta Sans
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta', // Variabel CSS untuk digunakan di Tailwind
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BTM Portal',
  description: 'Portal Absensi & HR - PT. Boston Trikora Mahardika',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BTM Portal',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#003D79', // Diubah ke Biru Pama agar sinkron
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 2. Tambahkan variable font ke tag html
    <html lang="id" className={`${jakartaSans.variable} scroll-smooth`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/btm-fix.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BTM Portal" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#003D79" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      {/* 3. Gunakan class font-sans di body */}
      <body className="font-sans min-h-screen text-slate-800 antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}

// Fungsi Registrasi Service Worker (PWA Offline)
function ServiceWorkerRegister() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(reg) {
                  console.log('✅ Service Worker registered:', reg.scope);
                })
                .catch(function(err) {
                  console.log('❌ Service Worker failed:', err);
                });
            });
          }
        `,
      }}
    />
  )
}