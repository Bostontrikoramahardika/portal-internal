import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BTM Mobile App',
  description: 'BTM Mobile App - Portal Internal',
};

// 📱 Viewport resmi: skala benar di HP/tablet/desktop, aman untuk HP berponi
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#003D79',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased bg-[#f4f7fa] text-slate-800 font-sans">
        {children}
      </body>
    </html>
  );
}
