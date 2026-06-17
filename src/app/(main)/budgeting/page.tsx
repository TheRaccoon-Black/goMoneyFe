'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Sparkles, Target, TrendingUp, AlertCircle, Save, Loader2 } from 'lucide-react';
import apiClient from '@/lib/axios';
import MonthNavigator from '@/components/MonthNavigator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from 'sonner';

interface Category { ID: number; Name: string; Type: string; }
interface Budget { ID: number; CategoryID: number; Amount: number; }
interface Transaction { Amount: number; Type: string; SubCategory?: { Category: { ID: number } } }
interface BudgetSuggestion { category_id: number; suggested_amount: number; }

interface BudgetRowData {
  categoryID: number;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  progress: number;
  suggested: number;
  status: 'safe' | 'warning' | 'over';
}

export default function BudgetingPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetInputs, setBudgetInputs] = useState<{ [key: number]: string }>({});
  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setPageLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [categoriesRes, transactionsRes, budgetsRes, suggestionsRes] = await Promise.all([
        apiClient.get('/api/categories?type=expense'),
        apiClient.get(`/api/transactions?year=${year}&month=${month}`),
        apiClient.get(`/api/budgets?year=${year}&month=${month}`),
        apiClient.get(`/api/budgets/suggestions?year=${year}&month=${month}`),
      ]);

      setExpenseCategories(categoriesRes.data || []);
      setTransactions(transactionsRes.data || []);
      setBudgets(budgetsRes.data || []);
      setSuggestions(suggestionsRes.data || []);

      const initialInputs: { [key: number]: string } = {};
      (budgetsRes.data || []).forEach((b: Budget) => {
        initialInputs[b.CategoryID] = b.Amount.toString();
      });
      setBudgetInputs(initialInputs);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setPageLoading(false);
    }
  }, [token, currentDate]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, [token, authLoading, currentDate, fetchData, router]);

  const budgetData = useMemo<BudgetRowData[]>(() => {
    return expenseCategories.map(category => {
      const budget = budgets.find(b => b.CategoryID === category.ID);
      const budgeted = budget ? budget.Amount : 0;

      const spent = transactions
        .filter(t => t.SubCategory?.Category.ID === category.ID)
        .reduce((sum, t) => sum + t.Amount, 0);

      const remaining = budgeted - spent;
      const progress = budgeted > 0 ? (spent / budgeted) * 100 : 0;
      const suggestion = suggestions.find(s => s.category_id === category.ID);
      const suggested = suggestion ? suggestion.suggested_amount : 0;

      let status: 'safe' | 'warning' | 'over' = 'safe';
      if (budgeted > 0) {
        if (progress >= 100) status = 'over';
        else if (progress >= 80) status = 'warning';
      }

      return { categoryID: category.ID, categoryName: category.Name, budgeted, spent, remaining, progress, suggested, status };
    });
  }, [expenseCategories, transactions, budgets, suggestions]);

  const totals = useMemo(() => {
    return budgetData.reduce(
      (acc, item) => {
        acc.budgeted += item.budgeted;
        acc.spent += item.spent;
        return acc;
      },
      { budgeted: 0, spent: 0 }
    );
  }, [budgetData]);

  const overallProgress = totals.budgeted > 0 ? (totals.spent / totals.budgeted) * 100 : 0;

  const handleInputChange = (categoryID: number, value: string) => {
    setBudgetInputs(prev => ({ ...prev, [categoryID]: value }));
  };

  const handleSaveBudgets = async () => {
    setSaving(true);
    const payload = Object.entries(budgetInputs).map(([catId, amountStr]) => ({
      category_id: parseInt(catId),
      amount: parseFloat(amountStr) || 0,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }));

    try {
      await apiClient.post('/api/budgets', payload);
      toast.success('Budgets saved successfully');
      await fetchData();
    } catch {
      toast.error('Failed to save budgets');
    } finally {
      setSaving(false);
    }
  };

  const handleUseSuggestion = (categoryID: number, suggestedAmount: number) => {
    handleInputChange(categoryID, suggestedAmount.toString());
  };

  if (pageLoading || authLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  const sortedBudgetData = [...budgetData].sort((a, b) => {
    if (a.budgeted === 0 && b.budgeted === 0) return a.categoryName.localeCompare(b.categoryName);
    if (a.budgeted === 0) return 1;
    if (b.budgeted === 0) return -1;
    return b.progress - a.progress;
  });

  return (
    <>
      <Toaster />

      {/* Page header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Budgeting</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Plan and track your monthly spending by category.</p>
          </div>
          <MonthNavigator currentDate={currentDate} setCurrentDate={setCurrentDate} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryMetric
          icon={Target}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Budgeted"
          value={formatCurrency(totals.budgeted)}
        />
        <SummaryMetric
          icon={TrendingUp}
          iconBg="bg-gray-100 dark:bg-slate-800"
          iconColor="text-gray-700 dark:text-slate-200"
          label="Total Spent"
          value={formatCurrency(totals.spent)}
        />
        <SummaryMetric
          icon={AlertCircle}
          iconBg={totals.budgeted - totals.spent < 0 ? 'bg-red-50' : 'bg-emerald-50'}
          iconColor={totals.budgeted - totals.spent < 0 ? 'text-red-500' : 'text-emerald-600'}
          label="Remaining"
          value={formatCurrency(totals.budgeted - totals.spent)}
          valueColor={totals.budgeted - totals.spent < 0 ? 'text-red-500' : 'text-emerald-600'}
        />
      </div>

      {/* Overall progress */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly progress</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {overallProgress > 100
                ? `Over budget by ${formatCurrency(totals.spent - totals.budgeted)}`
                : `${formatCurrency(totals.budgeted - totals.spent)} left to spend`}
            </p>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{Math.min(100, overallProgress).toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              overallProgress >= 100 ? 'bg-red-500' : overallProgress >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, overallProgress)}%` }}
          />
        </div>
      </div>

      {/* Category list */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Categories</h2>
          <span className="text-xs text-gray-500 dark:text-slate-400">{sortedBudgetData.length} expense categories</span>
        </div>

        {sortedBudgetData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500 dark:text-slate-400">No expense categories yet. Add one to start budgeting.</p>
          </div>
        ) : (
          <div>
            {sortedBudgetData.map((item, idx) => (
              <BudgetRow
                key={item.categoryID}
                item={item}
                isLast={idx === sortedBudgetData.length - 1}
                inputValue={budgetInputs[item.categoryID] || ''}
                onInputChange={handleInputChange}
                onUseSuggestion={handleUseSuggestion}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-6 lg:-mx-8 mt-6 px-6 lg:px-8 py-4 bg-white dark:bg-slate-900/80 backdrop-blur border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {Object.values(budgetInputs).filter(v => v && parseFloat(v) > 0).length} categories with budget
          </p>
          <Button onClick={handleSaveBudgets} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

function SummaryMetric({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = 'text-gray-900 dark:text-white',
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className={`${iconBg} p-2 rounded-lg`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-semibold tracking-tight ${valueColor}`}>{value}</p>
    </div>
  );
}

function BudgetRow({
  item,
  isLast,
  inputValue,
  onInputChange,
  onUseSuggestion,
  formatCurrency,
}: {
  item: BudgetRowData;
  isLast: boolean;
  inputValue: string;
  onInputChange: (id: number, value: string) => void;
  onUseSuggestion: (id: number, amount: number) => void;
  formatCurrency: (n: number) => string;
}) {
  const statusColors = {
    safe: { bar: 'bg-emerald-500', text: 'text-emerald-600' },
    warning: { bar: 'bg-amber-500', text: 'text-amber-600' },
    over: { bar: 'bg-red-500', text: 'text-red-500' },
  }[item.status];

  return (
    <div className={`px-6 py-5 ${!isLast ? 'border-b border-gray-100 dark:border-slate-800' : ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Category + progress */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.categoryName}</p>
            {item.budgeted > 0 && (
              <span className={`text-xs font-semibold ${statusColors.text}`}>
                {item.progress.toFixed(0)}%
              </span>
            )}
          </div>
          <div className="h-1.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusColors.bar}`}
              style={{ width: `${Math.min(100, item.progress)}%` }}
            />
          </div>
        </div>

        {/* Spent / Remaining */}
        <div className="lg:col-span-2 text-left lg:text-right">
          <p className="text-xs text-gray-500 dark:text-slate-400">Spent</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{formatCurrency(item.spent)}</p>
        </div>

        <div className="lg:col-span-2 text-left lg:text-right">
          <p className="text-xs text-gray-500 dark:text-slate-400">Remaining</p>
          <p className={`text-sm font-semibold tabular-nums ${item.remaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
            {item.budgeted > 0 ? formatCurrency(item.remaining) : '—'}
          </p>
        </div>

        {/* Budget input */}
        <div className="lg:col-span-3">
          {item.suggested > 0 && item.budgeted === 0 && (
            <button
              type="button"
              onClick={() => onUseSuggestion(item.categoryID, item.suggested)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-1.5 group"
            >
              <Sparkles className="h-3 w-3" />
              <span className="underline-offset-2 group-hover:underline">
                Suggestion: {formatCurrency(item.suggested)}
              </span>
            </button>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Rp</span>
            <Input
              type="number"
              inputMode="numeric"
              className="pl-9 text-right tabular-nums"
              value={inputValue}
              onChange={(e) => onInputChange(item.categoryID, e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
