'use client';

import { useState } from 'react';
import apiClient from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });
      const { token } = response.data;
      login(token);

      alert('Login Berhasil! Kita akan segera simpan token ini.'); // Placeholder

      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      const axiosErr = err as { response?: { data?: { error?: string }; status?: number }; message?: string };
      if (axiosErr.response?.data?.error) {
        setError(axiosErr.response.data.error);
      } else if (axiosErr.message) {
        setError(`Error: ${axiosErr.message}`);
      } else {
        setError('Email atau password salah.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-950 transition-colors">
      <div className="p-8 bg-white dark:bg-slate-900 rounded-lg shadow-md w-full max-w-md border border-transparent dark:border-slate-800">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-6 text-center">GoMoney</h1>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-slate-300 mb-2" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-slate-300 mb-2" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring focus:ring-blue-200 dark:focus:ring-blue-800 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
