// file: src/components/TransactionFormDialog.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Definisikan tipe data yang relevan
interface Account { ID: number; Name: string; }
interface SubCategory { ID: number; Name: string; }
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

// Skema validasi form
const formSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer']),
  amount: z.coerce.number().positive({ message: 'Jumlah harus lebih dari 0.' }),
  account_id: z.string().min(1, { message: 'Akun harus dipilih.' }),
  sub_category_id: z.string().optional(),
  destination_account_id: z.string().optional(),
  category_id: z.string().optional(),
  transaction_date: z.date(),
  notes: z.string().optional(),
}).refine(data => data.type === 'transfer' ? !!data.destination_account_id && data.destination_account_id !== '' : true, {
  message: 'Akun tujuan harus dipilih untuk transfer.', path: ['destination_account_id'],
}).refine(data => data.type !== 'transfer' ? !!data.category_id && data.category_id !== '' : true, {
  message: 'Kategori harus dipilih.', path: ['category_id'],
}).refine(data => data.type !== 'transfer' ? !!data.sub_category_id && data.sub_category_id !== '' : true, {
  message: 'Sub-kategori harus dipilih.', path: ['sub_category_id'],
});

// Props untuk komponen
interface TransactionFormDialogProps {
  accounts: Account[];
  categories: Category[];
  onFormSubmit: () => Promise<void>;
  mode: 'add' | 'edit';
  initialData?: Transaction | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function TransactionFormDialog({ accounts, categories, onFormSubmit, mode, initialData, isOpen, setIsOpen }: TransactionFormDialogProps) {
  interface FormValues {
    type: 'expense' | 'income' | 'transfer';
    amount: number;
    account_id: string;
    category_id?: string;
    sub_category_id?: string;
    destination_account_id?: string;
    transaction_date: Date;
    notes?: string;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
  });

  const transactionType = form.watch('type');
  const selectedCategoryId = form.watch('category_id');
  const filteredSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    const cat = categories.find(c => c.ID.toString() === selectedCategoryId);
    return cat?.SubCategories || [];
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    // Isi form dengan data awal jika dalam mode edit saat dialog terbuka
    if (isOpen && mode === 'edit' && initialData) {
      const parentCategory = initialData.SubCategory
        ? categories.find(c => c.SubCategories?.some(s => s.ID === initialData.SubCategory?.ID))
        : undefined;
      form.reset({
        type: initialData.Type,
        transaction_date: new Date(initialData.TransactionDate),
        amount: initialData.Amount,
        account_id: initialData.Account.ID.toString(),
        category_id: parentCategory?.ID?.toString() || '',
        sub_category_id: initialData.SubCategory?.ID?.toString() || '',
        destination_account_id: initialData.DestinationAccountID?.toString() || '',
        notes: initialData.Notes || '',
      });
    } else if (isOpen && mode === 'add') {
      // Reset ke default untuk mode tambah saat dialog terbuka
      form.reset({
        type: 'expense',
        transaction_date: new Date(),
        amount: 0,
        account_id: '',
        category_id: '',
        sub_category_id: '',
        destination_account_id: '',
        notes: '',
      });
    }
  }, [isOpen, initialData, mode, form, categories]);

  // Reset field kategori & sub-kategori saat tipe berubah
  useEffect(() => {
    if (isOpen) { // Hanya reset jika dialog terbuka
        form.resetField('category_id', { defaultValue: '' });
        form.resetField('sub_category_id', { defaultValue: '' });
    }
  }, [transactionType, form, isOpen]);

  // Reset sub-kategori saat kategori berubah
  useEffect(() => {
    if (isOpen) {
      form.resetField('sub_category_id', { defaultValue: '' });
    }
  }, [selectedCategoryId, form, isOpen]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { category_id, ...rest } = values;
    void category_id;
    const payload = {
      ...rest,
      account_id: parseInt(rest.account_id),
      sub_category_id: rest.sub_category_id ? parseInt(rest.sub_category_id) : null,
      destination_account_id: rest.destination_account_id ? parseInt(rest.destination_account_id) : null,
    };
    try {
      if (mode === 'add') {
        await apiClient.post('/api/transactions', payload);
      } else {
        await apiClient.put(`/api/transactions/${initialData?.ID}`, payload);
      }
      await onFormSubmit();
      setIsOpen(false);
    } catch (error) {
      console.error(`Failed to ${mode} transaction`, error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'New Transaction' : 'Edit Transaction'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem className="space-y-3"><FormLabel>Tipe Transaksi</FormLabel><FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="expense" /></FormControl><FormLabel className="font-normal">Pengeluaran</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="income" /></FormControl><FormLabel className="font-normal">Pemasukan</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="transfer" /></FormControl><FormLabel className="font-normal">Transfer</FormLabel></FormItem>
                  </RadioGroup></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" placeholder="Rp 0" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="transaction_date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Tanggal</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="account_id" render={({ field }) => (<FormItem><FormLabel>{transactionType === 'transfer' ? 'Dari Akun' : 'Akun'}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger></FormControl><SelectContent>{accounts.map(acc => <SelectItem key={acc.ID} value={acc.ID.toString()}>{acc.Name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            {transactionType === 'transfer' && (<FormField control={form.control} name="destination_account_id" render={({ field }) => (<FormItem><FormLabel>Ke Akun</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Pilih akun tujuan" /></SelectTrigger></FormControl><SelectContent>{accounts.map(acc => <SelectItem key={acc.ID} value={acc.ID.toString()}>{acc.Name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />)}
            {transactionType !== 'transfer' && (
              <>
                <FormField control={form.control} name="category_id" render={({ field }) => {
                  const filtered = categories.filter(cat => cat.Type === transactionType);
                  const hasAny = filtered.some(c => c.SubCategories && c.SubCategories.length > 0);
                  return (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!hasAny}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={hasAny ? 'Pilih kategori' : 'Belum ada kategori'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filtered.length === 0 && (
                            <SelectItem value="__empty__" disabled>
                              Belum ada kategori {transactionType === 'expense' ? 'pengeluaran' : 'pemasukan'}
                            </SelectItem>
                          )}
                          {filtered.map(cat => (
                            <SelectItem key={cat.ID} value={cat.ID.toString()}>
                              {cat.Name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        <FormMessage />
                      </Select>
                      {!hasAny && (
                        <p className="text-xs text-muted-foreground">
                          Tambahkan kategori di halaman <a href="/categories" className="underline text-blue-600 hover:text-blue-800">Kategori</a> terlebih dahulu.
                        </p>
                      )}
                    </FormItem>
                  );
                }} />
                <FormField control={form.control} name="sub_category_id" render={({ field }) => {
                  if (!selectedCategoryId) return <></>;
                  return (
                    <FormItem>
                      <FormLabel>Sub-Kategori</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sub-kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredSubCategories.length === 0 && (
                            <SelectItem value="__empty__" disabled>Kategori ini belum memiliki sub-kategori</SelectItem>
                          )}
                          {filteredSubCategories.map(sub => (
                            <SelectItem key={sub.ID} value={sub.ID.toString()}>
                              {sub.Name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        <FormMessage />
                      </Select>
                    </FormItem>
                  );
                }} />
              </>
            )}
            <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Catatan</FormLabel><FormControl><Input placeholder="Catatan singkat (opsional)" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <Button type="submit" className="w-full">{mode === 'add' ? 'Simpan Transaksi' : 'Simpan Perubahan'}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}