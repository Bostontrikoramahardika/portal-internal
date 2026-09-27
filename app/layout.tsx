import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BTM Portal Internal',
  description: 'Aplikasi Portal Internal BTM',
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
