'use client';

import { Wallet } from 'lucide-react';

interface Account {
  ID: number;
  Name: string;
  Balance: number;
}

export default function AccountCard({ account }: { account: Account }) {
  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(account.Balance);

  return (
    <div className="group p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between mb-3">
        <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg group-hover:bg-gray-100 dark:group-hover:bg-slate-700 transition-colors">
          <Wallet className="h-4 w-4 text-gray-600 dark:text-slate-300" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-0.5 truncate">{account.Name}</p>
      <p className="text-base font-semibold text-gray-900 dark:text-white">{formattedBalance}</p>
    </div>
  );
}
