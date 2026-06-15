'use client';
import { Wallet, TrendingUp } from 'lucide-react';

interface Account {
  Balance: number;
}

interface TotalBalanceCardProps {
  accounts: Account[];
  monthlyIncome?: number;
  monthlyExpense?: number;
}

export default function TotalBalanceCard({ accounts, monthlyIncome = 0, monthlyExpense = 0 }: TotalBalanceCardProps) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.Balance, 0);

  const formattedTotalBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(totalBalance);

  const net = monthlyIncome - monthlyExpense;
  const netText = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(net);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-6 lg:p-8 text-white relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
      <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-white/5 rounded-full" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-2 rounded-lg">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-300">Total Balance</span>
          </div>
          <span className="text-xs text-gray-400">{accounts.length} accounts</span>
        </div>

        <div className="mb-6">
          <p className="text-3xl lg:text-4xl font-semibold tracking-tight">{formattedTotalBalance}</p>
        </div>

        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp className={`h-3.5 w-3.5 ${net >= 0 ? 'text-emerald-300' : 'text-red-300'}`} />
            <span className="text-gray-300">This month</span>
            <span className={`font-semibold ${net >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {net >= 0 ? '+' : ''}{netText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
