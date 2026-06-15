'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface MonthNavigatorProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

export default function MonthNavigator({ currentDate, setCurrentDate }: MonthNavigatorProps) {
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={handlePrevMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium w-32 text-center text-gray-700">{formattedDate}</span>
      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white" onClick={handleNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
