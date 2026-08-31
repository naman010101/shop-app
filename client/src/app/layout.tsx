import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Cash Terminal — Shop Ledger',
  description: 'Track inflow, sales, outflows and export reports with ease.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#FAF7F2] text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <Toaster 
              position="top-right"
              toastOptions={{
                className: 'dark:bg-stone-900 dark:text-white border dark:border-stone-800',
              }}
            />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
