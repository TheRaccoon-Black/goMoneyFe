'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Pencil, Trash2, Plus, Search, Tag, ChevronRight,
  TrendingUp, TrendingDown, FolderOpen, ListTree, Wallet,
} from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

// --- Types ---
type CategoryType = 'income' | 'expense';
interface SubCategory { ID: number; Name: string; }
interface Category { ID: number; Name: string; Type: CategoryType; SubCategories: SubCategory[]; }

const categorySchema = z.object({ name: z.string().min(1, 'Nama kategori wajib diisi.') });
const subCategorySchema = z.object({ name: z.string().min(1, 'Nama sub-kategori wajib diisi.') });

type CategoryFormValues = z.infer<typeof categorySchema>;
type SubCategoryFormValues = z.infer<typeof subCategorySchema>;

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');

  // Category dialog
  const [catDialog, setCatDialog] = useState<{ open: boolean; mode: 'add' | 'edit'; target: Category | null }>(
    { open: false, mode: 'add', target: null }
  );
  const [catToDelete, setCatToDelete] = useState<Category | null>(null);

  // Sub-category dialog
  const [subDialog, setSubDialog] = useState<{
    open: boolean; mode: 'add' | 'edit';
    parent: Category | null; target: SubCategory | null;
  }>({ open: false, mode: 'add', parent: null, target: null });
  const [subToDelete, setSubToDelete] = useState<{ parent: Category; target: SubCategory } | null>(null);

  // Forms
  const catForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });
  const subForm = useForm<SubCategoryFormValues>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: { name: '' },
  });

  // --- Fetch ---
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/categories');
      setCategories(res.data || []);
    } catch (e) {
      console.error('Failed to fetch categories', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // --- Reset forms on dialog open ---
  useEffect(() => {
    if (!catDialog.open) return;
    catForm.reset({ name: catDialog.mode === 'edit' && catDialog.target ? catDialog.target.Name : '' });
  }, [catDialog.open, catDialog.mode, catDialog.target, catForm]);

  useEffect(() => {
    if (!subDialog.open) return;
    subForm.reset({ name: subDialog.mode === 'edit' && subDialog.target ? subDialog.target.Name : '' });
  }, [subDialog.open, subDialog.mode, subDialog.target, subForm]);

  // --- Category CRUD ---
  const onSubmitCategory = async (values: CategoryFormValues) => {
    try {
      if (catDialog.mode === 'add') {
        const type: CategoryType = catDialog.target?.Type ?? 'expense';
        await apiClient.post('/api/categories', { name: values.name, type });
      } else if (catDialog.target) {
        await apiClient.put(`/api/categories/${catDialog.target.ID}`, {
          name: values.name,
          type: catDialog.target.Type,
        });
      }
      setCatDialog({ open: false, mode: 'add', target: null });
      await fetchCategories();
    } catch (e) {
      console.error('Failed to save category', e);
    }
  };

  const onDeleteCategory = async () => {
    if (!catToDelete) return;
    try {
      await apiClient.delete(`/api/categories/${catToDelete.ID}`);
      setCatToDelete(null);
      await fetchCategories();
    } catch (e) {
      console.error('Failed to delete category', e);
    }
  };

  // --- SubCategory CRUD ---
  const onSubmitSubCategory = async (values: SubCategoryFormValues) => {
    if (!subDialog.parent) return;
    try {
      if (subDialog.mode === 'add') {
        await apiClient.post(`/api/categories/${subDialog.parent.ID}/subcategories`, { name: values.name });
      } else if (subDialog.target) {
        await apiClient.put(`/api/subcategories/${subDialog.target.ID}`, { name: values.name });
      }
      setSubDialog({ open: false, mode: 'add', parent: null, target: null });
      await fetchCategories();
    } catch (e) {
      console.error('Failed to save sub-category', e);
    }
  };

  const onDeleteSubCategory = async () => {
    if (!subToDelete) return;
    try {
      await apiClient.delete(`/api/subcategories/${subToDelete.target.ID}`);
      setSubToDelete(null);
      await fetchCategories();
    } catch (e) {
      console.error('Failed to delete sub-category', e);
    }
  };

  // --- Derived stats ---
  const stats = useMemo(() => {
    const income = categories.filter(c => c.Type === 'income');
    const expense = categories.filter(c => c.Type === 'expense');
    const subCount = categories.reduce((acc, c) => acc + (c.SubCategories?.length ?? 0), 0);
    return {
      total: categories.length,
      incomeCount: income.length,
      expenseCount: expense.length,
      subCount,
    };
  }, [categories]);

  const filtered = useMemo(() => {
    const list = categories.filter(c => c.Type === activeTab);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      c.Name.toLowerCase().includes(q) ||
      c.SubCategories?.some(s => s.Name.toLowerCase().includes(q))
    );
  }, [categories, activeTab, search]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* === Header === */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>Beranda</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-700 font-medium">Manajemen Kategori</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kategori Transaksi</h1>
          <p className="text-slate-500 mt-0.5">
            Kelola kategori dan sub-kategori untuk transaksi keuangan Anda.
          </p>
        </div>
      </div>

        {/* === Stats === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FolderOpen className="h-5 w-5" />}
            label="Total Kategori"
            value={stats.total}
            color="slate"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Pemasukan"
            value={stats.incomeCount}
            color="emerald"
          />
          <StatCard
            icon={<TrendingDown className="h-5 w-5" />}
            label="Pengeluaran"
            value={stats.expenseCount}
            color="rose"
          />
          <StatCard
            icon={<ListTree className="h-5 w-5" />}
            label="Sub-Kategori"
            value={stats.subCount}
            color="amber"
          />
        </div>

        {/* === Tabs + Search === */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
              <TabButton
                active={activeTab === 'expense'}
                onClick={() => setActiveTab('expense')}
                icon={<TrendingDown className="h-4 w-4" />}
                label="Pengeluaran"
                color="rose"
              />
              <TabButton
                active={activeTab === 'income'}
                onClick={() => setActiveTab('income')}
                icon={<TrendingUp className="h-4 w-4" />}
                label="Pemasukan"
                color="emerald"
              />
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kategori atau sub-kategori..."
                className="pl-9"
              />
            </div>
          </div>

          {/* === Content === */}
          <div className="p-4">
            {filtered.length === 0 ? (
              <EmptyState
                type={activeTab}
                hasSearch={!!search}
                onAdd={() => setCatDialog({ open: true, mode: 'add', target: { ID: 0, Name: '', Type: activeTab, SubCategories: [] } })}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((cat) => (
                  <CategoryCard
                    key={cat.ID}
                    category={cat}
                    onEditCategory={() => setCatDialog({ open: true, mode: 'edit', target: cat })}
                    onDeleteCategory={() => setCatToDelete(cat)}
                    onAddSub={() => setSubDialog({ open: true, mode: 'add', parent: cat, target: null })}
                    onEditSub={(sub) => setSubDialog({ open: true, mode: 'edit', parent: cat, target: sub })}
                    onDeleteSub={(sub) => setSubToDelete({ parent: cat, target: sub })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Category dialog (single instance) ===== */}
        <Dialog
          open={catDialog.open}
          onOpenChange={(open) => !open && setCatDialog({ open: false, mode: 'add', target: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                {catDialog.mode === 'add' ? 'Tambah' : 'Edit'} Kategori{' '}
                {catDialog.target?.Type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </DialogTitle>
              <DialogDescription>
                Kategori digunakan untuk mengelompokkan transaksi Anda.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={catForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nama Kategori</Label>
                <Input
                  id="cat-name"
                  {...catForm.register('name')}
                  placeholder={catDialog.target?.Type === 'income' ? 'Contoh: Gaji, Bonus' : 'Contoh: Makanan, Transport'}
                  autoFocus
                />
                {catForm.formState.errors.name && (
                  <p className="text-sm text-red-500">{catForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCatDialog({ open: false, mode: 'add', target: null })}>
                  Batal
                </Button>
                <Button type="submit">
                  {catDialog.mode === 'add' ? 'Tambah' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ===== Sub-category dialog (single instance) ===== */}
        <Dialog
          open={subDialog.open}
          onOpenChange={(open) => !open && setSubDialog({ open: false, mode: 'add', parent: null, target: null })}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListTree className="h-5 w-5" />
                {subDialog.mode === 'add' ? 'Tambah' : 'Edit'} Sub-Kategori
              </DialogTitle>
              {subDialog.parent && (
                <DialogDescription>
                  Pada kategori: <span className="font-medium text-slate-700">{subDialog.parent.Name}</span>
                </DialogDescription>
              )}
            </DialogHeader>
            <form onSubmit={subForm.handleSubmit(onSubmitSubCategory)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sub-name">Nama Sub-Kategori</Label>
                <Input
                  id="sub-name"
                  {...subForm.register('name')}
                  placeholder="Contoh: Makan siang, Bensin"
                  autoFocus
                />
                {subForm.formState.errors.name && (
                  <p className="text-sm text-red-500">{subForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setSubDialog({ open: false, mode: 'add', parent: null, target: null })}>
                  Batal
                </Button>
                <Button type="submit">
                  {subDialog.mode === 'add' ? 'Tambah' : 'Simpan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ===== Delete confirmations ===== */}
        <AlertDialog open={!!catToDelete} onOpenChange={(open) => !open && setCatToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus kategori &ldquo;{catToDelete?.Name}&rdquo; dan semua sub-kategori di dalamnya secara permanen. Transaksi yang sudah ada dengan kategori ini mungkin terpengaruh.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteCategory} className="bg-red-600 hover:bg-red-700">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!subToDelete} onOpenChange={(open) => !open && setSubToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Sub-Kategori?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini akan menghapus sub-kategori &ldquo;{subToDelete?.target.Name}&rdquo; secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteSubCategory} className="bg-red-600 hover:bg-red-700">
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number; color: 'slate' | 'emerald' | 'rose' | 'amber' }) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
  } as const;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', colorMap[color])}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, color,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: 'emerald' | 'rose' }) {
  const activeMap = {
    emerald: 'bg-white text-emerald-700 shadow-sm',
    rose: 'bg-white text-rose-700 shadow-sm',
  } as const;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
        active ? activeMap[color] : 'text-slate-600 hover:text-slate-900'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CategoryCard({
  category, onEditCategory, onDeleteCategory,
  onAddSub, onEditSub, onDeleteSub,
}: {
  category: Category;
  onEditCategory: () => void;
  onDeleteCategory: () => void;
  onAddSub: () => void;
  onEditSub: (sub: SubCategory) => void;
  onDeleteSub: (sub: SubCategory) => void;
}) {
  const isIncome = category.Type === 'income';
  const accent = isIncome ? 'emerald' : 'rose';
  const subs = category.SubCategories ?? [];

  return (
    <div className={cn(
      'group rounded-xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden',
      'border-slate-200 hover:border-slate-300'
    )}>
      {/* Top accent bar */}
      <div className={cn(
        'h-1',
        isIncome ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'
      )} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
              isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            )}>
              <Tag className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{category.Name}</h3>
              <p className="text-xs text-slate-500">
                {subs.length} sub-kategori
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditCategory} title="Edit kategori">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-rose-50" onClick={onDeleteCategory} title="Hapus kategori">
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </Button>
          </div>
        </div>

        {/* Subcategories */}
        {subs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {subs.map((sub) => (
              <span
                key={sub.ID}
                className={cn(
                  'group/chip inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md text-xs font-medium border',
                  isIncome
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                )}
              >
                {sub.Name}
                <button
                  onClick={() => onEditSub(sub)}
                  className="ml-0.5 inline-flex items-center justify-center h-5 w-5 rounded hover:bg-white/60"
                  title="Edit sub-kategori"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => onDeleteSub(sub)}
                  className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-white/60"
                  title="Hapus sub-kategori"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Belum ada sub-kategori</p>
        )}

        {/* Add sub */}
        <button
          onClick={onAddSub}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed text-xs font-medium transition-colors',
            isIncome
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border-rose-200 text-rose-700 hover:bg-rose-50'
          )}
        >
          <Plus className="h-3 w-3" /> Tambah Sub-Kategori
        </button>
      </div>
    </div>
  );
}

function EmptyState({ type, hasSearch, onAdd }: { type: CategoryType; hasSearch: boolean; onAdd: () => void }) {
  const isIncome = type === 'income';
  if (hasSearch) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-3">
          <Search className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-900">Tidak ditemukan</h3>
        <p className="text-sm text-slate-500 mt-1">
          Coba kata kunci lain atau hapus pencarian.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center py-12">
      <div className={cn(
        'inline-flex h-14 w-14 items-center justify-center rounded-full mb-3',
        isIncome ? 'bg-emerald-100' : 'bg-rose-100'
      )}>
        <Wallet className={cn('h-6 w-6', isIncome ? 'text-emerald-600' : 'text-rose-600')} />
      </div>
      <h3 className="font-semibold text-slate-900">
        Belum ada kategori {isIncome ? 'pemasukan' : 'pengeluaran'}
      </h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        Mulai dengan menambahkan kategori pertama Anda.
      </p>
      <Button onClick={onAdd} variant="outline" className="bg-white">
        <Plus className="h-4 w-4 mr-1" /> Tambah Kategori
      </Button>
    </div>
  );
}
