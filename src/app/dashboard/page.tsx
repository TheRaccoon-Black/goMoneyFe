// file: src/app/dashboard/page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import apiClient from '@/lib/axios';

// Import semua komponen UI dan custom
import AccountCard from '@/components/AccountCard';
import TransactionRow from '@/components/TransactionRow';
import TransactionFormDialog from '@/components/TransactionFormDialog';
import AddAccountDialog from '@/components/AddAccountDialog';
import TotalBalanceCard from '@/components/TotalBalanceCard';
import CategoryDonutChart from '@/components/CategoryDonutChart';
import MonthNavigator from '@/components/MonthNavigator';
import SummaryCard from '@/components/SummaryCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { LogOut } from 'lucide-react';

// --- INTERFACES ---
interface UserProfile { id: number; name: string; email: string; }
interface Account { ID: number; Name: string; Balance: number; }
interface SubCategory { ID: number; Name: string; }
interface Category { ID: number; Name: string; Type: string; SubCategories: SubCategory[]; }
interface Transaction { ID: number; Notes?: string; Amount: number; Type: 'income' | 'expense' | 'transfer'; TransactionDate: string; Account: { ID: number; Name: string; }; SubCategory?: { ID: number; Name: string; Category: { Name: string; }; }; DestinationAccountID?: number; }
interface GroupedTransaction { date: string; transactions: Transaction[]; dailyIncome: number; dailyExpense: number; }

export default function DashboardPage() {
  const { token, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // State untuk mengelola semua dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  // --- DATA FETCHING & PROCESSING ---
  const fetchData = useCallback(async () => {
    if (!token) return;
    setPageLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [profileRes, accountsRes, transactionsRes, categoriesRes] = await Promise.all([
        apiClient.get('/api/profile'),
        apiClient.get('/api/accounts'),
        apiClient.get(`/api/transactions?year=${year}&month=${month}`),
        apiClient.get('/api/categories'),
      ]);
      setUser(profileRes.data);
      setAccounts(accountsRes.data || []);
      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
      logout();
      router.push('/login');
    } finally {
      setPageLoading(false);
    }
  }, [token, currentDate, logout, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, [token, authLoading, fetchData]);

  const groupedTransactions = useMemo(() => {
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

  const monthlyTotals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.Type === 'income') acc.income += tx.Amount;
        if (tx.Type === 'expense') acc.expense += tx.Amount;
        return acc;
      }, { income: 0, expense: 0 }
    );
  }, [transactions]);

  // --- HANDLERS ---
  const handleAccountAdded = (newAccount: Account) => { setAccounts(prev => [...prev, newAccount]); };
  const handleFormSubmit = async () => { await fetchData(); };
  const handleEditClick = (transaction: Transaction) => { setTransactionToEdit(transaction); setIsEditDialogOpen(true); };
  const handleDeleteClick = (transaction: Transaction) => { setTransactionToDelete(transaction); setIsDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await apiClient.delete(`/api/transactions/${transactionToDelete.ID}`);
      await fetchData();
    } catch (error) { console.error("Failed to delete transaction", error);
    } finally { setIsDeleteDialogOpen(false); setTransactionToDelete(null); }
  };
  const handleLogout = () => { logout(); router.push('/login'); };

  // --- RENDER LOGIC ---
  if (pageLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 lg:ml-64">
        <div className="max-w-5xl mx-auto space-y-8">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <aside className="fixed inset-y-0 left-0 bg-white w-64 border-r p-6 hidden lg:flex flex-col">
          <h1 className="text-2xl font-bold text-blue-600 mb-10">GoMoney.</h1>
          <nav className="flex-grow">{/* Menu items can go here */}</nav>
          <Button variant="ghost" onClick={handleLogout} className="w-full justify-start bg-red-600 hover:bg-red-400 text-white hover:text-white">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>
        </aside>

        <main className="lg:ml-64 p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
                {user && <p className="text-lg text-gray-600">Selamat datang, {user.name}!</p>}
              </div>
              <MonthNavigator currentDate={currentDate} setCurrentDate={setCurrentDate} />
            </div>

            {/* Grid Info Utama */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TotalBalanceCard accounts={accounts} />
              <SummaryCard title="Total Pemasukan" amount={monthlyTotals.income} type="income" />
              <SummaryCard title="Total Pengeluaran" amount={monthlyTotals.expense} type="expense" />
            </div>
            
            {/* Bagian Akun */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">Akun Anda</h2>
                <AddAccountDialog onAccountAdded={handleAccountAdded} />
              </div>
              {accounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account) => <AccountCard key={account.ID} account={account} />)}
                </div>
              ) : (
                <p className="text-gray-500">Anda belum memiliki akun.</p>
              )}
            </div>

            {/* Chart & Transaksi */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Pengeluaran Bulan Ini</h2>
                <CategoryDonutChart transactions={transactions} />
              </div>
              <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-gray-700">Riwayat Transaksi</h2>
                  <Button onClick={() => setIsAddDialogOpen(true)}>+ Transaksi</Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {groupedTransactions.length > 0 ? (
                    <div className="space-y-6">
                      {groupedTransactions.map(group => (
                        <div key={group.date}>
                          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg border-b sticky top-0">
                            <p className="font-semibold text-gray-700">{new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                            <div className="flex space-x-4 text-xs">
                              <p className="font-medium text-green-600">+ {new Intl.NumberFormat('id-ID').format(group.dailyIncome)}</p>
                              <p className="font-medium text-red-600">- {new Intl.NumberFormat('id-ID').format(group.dailyExpense)}</p>
                            </div>
                          </div>
                          <div className="space-y-2 pt-2">
                            {group.transactions.map(tx => <TransactionRow key={tx.ID} tx={tx} onDelete={handleDeleteClick} onEdit={handleEditClick} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10"><p className="text-gray-500">Belum ada transaksi di bulan ini.</p></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DIALOGS */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda Yakin?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini akan menghapus data transaksi secara permanen dan mengembalikan saldo akun yang terkait.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">Ya, Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <TransactionFormDialog
        mode="add"
        accounts={accounts}
        categories={categories}
        onFormSubmit={handleFormSubmit}
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
      />

      {transactionToEdit && (
        <TransactionFormDialog
          mode="edit"
          initialData={transactionToEdit}
          accounts={accounts}
          categories={categories}
          onFormSubmit={handleFormSubmit}
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
        />
      )}
    </>
  );
}