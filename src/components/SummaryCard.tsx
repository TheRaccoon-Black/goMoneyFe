'use client';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'savings';
}

export default function SummaryCard({ title, amount, type }: SummaryCardProps) {
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);

  const config = {
    income: {
      icon: ArrowUpCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
      amountColor: 'text-emerald-600',
    },
    expense: {
      icon: ArrowDownCircle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      amountColor: 'text-red-500',
    },
    savings: {
      icon: ArrowUpCircle,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      amountColor: 'text-gray-900',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`${config.iconBg} p-2 rounded-lg`}>
          <Icon className={`h-4 w-4 ${config.iconColor}`} />
        </div>
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className={`text-xl font-semibold tracking-tight ${config.amountColor}`}>{formattedAmount}</p>
    </div>
  );
}
