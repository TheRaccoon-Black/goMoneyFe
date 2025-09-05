'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!token) {
      router.push('/login');
    }
  }, [token, loading, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Memverifikasi Sesi...</div>;
  }

  if (token) {
    return <>{children}</>;
  }
  
  return null;
}