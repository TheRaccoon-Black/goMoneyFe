'use client';

import { useMemo } from 'react';
import { Bell, Search, Plus } from 'lucide-react';
import { Button } from './ui/button';

interface DashboardHeaderProps {
  user?: { name: string };
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onAddTransaction: () => void;
}

export default function DashboardHeader({ user, currentDate, setCurrentDate, onAddTransaction }: DashboardHeaderProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const formattedMonth = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {greeting}, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Here&apos;s what is happening with your money.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 dark:text-slate-500">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 dark:text-slate-500">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600 dark:text-slate-400">{formattedMonth}</span>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-full p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white dark:hover:bg-slate-700"
            onClick={handlePrevMonth}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>
          <span className="text-sm font-medium w-32 text-center text-gray-700 dark:text-slate-200">{formattedMonth}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-white dark:hover:bg-slate-700"
            onClick={handleNextMonth}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Button>
        </div>
        <Button onClick={onAddTransaction} className="h-9 rounded-full">
          <Plus className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">New Transaction</span>
        </Button>
      </div>
    </div>
  );
}
