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
    <div className="group p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-gray-100 transition-colors">
          <Wallet className="h-4 w-4 text-gray-600" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 mb-0.5 truncate">{account.Name}</p>
      <p className="text-base font-semibold text-gray-900">{formattedBalance}</p>
    </div>
  );
}
