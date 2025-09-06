'use client';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: number;
  type: 'income' | 'expense';
}

export default function SummaryCard({ title, amount, type }: SummaryCardProps) {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

  const isIncome = type === 'income';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {isIncome ? (
          <ArrowUpCircle className="h-6 w-6 text-green-500" />
        ) : (
          <ArrowDownCircle className="h-6 w-6 text-red-500" />
        )}
      </div>
      <p className={`text-lg font-bold mt-2 ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
        {formattedAmount}
      </p>
    </div>
  );
}