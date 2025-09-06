'use client';
import { Wallet } from 'lucide-react';

interface Account {
  Balance: number;
}

interface TotalBalanceCardProps {
  accounts: Account[];
}

export default function TotalBalanceCard({ accounts }: TotalBalanceCardProps) {
  const totalBalance = accounts.reduce((sum, account) => sum + account.Balance, 0);

  const formattedTotalBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(totalBalance);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-center">
        <div className="bg-blue-100 p-3 rounded-full">
          <Wallet className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">Total Saldo</p>
          <p className="text-xl font-bold text-gray-800">{formattedTotalBalance}</p>
        </div>
      </div>
    </div>
  );
}