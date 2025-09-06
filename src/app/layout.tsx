// file: src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext'; 
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GoMoney App',
  description: 'Your personal finance tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster />
        <AuthProvider> 
          <div className="min-h-screen bg-gray-50">
            <Sidebar /> 
            <main className="lg:ml-64">
              {children}
            </main>
          </div>
        </AuthProvider> 
      </body>
    </html>
  );
}