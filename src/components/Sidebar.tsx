'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/budgeting', label: 'Budgeting', icon: Wallet },
  // { href: '/settings', label: 'Settings', icon: Settings }, // Untuk nanti
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 bg-white w-64 border-r p-6 hidden lg:flex flex-col">
      <h1 className="text-2xl font-bold text-blue-600 mb-10">GoMoney.</h1>
      <nav className="flex-grow space-y-2">
        {navItems.map(item => (
          <Link key={item.href} href={item.href} passHref>
            <Button 
              variant={pathname === item.href ? 'secondary' : 'ghost'} 
              className="w-full justify-start"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
      {/* <Button variant="ghost" onClick={handleLogout} className="w-full justify-start mt-auto"> */}
      <Button variant="ghost" onClick={handleLogout} className="w-full justify-start mt-auto bg-red-600 hover:bg-red-400 text-white hover:text-white">
        <LogOut className="mr-2 h-4 w-4" />
        <span>Logout</span>
      </Button>
    </aside>
  );
}