'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/axios';

interface UserProfile {
  id: number;
  name: string;
  email: string;
}

export default function DashboardPage() {
  const { token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    // Jangan lakukan apapun jika AuthContext masih loading
    if (authLoading) {
      return;
    }

    // Jika sudah tidak loading dan TIDAK ada token, redirect
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/api/profile');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch profile. Token might be invalid.', error);
        logout(); 
        router.push('/login');
      } finally {
        setPageLoading(false);
      }
    };

    fetchProfile();
  }, [token, authLoading, router, logout]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (pageLoading || authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard
          </h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
        
        {user && (
          <div className="text-lg text-gray-700">
            <p>Selamat datang kembali, <span className="font-semibold">{user.name}</span>!</p>
            <p>Email Anda: {user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}