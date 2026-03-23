import type {Metadata} from 'next';
import { Cairo } from 'next/font/google';
import './globals.css'; // Global styles
import { Toaster } from '@/components/ui/toaster';

const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });

export const metadata: Metadata = {
  title: 'نظام إدارة بلاغات الأعطال',
  description: 'نظام متكامل لإدارة بلاغات الأعطال الكهربائية',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-cairo antialiased bg-slate-50 text-slate-900`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
