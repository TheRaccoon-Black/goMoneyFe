'use client';

interface Account {
  ID: number;
  Name: string;
  Balance: number;
}

// Komponen ini menerima satu properti (prop) yaitu 'account'
export default function AccountCard({ account }: { account: Account }) {
  // Format angka menjadi format mata uang Rupiah
  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(account.Balance);

  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800">{account.Name}</h3>
      <p className="text-2xl font-bold text-blue-600 mt-2">{formattedBalance}</p>
    </div>
  );
}