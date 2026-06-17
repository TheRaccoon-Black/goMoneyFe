'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import apiClient from '@/lib/axios';

import AccountCard from '@/components/AccountCard';
import TransactionRow from '@/components/TransactionRow';
import TransactionFormDialog from '@/components/TransactionFormDialog';
import AddAccountDialog from '@/components/AddAccountDialog';
import TotalBalanceCard from '@/components/TotalBalanceCard';
import CategoryDonutChart from '@/components/CategoryDonutChart';
import SummaryCard from '@/components/SummaryCard';
import DashboardHeader from '@/components/DashboardHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserProfile { id: number; name: string; email: string; }
interface Account { ID: number; Name: string; Balance: number; }
interface SubCategory { ID: number; Name: string; }
interface Category { ID: number; Name: string; Type: string; SubCategories: SubCategory[]; }
interface Transaction {
  ID: number;
  Notes?: string;
  Amount: number;
  Type: 'income' | 'expense' | 'transfer';
  TransactionDate: string;
  Account: { ID: number; Name: string; };
  SubCategory?: { ID?: number; Name: string; Category: { Name: string; }; };
  DestinationAccountID?: number;
}
interface GroupedTransaction { date: string; transactions: Transaction[]; dailyIncome: number; dailyExpense: number; }

export default function DashboardPage() {
  const { token, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

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
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const handleAccountAdded = (newAccount: Account) => { setAccounts(prev => [...prev, newAccount]); };
  const handleFormSubmit = async () => { await fetchData(); };
  const handleEditClick = (transaction: Transaction) => { setTransactionToEdit(transaction); setIsEditDialogOpen(true); };
  const handleDeleteClick = (transaction: Transaction) => { setTransactionToDelete(transaction); setIsDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await apiClient.delete(`/api/transactions/${transactionToDelete.ID}`);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete transaction", error);
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  if (pageLoading || authLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        user={user || undefined}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        onAddTransaction={() => setIsAddDialogOpen(true)}
      />

      {/* Hero: Total Balance */}
      <TotalBalanceCard
        accounts={accounts}
        monthlyIncome={monthlyTotals.income}
        monthlyExpense={monthlyTotals.expense}
      />

      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <SummaryCard title="Income" amount={monthlyTotals.income} type="income" />
        <SummaryCard title="Expense" amount={monthlyTotals.expense} type="expense" />
        <SummaryCard title="Net Savings" amount={monthlyTotals.income - monthlyTotals.expense} type="savings" />
      </div>

      {/* Two-column main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
        {/* Spending breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Spending by Category</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">This month&apos;s expenses</p>
          </div>
          <CategoryDonutChart transactions={transactions} />
        </div>

        {/* Accounts */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Your Accounts</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{accounts.length} active accounts</p>
            </div>
            <AddAccountDialog onAccountAdded={handleAccountAdded} />
          </div>
          {accounts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map((account) => <AccountCard key={account.ID} account={account} />)}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500 dark:text-slate-400">No accounts yet.</div>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Your activity for this month</p>
          </div>
        </div>
        <div className="max-h-[480px] overflow-y-auto -mx-2 px-2">
          {groupedTransactions.length > 0 ? (
            <div className="space-y-6">
              {groupedTransactions.map(group => (
                <div key={group.date}>
                  <div className="flex justify-between items-center px-3 py-2 mb-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      {new Date(group.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-600 font-medium">+{new Intl.NumberFormat('id-ID').format(group.dailyIncome)}</span>
                      <span className="text-red-500 font-medium">-{new Intl.NumberFormat('id-ID').format(group.dailyExpense)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {group.transactions.map(tx => (
                      <TransactionRow key={tx.ID} tx={tx} onDelete={handleDeleteClick} onEdit={handleEditClick} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 dark:text-slate-400">No transactions yet this month.</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating action button */}
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        size="icon"
        className="lg:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30"
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Add Transaction</span>
      </Button>

      {/* Delete dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction and restore the associated account balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add dialog */}
      <TransactionFormDialog
        mode="add"
        accounts={accounts}
        categories={categories}
        onFormSubmit={handleFormSubmit}
        isOpen={isAddDialogOpen}
        setIsOpen={setIsAddDialogOpen}
      />

      {/* Edit dialog */}
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
