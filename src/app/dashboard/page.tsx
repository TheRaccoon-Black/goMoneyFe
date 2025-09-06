// file: src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import apiClient from '@/lib/axios';
import AccountCard from '@/components/AccountCard';
import AddAccountDialog from '@/components/AddAccountDialog';
import TransactionRow from '@/components/TransactionRow';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import TotalBalanceCard from '@/components/TotalBalanceCard'; // <-- Import baru
import CategoryDonutChart from '@/components/CategoryDonutChart'; // <-- Import baru
import { Skeleton } from '@/components/ui/skeleton'; // <-- Import baru untuk loading

// Definisikan semua tipe data yang kita butuhkan di halaman ini
interface UserProfile {
  id: number;
  name: string;
  email: string;
}
interface Account {
  ID: number;
  Name: string;
  Balance: number;
}
interface SubCategory {
  ID: number;
  Name: string;
}
interface Category {
  ID: number;
  Name: string;
  Type: string;
  SubCategories: SubCategory[];
}
interface Transaction {
  ID: number;
  Notes: string;
  Amount: number;
  Type: 'income' | 'expense' | 'transfer';
  TransactionDate: string;
  Account: {
    Name: string;
  };
  SubCategory?: {
    Name: string;
    Category: {
      Name: string;
    };
  };
}

interface GroupedTransaction {
  date: string;
  transactions: Transaction[];
  dailyIncome: number;
  dailyExpense: number;
}

export default function DashboardPage() {
  const { token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // State untuk semua data di halaman ini
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // useEffect untuk mengambil semua data awal saat halaman dimuat
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, accountsRes, transactionsRes, categoriesRes] = await Promise.all([
          apiClient.get('/api/profile'),
          apiClient.get('/api/accounts'),
          apiClient.get('/api/transactions'),
          apiClient.get('/api/categories') // Tidak perlu preload di sini
        ]);
        setUser(profileRes.data);
        setAccounts(accountsRes.data || []);
        setTransactions(transactionsRes.data || []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error('Failed to fetch initial data', error);
        logout();
        router.push('/login');
      } finally {
        setPageLoading(false);
      }
    };

    fetchData();
  }, [token, authLoading, router, logout]);

const groupedTransactions = useMemo(() => {
    if (!transactions) return [];

    const groups: { [key: string]: GroupedTransaction } = {};

    transactions.forEach(tx => {
      const date = new Date(tx.TransactionDate).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = { date, transactions: [], dailyIncome: 0, dailyExpense: 0 };
      }
      groups[date].transactions.push(tx);
      if (tx.Type === 'income') groups[date].dailyIncome += tx.Amount;
      if (tx.Type === 'expense') groups[date].dailyExpense += tx.Amount;
    });

    return Object.values(groups);
  }, [transactions]);

  // Handler saat akun baru ditambahkan
  const handleAccountAdded = (newAccount: Account) => {
    setAccounts(prevAccounts => [...prevAccounts, newAccount]);
  };

  // Handler saat transaksi baru ditambahkan
  const handleTransactionAdded = (newTransaction: Transaction, updatedAccounts: Account[]) => {
    // Tambahkan transaksi baru ke awal daftar
    setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
    // Ganti seluruh daftar akun dengan data terbaru dari server
    setAccounts(updatedAccounts);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (pageLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
     <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            {user && <p className="text-lg text-gray-600">Selamat datang, {user.name}!</p>}
          </div>
          <button onClick={handleLogout} className="bg-white text-gray-700 px-4 py-2 rounded-lg border hover:bg-gray-50 transition">
            Logout
          </button>
          
          </div>
          {/* Grid untuk Info Saldo & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <TotalBalanceCard accounts={accounts} />
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="text-xl font-semibold text-gray-700 mb-4">Pengeluaran per Kategori</h2>
             <CategoryDonutChart transactions={transactions} />
          </div>
        </div>
          {user && (
            <div className="text-lg text-gray-700">
              <p>Selamat datang kembali, <span className="font-semibold">{user.name}</span>!</p>
            </div>
          )}
        </div>

        {/* Bagian Akun */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Akun Anda</h2>
            <AddAccountDialog onAccountAdded={handleAccountAdded} />
          </div>
          {accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <AccountCard key={account.ID} account={account} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Anda belum memiliki akun.</p>
          )}
        </div>

       {/* Bagian Transaksi yang Sudah di-Group */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-700">Transaksi Terakhir</h2>
            <AddTransactionDialog accounts={accounts} categories={categories} onTransactionAdded={handleTransactionAdded} />
          </div>
          <div>
            {groupedTransactions.length > 0 ? (
              <div className="space-y-6">
                {groupedTransactions.map(group => (
                  <div key={group.date}>
                    {/* Header per tanggal */}
                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg border-b">
                       <p className="font-semibold text-gray-700">{new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                       <div className="flex space-x-4">
                         <p className="text-sm font-medium text-green-600">+ {new Intl.NumberFormat('id-ID').format(group.dailyIncome)}</p>
                         <p className="text-sm font-medium text-red-600">- {new Intl.NumberFormat('id-ID').format(group.dailyExpense)}</p>
                       </div>
                    </div>
                    {/* Daftar transaksi di tanggal tersebut */}
                    <div className="space-y-2 pt-2">
                       {group.transactions.map(tx => <TransactionRow key={tx.ID} tx={tx} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Belum ada transaksi yang dicatat.</p>
            )}
          </div>
        </div>
      </div>
  );
}