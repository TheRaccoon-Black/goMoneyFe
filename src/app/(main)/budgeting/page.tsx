'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import apiClient from '@/lib/axios';
import MonthNavigator from '@/components/MonthNavigator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';

// Interfaces
interface Category { ID: number; Name: string; Type: string; }
interface Budget { ID: number; CategoryID: number; Amount: number; }
interface Transaction { Amount: number; Type: string; SubCategory?: { Category: { ID: number } } }

// Tipe data gabungan untuk UI
interface BudgetRowData {
  categoryID: number;
  categoryName: string;
  budgeted: number;
  spent: number;
  remaining: number;
  progress: number;
  suggested: number;
}

interface BudgetSuggestion {
  category_id: number;
  suggested_amount: number;
}

export default function BudgetingPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pageLoading, setPageLoading] = useState(true);

  // Data dari API
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // State untuk input user
  const [budgetInputs, setBudgetInputs] = useState<{ [key: number]: string }>({});

  const [suggestions, setSuggestions] = useState<BudgetSuggestion[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push('/login'); return; }

    const fetchData = async () => {
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

        // Inisialisasi input dengan data budget yang ada
        const initialInputs: { [key: number]: string } = {};
        (budgetsRes.data || []).forEach((b: Budget) => {
          initialInputs[b.CategoryID] = b.Amount.toString();
        });
        setBudgetInputs(initialInputs);

      } catch (error) { console.error('Failed to fetch data', error);
      } finally { setPageLoading(false); }
    };
    fetchData();
  }, [token, authLoading, currentDate, router]);

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
      return { categoryID: category.ID, categoryName: category.Name, budgeted, spent, remaining, progress, suggested};
    });
  }, [expenseCategories, transactions, budgets, suggestions]);

  const handleInputChange = (categoryID: number, value: string) => {
    setBudgetInputs(prev => ({ ...prev, [categoryID]: value }));
  };

  const handleSaveBudgets = async () => {
    const payload = Object.entries(budgetInputs).map(([catId, amountStr]) => ({
      category_id: parseInt(catId),
      amount: parseFloat(amountStr) || 0,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    }));

    toast.promise(apiClient.post('/api/budgets', payload), {
        loading: 'Menyimpan budget...',
        success: 'Budget berhasil disimpan!',
        error: 'Gagal menyimpan budget.',
    });
  };

  const handleUseSuggestion = (categoryID: number, suggestedAmount: number) => {
    handleInputChange(categoryID, suggestedAmount.toString());
  };

  if (pageLoading || authLoading) return <div>Loading...</div>;

  return (
    <div className="lg:ml-64 p-8">
      <Toaster />
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Atur Budget</h1>
          <MonthNavigator currentDate={currentDate} setCurrentDate={setCurrentDate} />
        </div>

        <div className="bg-white rounded-lg shadow-md border p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-5 gap-4 font-semibold text-gray-500 text-sm px-4">
              <div className="col-span-2">Kategori</div>
              <div className="text-right">Dihabiskan</div>
              <div className="text-right">Sisa</div>
              <div className="text-right">Budget</div>
            </div>

            {budgetData.map(item => (
              <div key={item.categoryID} className="grid grid-cols-5 gap-4 items-center border-t py-4 px-4">
                <div className="col-span-2">
                  <p className="font-semibold">{item.categoryName}</p>
                  <Progress value={item.progress} className="mt-1 h-2" />
                </div>
                <div className="text-right text-red-600">
                  {new Intl.NumberFormat('id-ID').format(item.spent)}
                </div>
                <div className={`text-right font-medium ${item.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {new Intl.NumberFormat('id-ID').format(item.remaining)}
                </div>
                <div className="text-right">
                  <Input
                    type="number"
                    className="text-right"
                    value={budgetInputs[item.categoryID] || ''}
                    onChange={(e) => handleInputChange(item.categoryID, e.target.value)}
                    placeholder="Rp 0"
                  />
                  {item.budgeted === 0 && item.suggested > 0 && (
                   <Button 
                     variant="link" 
                     size="sm" 
                     className="p-0 h-auto text-xs text-blue-600"
                     onClick={() => handleUseSuggestion(item.categoryID, item.suggested)}
                   >
                     Gunakan sugesti: {new Intl.NumberFormat('id-ID').format(item.suggested)}
                   </Button>
                )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSaveBudgets}>Simpan Perubahan</Button>
          </div>
        </div>
      </div>
    </div>
  );
}