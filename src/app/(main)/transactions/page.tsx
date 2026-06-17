'use client';

import { useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  format, startOfDay, endOfDay, startOfWeek, startOfMonth, endOfMonth,
  subDays, subMonths, startOfYear, endOfYear, parseISO,
  differenceInDays, isWithinInterval, isValid,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  ChevronRight, Search, SlidersHorizontal, Receipt,
  TrendingUp, TrendingDown, BarChart3, List as ListIcon,
  Hash, Wallet, Calendar as CalendarIcon, RefreshCcw,
  ArrowUp, ArrowDown, Plus,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import apiClient from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Toaster, toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TransactionRow from '@/components/TransactionRow';
import TransactionFormDialog from '@/components/TransactionFormDialog';

// --- Types ---
interface Account { ID: number; Name: string; }
interface SubCategory { ID: number; Name: string; Category: { ID: number; Name: string; }; }
interface Category { ID: number; Name: string; Type: string; SubCategories: SubCategory[]; }
interface Transaction {
  ID: number;
  Notes?: string;
  Amount: number;
  Type: 'income' | 'expense' | 'transfer';
  TransactionDate: string;
  Account: { ID: number; Name: string; };
  SubCategory?: { ID?: number; Name: string; Category: { ID?: number; Name: string; }; };
  DestinationAccountID?: number;
}

type DateRangePreset = 'all' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';
type TxTypeFilter = 'all' | 'income' | 'expense' | 'transfer';
type TrendGranularity = 'daily' | 'weekly' | 'monthly';
type ComparisonPeriod = 'previous' | 'lastYear';

interface Filters {
  datePreset: DateRangePreset;
  customFrom?: Date;
  customTo?: Date;
  type: TxTypeFilter;
  categoryId?: number;
  subCategoryId?: number;
  accountId?: number;
  searchNotes: string;
  minAmount?: number;
  maxAmount?: number;
  trendGranularity: TrendGranularity;
  comparisonPeriod: ComparisonPeriod;
}

interface GroupedTransaction {
  date: string;
  transactions: Transaction[];
  dailyIncome: number;
  dailyExpense: number;
}

interface AccountBreakdown {
  id: number;
  name: string;
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  net: number;
  count: number;
}

interface PeriodData {
  income: number;
  expense: number;
  net: number;
  count: number;
}

interface PeriodComparison {
  current: PeriodData;
  previous: PeriodData;
  incomeDelta: number;
  expenseDelta: number;
  netDelta: number;
}

interface DescriptiveStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const formatCompactRupiah = (n: number) => {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n.toFixed(0)}`;
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const DATE_PRESET_LABELS: Record<DateRangePreset, string> = {
  all: 'Semua waktu',
  '7d': '7 hari terakhir',
  '30d': '30 hari terakhir',
  thisMonth: 'Bulan ini',
  lastMonth: 'Bulan lalu',
  thisYear: 'Tahun ini',
  custom: 'Kustom',
};

const TX_TYPE_LABELS: Record<TxTypeFilter, string> = {
  all: 'Semua tipe',
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
};

const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
};

const defaultFilters: Filters = {
  datePreset: 'all',
  type: 'all',
  searchNotes: '',
  trendGranularity: 'daily',
  comparisonPeriod: 'previous',
};

// === Main Page ===
export default function TransactionsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const deferredSearch = useDeferredValue(filters.searchNotes);

  const [activeView, setActiveView] = useState<'list' | 'analysis'>('list');
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // --- Fetch ---
  const fetchAll = useCallback(async () => {
    setPageLoading(true);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        apiClient.get('/api/transactions'),
        apiClient.get('/api/accounts'),
        apiClient.get('/api/categories'),
      ]);
      setTransactions(txRes.data || []);
      setAccounts(accRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
      toast.error('Gagal memuat data transaksi');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    fetchAll();
  }, [token, authLoading, fetchAll, router]);

  // --- Date range computation ---
  const dateRange = useMemo<{ from?: Date; to?: Date }>(() => {
    const now = new Date();
    switch (filters.datePreset) {
      case 'all': return { from: undefined, to: undefined };
      case '7d': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
      case '30d': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
      case 'thisMonth': return { from: startOfMonth(now), to: endOfDay(now) };
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      }
      case 'thisYear': return { from: startOfYear(now), to: endOfYear(now) };
      case 'custom': return { from: filters.customFrom, to: filters.customTo };
    }
  }, [filters.datePreset, filters.customFrom, filters.customTo]);

  // --- Auto granularity ---
  useEffect(() => {
    if (filters.datePreset === 'all' || filters.datePreset === 'thisYear') {
      setFilters(f => ({ ...f, trendGranularity: 'monthly' }));
      return;
    }
    if (!dateRange.from || !dateRange.to) return;
    const days = differenceInDays(dateRange.to, dateRange.from);
    let next: TrendGranularity;
    if (days <= 14) next = 'daily';
    else if (days <= 90) next = 'weekly';
    else next = 'monthly';
    setFilters(f => ({ ...f, trendGranularity: next }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.datePreset, dateRange.from?.toISOString(), dateRange.to?.toISOString()]);

  // --- Filtered transactions ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (filters.type !== 'all' && tx.Type !== filters.type) return false;

      if (filters.accountId !== undefined) {
        if (tx.Type === 'transfer') {
          if (tx.Account.ID !== filters.accountId && tx.DestinationAccountID !== filters.accountId) return false;
        } else {
          if (tx.Account.ID !== filters.accountId) return false;
        }
      }

      if (filters.subCategoryId !== undefined) {
        if (tx.SubCategory?.ID !== filters.subCategoryId) return false;
      } else if (filters.categoryId !== undefined) {
        if (tx.SubCategory?.Category?.ID !== filters.categoryId) return false;
      }

      if (filters.minAmount !== undefined && tx.Amount < filters.minAmount) return false;
      if (filters.maxAmount !== undefined && tx.Amount > filters.maxAmount) return false;

      if (dateRange.from || dateRange.to) {
        const txDate = parseISO(tx.TransactionDate);
        if (!isValid(txDate)) return false;
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(txDate, { start: dateRange.from, end: dateRange.to })) return false;
        } else if (dateRange.from && txDate < dateRange.from) return false;
        else if (dateRange.to && txDate > dateRange.to) return false;
      }

      const search = deferredSearch.trim().toLowerCase();
      if (search) {
        const notes = (tx.Notes || '').toLowerCase();
        if (!notes.includes(search)) return false;
      }

      return true;
    });
  }, [transactions, filters.type, filters.accountId, filters.categoryId, filters.subCategoryId, filters.minAmount, filters.maxAmount, dateRange.from, dateRange.to, deferredSearch]);

  // --- Summary stats ---
  const summaryStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const uniqueDays = new Set<string>();
    filteredTransactions.forEach(tx => {
      uniqueDays.add(format(parseISO(tx.TransactionDate), 'yyyy-MM-dd'));
      if (tx.Type === 'income') totalIncome += tx.Amount;
      if (tx.Type === 'expense') totalExpense += tx.Amount;
    });
    const days = uniqueDays.size || 1;
    return {
      count: filteredTransactions.length,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      avgPerDay: totalExpense / days,
    };
  }, [filteredTransactions]);

  // --- Grouped by date ---
  const groupedByDate = useMemo<GroupedTransaction[]>(() => {
    const groups: { [key: string]: GroupedTransaction } = {};
    filteredTransactions.forEach(tx => {
      const date = format(parseISO(tx.TransactionDate), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = { date, transactions: [], dailyIncome: 0, dailyExpense: 0 };
      }
      groups[date].transactions.push(tx);
      if (tx.Type === 'income') groups[date].dailyIncome += tx.Amount;
      if (tx.Type === 'expense') groups[date].dailyExpense += tx.Amount;
    });
    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  // --- Trend data ---
  const trendData = useMemo(() => {
    const getBucket = (date: Date): string => {
      switch (filters.trendGranularity) {
        case 'daily': return format(date, 'yyyy-MM-dd');
        case 'weekly': return format(startOfWeek(date, { locale: idLocale }), 'yyyy-MM-dd');
        case 'monthly': return format(date, 'yyyy-MM');
      }
    };
    const buckets: Record<string, { label: string; income: number; expense: number; net: number; sortKey: string }> = {};
    filteredTransactions.forEach(tx => {
      if (tx.Type === 'transfer') return;
      const date = parseISO(tx.TransactionDate);
      if (!isValid(date)) return;
      const key = getBucket(date);
      if (!buckets[key]) {
        const label = filters.trendGranularity === 'monthly'
          ? format(date, 'MMM yyyy', { locale: idLocale })
          : filters.trendGranularity === 'weekly'
            ? `Minggu ${format(date, 'd MMM', { locale: idLocale })}`
            : format(date, 'd MMM', { locale: idLocale });
        buckets[key] = { label, income: 0, expense: 0, net: 0, sortKey: key };
      }
      if (tx.Type === 'income') buckets[key].income += tx.Amount;
      if (tx.Type === 'expense') buckets[key].expense += tx.Amount;
    });
    return Object.values(buckets)
      .map(b => ({ ...b, net: b.income - b.expense }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredTransactions, filters.trendGranularity]);

  // --- Top categories (expense only) ---
  const topCategories = useMemo(() => {
    const map: Record<string, { name: string; value: number }> = {};
    filteredTransactions.forEach(tx => {
      if (tx.Type !== 'expense') return;
      const name = tx.SubCategory?.Category?.Name || 'Lainnya';
      if (!map[name]) map[name] = { name, value: 0 };
      map[name].value += tx.Amount;
    });
    const list = Object.values(map).sort((a, b) => b.value - a.value).slice(0, 5);
    const total = list.reduce((s, i) => s + i.value, 0);
    return list.map((item, idx) => ({ ...item, percentage: total > 0 ? (item.value / total) * 100 : 0, color: COLORS[idx % COLORS.length] }));
  }, [filteredTransactions]);

  // --- Account breakdown ---
  const accountBreakdown = useMemo<AccountBreakdown[]>(() => {
    return accounts.map(acc => {
      let income = 0, expense = 0, transferIn = 0, transferOut = 0, count = 0;
      filteredTransactions.forEach(tx => {
        const isSource = tx.Account.ID === acc.ID;
        const isDest = tx.DestinationAccountID === acc.ID;
        if (tx.Type === 'income' && isSource) { income += tx.Amount; count++; }
        if (tx.Type === 'expense' && isSource) { expense += tx.Amount; count++; }
        if (tx.Type === 'transfer') {
          if (isSource) { transferOut += tx.Amount; count++; }
          if (isDest) { transferIn += tx.Amount; count++; }
        }
      });
      return {
        id: acc.ID,
        name: acc.Name,
        income, expense, transferIn, transferOut,
        net: income - expense + transferIn - transferOut,
        count,
      };
    });
  }, [accounts, filteredTransactions]);

  // --- Descriptive stats (expense only) ---
  const descriptiveStats = useMemo<DescriptiveStats>(() => {
    const amounts = filteredTransactions.filter(t => t.Type === 'expense').map(t => t.Amount);
    if (amounts.length === 0) {
      return { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0 };
    }
    const sorted = [...amounts].sort((a, b) => a - b);
    const sum = amounts.reduce((a, b) => a + b, 0);
    const mean = sum / amounts.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const variance = amounts.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / amounts.length;
    return {
      count: amounts.length,
      sum, mean, median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      stdDev: Math.sqrt(variance),
    };
  }, [filteredTransactions]);

  // --- Period comparison ---
  const periodComparison = useMemo<PeriodComparison | null>(() => {
    if (!dateRange.from || !dateRange.to) return null;
    const length = differenceInDays(dateRange.to, dateRange.from) + 1;
    if (length <= 0) return null;
    let prevFrom: Date, prevTo: Date;
    if (filters.comparisonPeriod === 'previous') {
      prevTo = subDays(dateRange.from, 1);
      prevFrom = subDays(prevTo, length - 1);
    } else {
      prevFrom = subMonths(dateRange.from, 12);
      prevTo = subMonths(dateRange.to, 12);
    }
    const inRange = (tx: Transaction, from: Date, to: Date) => {
      const d = parseISO(tx.TransactionDate);
      return isValid(d) && isWithinInterval(d, { start: from, end: to });
    };
    const compute = (from: Date, to: Date): PeriodData => {
      let income = 0, expense = 0, count = 0;
      transactions.forEach(tx => {
        if (!inRange(tx, from, to)) return;
        count++;
        if (tx.Type === 'income') income += tx.Amount;
        if (tx.Type === 'expense') expense += tx.Amount;
      });
      return { income, expense, net: income - expense, count };
    };
    const current = compute(dateRange.from, dateRange.to);
    const previous = compute(prevFrom, prevTo);
    const pct = (cur: number, prev: number) => prev === 0 ? (cur === 0 ? 0 : 100) : ((cur - prev) / prev) * 100;
    return {
      current, previous,
      incomeDelta: pct(current.income, previous.income),
      expenseDelta: pct(current.expense, previous.expense),
      netDelta: pct(current.net, previous.net),
    };
  }, [transactions, dateRange.from, dateRange.to, filters.comparisonPeriod]);

  // --- Handlers ---
  const handleEditClick = (tx: Transaction) => {
    setEditTarget(tx);
    setIsEditOpen(true);
  };
  const handleDeleteClick = (tx: Transaction) => {
    setDeleteTarget(tx);
  };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/api/transactions/${deleteTarget.ID}`);
      toast.success('Transaksi berhasil dihapus');
      setDeleteTarget(null);
      await fetchAll();
    } catch (err) {
      console.error('Failed to delete transaction', err);
      toast.error('Gagal menghapus transaksi');
    }
  };
  const handleFormSubmit = async () => {
    toast.success('Transaksi berhasil disimpan');
    await fetchAll();
  };
  const handleResetFilters = () => {
    setFilters(f => ({ ...defaultFilters, trendGranularity: f.trendGranularity, comparisonPeriod: f.comparisonPeriod }));
  };
  const isFilterActive =
    filters.type !== 'all' ||
    filters.categoryId !== undefined ||
    filters.subCategoryId !== undefined ||
    filters.accountId !== undefined ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    deferredSearch.trim() !== '' ||
    filters.datePreset !== 'all';

  // --- Available subcategories (depend on selected category) ---
  const availableSubs = useMemo(() => {
    if (filters.categoryId === undefined) return [];
    return categories.find(c => c.ID === filters.categoryId)?.SubCategories || [];
  }, [categories, filters.categoryId]);

  // --- Loading skeleton ---
  if (pageLoading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const dateLabel = filters.datePreset === 'custom' && filters.customFrom && filters.customTo
    ? `${format(filters.customFrom, 'd MMM yyyy')} – ${format(filters.customTo, 'd MMM yyyy')}`
    : DATE_PRESET_LABELS[filters.datePreset];

  return (
    <>
      <Toaster position="top-right" richColors />

      {/* === Header === */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
            <span>Beranda</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-700 dark:text-slate-200 font-medium">Manajemen Transaksi</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Manajemen Transaksi</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-0.5">
            Lihat, filter, dan analisis semua transaksi Anda.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Transaksi
        </Button>
      </div>

      {/* === Summary stats === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryStat
          icon={<Hash className="h-5 w-5" />}
          label="Jumlah Transaksi"
          value={summaryStats.count.toString()}
          color="slate"
        />
        <SummaryStat
          icon={<TrendingUp className="h-5 w-5" />}
          label="Total Pemasukan"
          value={formatRupiah(summaryStats.totalIncome)}
          color="emerald"
        />
        <SummaryStat
          icon={<TrendingDown className="h-5 w-5" />}
          label="Total Pengeluaran"
          value={formatRupiah(summaryStats.totalExpense)}
          color="rose"
        />
        <SummaryStat
          icon={<Wallet className="h-5 w-5" />}
          label="Selisih (Net)"
          value={formatRupiah(summaryStats.net)}
          color={summaryStats.net >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* === Filter bar === */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Filter</h2>
          {isFilterActive && (
            <button
              onClick={handleResetFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white"
            >
              <RefreshCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={filters.searchNotes}
              onChange={(e) => setFilters(f => ({ ...f, searchNotes: e.target.value }))}
              placeholder="Cari catatan..."
              className="pl-9"
            />
          </div>

          {/* Date range */}
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" />
                <span className="truncate">{dateLabel}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-3 space-y-1 border-r border-slate-200 dark:border-slate-800">
                  {(['all', '7d', '30d', 'thisMonth', 'lastMonth', 'thisYear'] as DateRangePreset[]).map(preset => (
                    <button
                      key={preset}
                      onClick={() => {
                        setFilters(f => ({ ...f, datePreset: preset, customFrom: undefined, customTo: undefined }));
                        setIsDateOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                        filters.datePreset === preset ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {DATE_PRESET_LABELS[preset]}
                    </button>
                  ))}
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rentang Kustom</p>
                  <div>
                    <Label className="text-xs">Dari</Label>
                    <Calendar
                      mode="single"
                      selected={filters.customFrom}
                      onSelect={(d) => setFilters(f => ({ ...f, datePreset: 'custom', customFrom: d }))}
                      locale={idLocale}
                      initialFocus
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sampai</Label>
                    <Calendar
                      mode="single"
                      selected={filters.customTo}
                      onSelect={(d) => setFilters(f => ({ ...f, datePreset: 'custom', customTo: d }))}
                      locale={idLocale}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!filters.customFrom || !filters.customTo}
                    onClick={() => setIsDateOpen(false)}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Type */}
          <Select
            value={filters.type}
            onValueChange={(v) => setFilters(f => ({ ...f, type: v as TxTypeFilter }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TX_TYPE_LABELS) as TxTypeFilter[]).map(t => (
                <SelectItem key={t} value={t}>{TX_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={filters.categoryId?.toString() ?? 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, categoryId: v === 'all' ? undefined : Number(v), subCategoryId: undefined }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.ID} value={c.ID.toString()}>{c.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sub-category */}
          <Select
            value={filters.subCategoryId?.toString() ?? 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, subCategoryId: v === 'all' ? undefined : Number(v) }))}
            disabled={filters.categoryId === undefined && availableSubs.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sub-kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua sub-kategori</SelectItem>
              {availableSubs.map(s => (
                <SelectItem key={s.ID} value={s.ID.toString()}>{s.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account */}
          <Select
            value={filters.accountId?.toString() ?? 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, accountId: v === 'all' ? undefined : Number(v) }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Akun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua akun</SelectItem>
              {accounts.map(a => (
                <SelectItem key={a.ID} value={a.ID.toString()}>{a.Name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Amount min/max */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={filters.minAmount ?? ''}
              onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value === '' ? undefined : Number(e.target.value) }))}
            />
            <span className="text-slate-400 text-sm">—</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={filters.maxAmount ?? ''}
              onChange={(e) => setFilters(f => ({ ...f, maxAmount: e.target.value === '' ? undefined : Number(e.target.value) }))}
            />
          </div>
        </div>
      </div>

      {/* === View tabs === */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mt-6 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
            <TabButton
              active={activeView === 'list'}
              onClick={() => setActiveView('list')}
              icon={<ListIcon className="h-4 w-4" />}
              label="Semua Transaksi"
            />
            <TabButton
              active={activeView === 'analysis'}
              onClick={() => setActiveView('analysis')}
              icon={<BarChart3 className="h-4 w-4" />}
              label="Analisis"
            />
          </div>
          {activeView === 'list' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredTransactions.length} transaksi
            </p>
          )}
        </div>

        <div className="p-4">
          {activeView === 'list' ? (
            <ListView
              groupedByDate={groupedByDate}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ) : (
            <AnalysisView
              trendData={trendData}
              granularity={filters.trendGranularity}
              setGranularity={(g) => setFilters(f => ({ ...f, trendGranularity: g }))}
              topCategories={topCategories}
              descriptiveStats={descriptiveStats}
              accountBreakdown={accountBreakdown}
              periodComparison={periodComparison}
              comparisonPeriod={filters.comparisonPeriod}
              setComparisonPeriod={(p) => setFilters(f => ({ ...f, comparisonPeriod: p }))}
            />
          )}
        </div>
      </div>

      {/* === Dialogs === */}
      <TransactionFormDialog
        mode="add"
        accounts={accounts}
        categories={categories}
        onFormSubmit={handleFormSubmit}
        isOpen={isAddOpen}
        setIsOpen={setIsAddOpen}
      />

      {editTarget && (
        <TransactionFormDialog
          mode="edit"
          initialData={editTarget}
          accounts={accounts}
          categories={categories}
          onFormSubmit={handleFormSubmit}
          isOpen={isEditOpen}
          setIsOpen={setIsEditOpen}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus transaksi secara permanen dan mengembalikan saldo akun terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SummaryStat({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: string; color: 'slate' | 'emerald' | 'rose' }) {
  const colorMap = {
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  } as const;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', colorMap[color])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white truncate tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        active ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ListView({
  groupedByDate, onEdit, onDelete,
}: {
  groupedByDate: GroupedTransaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  if (groupedByDate.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
          <Receipt className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Tidak ada transaksi</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Coba ubah filter atau tambah transaksi baru.
        </p>
      </div>
    );
  }

  return (
    <div className="max-h-[640px] overflow-y-auto -mx-2 px-2">
      <div className="space-y-6">
        {groupedByDate.map(group => (
          <div key={group.date}>
            <div className="flex justify-between items-center px-3 py-2 mb-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {format(parseISO(group.date), 'EEEE, d MMMM yyyy', { locale: idLocale })}
              </p>
              <div className="flex gap-3 text-xs">
                {group.dailyIncome > 0 && (
                  <span className="text-emerald-600 font-medium inline-flex items-center gap-0.5">
                    <ArrowUp className="h-3 w-3" />
                    {formatRupiah(group.dailyIncome)}
                  </span>
                )}
                {group.dailyExpense > 0 && (
                  <span className="text-rose-600 font-medium inline-flex items-center gap-0.5">
                    <ArrowDown className="h-3 w-3" />
                    {formatRupiah(group.dailyExpense)}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              {group.transactions.map(tx => (
                <TransactionRow key={tx.ID} tx={tx} onDelete={onDelete} onEdit={onEdit} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisView({
  trendData, granularity, setGranularity,
  topCategories, descriptiveStats, accountBreakdown,
  periodComparison, comparisonPeriod, setComparisonPeriod,
}: {
  trendData: { label: string; income: number; expense: number; net: number }[];
  granularity: TrendGranularity;
  setGranularity: (g: TrendGranularity) => void;
  topCategories: { name: string; value: number; percentage: number; color: string }[];
  descriptiveStats: DescriptiveStats;
  accountBreakdown: AccountBreakdown[];
  periodComparison: PeriodComparison | null;
  comparisonPeriod: ComparisonPeriod;
  setComparisonPeriod: (p: ComparisonPeriod) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Trend chart */}
      <Card>
        <CardHeader
          title="Tren Pemasukan & Pengeluaran"
          subtitle="Visualisasi arus kas dari waktu ke waktu"
          right={
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['daily', 'weekly', 'monthly'] as TrendGranularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    granularity === g ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white'
                  )}
                >
                  {GRANULARITY_LABELS[g]}
                </button>
              ))}
            </div>
          }
        />
        {trendData.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
            Tidak ada data untuk rentang ini.
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  stroke="#cbd5e1"
                  tickFormatter={(v) => formatCompactRupiah(v)}
                />
                <Tooltip
                  formatter={(value: number) => formatRupiah(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Pemasukan" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Pengeluaran" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Period comparison */}
      {periodComparison && (
        <Card>
          <CardHeader
            title="Perbandingan Periode"
            subtitle="Bandingkan dengan periode sebelumnya"
            right={
              <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="previous">Periode sebelumnya</SelectItem>
                  <SelectItem value="lastYear">Tahun lalu</SelectItem>
                </SelectContent>
              </Select>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ComparisonMetric
              label="Pemasukan"
              current={periodComparison.current.income}
              previous={periodComparison.previous.income}
              delta={periodComparison.incomeDelta}
              color="emerald"
            />
            <ComparisonMetric
              label="Pengeluaran"
              current={periodComparison.current.expense}
              previous={periodComparison.previous.expense}
              delta={periodComparison.expenseDelta}
              color="rose"
            />
            <ComparisonMetric
              label="Selisih (Net)"
              current={periodComparison.current.net}
              previous={periodComparison.previous.net}
              delta={periodComparison.netDelta}
              color="slate"
            />
          </div>
        </Card>
      )}

      {/* Top categories + Descriptive stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title="Top Kategori Pengeluaran"
            subtitle="5 kategori dengan total terbesar"
          />
          {topCategories.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">Tidak ada data</div>
          ) : (
            <div className="space-y-3">
              {topCategories.map(cat => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{cat.percentage.toFixed(0)}%</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">{formatRupiah(cat.value)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Statistik Deskriptif"
            subtitle="Pengeluaran berdasarkan filter aktif"
          />
          {descriptiveStats.count === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">Tidak ada data</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatRow label="Jumlah" value={descriptiveStats.count.toString()} />
              <StatRow label="Total" value={formatRupiah(descriptiveStats.sum)} />
              <StatRow label="Rata-rata" value={formatRupiah(descriptiveStats.mean)} highlight />
              <StatRow label="Median" value={formatRupiah(descriptiveStats.median)} />
              <StatRow label="Tertinggi" value={formatRupiah(descriptiveStats.max)} />
              <StatRow label="Terendah" value={formatRupiah(descriptiveStats.min)} />
              <StatRow label="Standar Deviasi" value={formatRupiah(descriptiveStats.stdDev)} />
              <StatRow label="Rata-rata/Hari" value={formatRupiah(descriptiveStats.sum / Math.max(descriptiveStats.count, 1))} />
            </div>
          )}
        </Card>
      </div>

      {/* Account breakdown */}
      <Card>
        <CardHeader
          title="Breakdown per Akun"
          subtitle="Ringkasan transaksi berdasarkan akun"
        />
        {accountBreakdown.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">Belum ada akun</div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="text-left font-medium px-3 py-2">Akun</th>
                  <th className="text-right font-medium px-3 py-2">Pemasukan</th>
                  <th className="text-right font-medium px-3 py-2">Pengeluaran</th>
                  <th className="text-right font-medium px-3 py-2">Masuk</th>
                  <th className="text-right font-medium px-3 py-2">Keluar</th>
                  <th className="text-right font-medium px-3 py-2">Net</th>
                  <th className="text-right font-medium px-3 py-2">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {accountBreakdown.map(acc => (
                  <tr key={acc.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{acc.name}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                      {acc.income > 0 ? formatRupiah(acc.income) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-rose-600">
                      {acc.expense > 0 ? formatRupiah(acc.expense) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">
                      {acc.transferIn > 0 ? formatRupiah(acc.transferIn) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-blue-600">
                      {acc.transferOut > 0 ? formatRupiah(acc.transferOut) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', acc.net >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {formatRupiah(acc.net)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-200">{acc.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ComparisonMetric({
  label, current, previous, delta, color,
}: { label: string; current: number; previous: number; delta: number; color: 'emerald' | 'rose' | 'slate' }) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const noChange = delta === 0;
  const isGoodDirection = color === 'emerald' ? isUp : color === 'rose' ? isDown : isUp;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50/50">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{label}</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatRupiah(current)}</p>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
        <p className="text-xs text-slate-500 dark:text-slate-400">vs {formatRupiah(previous)}</p>
        {!noChange ? (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-semibold',
            isGoodDirection ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : (
          <span className="text-xs text-slate-400">0%</span>
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">{children}</div>;
}

function CardHeader({
  title, subtitle, right,
}: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-lg p-3', highlight ? 'bg-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800/50')}>
      <p className={cn('text-xs font-medium mb-1', highlight ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400')}>{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums truncate', highlight ? 'text-white' : 'text-slate-900 dark:text-white')}>{value}</p>
    </div>
  );
}
