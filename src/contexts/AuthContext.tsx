'use client';

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  token: string | null;
  loading: boolean; // <-- STATE BARU
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    try {
      const storedToken = Cookies.get('token');
      if (storedToken) {
        setToken(storedToken);
      }
    } catch (error) {
      console.error("Could not read token from cookie", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string) => {
    setToken(newToken);
    Cookies.set('token', newToken, { expires: 30, path: '/' });
    // Cookies.set('token', newToken, { expires: 30, path: '/', secure: true, sameSite: 'Strict' }); // Gunakan ini di production
  };

  const logout = () => {
    setToken(null);
    Cookies.remove('token', { path: '/' });
  };

  return (
    <AuthContext.Provider value={{ token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}