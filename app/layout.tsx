import Image from 'next/image';
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
      <body className={`${cairo.variable} font-cairo antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col`} suppressHydrationWarning>
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <footer className="py-4 text-center text-xs sm:text-sm text-slate-500 bg-white/50 backdrop-blur-sm border-t border-slate-200 flex items-center justify-center gap-2">
          <span>Developed by <span className="font-semibold text-slate-700">Spardex Lab</span></span>
          <Image 
            src="/spardex-logo.png" 
            alt="Spardex Lab Logo" 
            width={20} 
            height={20} 
            className="h-5 w-auto"
            referrerPolicy="no-referrer"
          />
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
