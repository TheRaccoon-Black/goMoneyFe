'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import apiClient from '@/lib/axios';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Definisikan tipe data
interface Account { ID: number; Name: string; Balance: number; }
interface SubCategory { ID: number; Name: string; }
interface Category { ID: number; Name: string; Type: string; SubCategories: SubCategory[]; }

// Skema validasi
const formSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer'], { required_error: 'Tipe transaksi harus dipilih.' }),
  amount: z.coerce.number().positive({ message: 'Jumlah harus lebih dari 0.' }),
  account_id: z.string().min(1, { message: 'Akun harus dipilih.' }),
  sub_category_id: z.string().optional(),
  destination_account_id: z.string().optional(),
  transaction_date: z.date({ required_error: 'Tanggal harus diisi.' }),
  notes: z.string().optional(),
}).refine(data => data.type === 'transfer' ? !!data.destination_account_id && data.destination_account_id !== '' : true, {
  message: 'Akun tujuan harus dipilih untuk transfer.',
  path: ['destination_account_id'],
}).refine(data => data.type !== 'transfer' ? !!data.sub_category_id && data.sub_category_id !== '' : true, {
  message: 'Kategori harus dipilih untuk pemasukan/pengeluaran.',
  path: ['sub_category_id'],
});

interface AddTransactionDialogProps {
  accounts: Account[];
  categories: Category[];
  onTransactionAdded: (newTransaction: any, updatedAccounts: Account[]) => void;
}

export default function AddTransactionDialog({ accounts, categories, onTransactionAdded }: AddTransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // PASTIKAN SEMUA FIELD ADA DI SINI UNTUK MENGHINDARI WARNING
    defaultValues: {
      type: 'expense',
      transaction_date: new Date(),
      amount: 0,
      account_id: '',
      sub_category_id: '',
      destination_account_id: '',
      notes: '',
    },
  });

  const transactionType = form.watch('type');
  
  // Reset field kategori saat tipe berubah
  useEffect(() => {
    form.resetField('sub_category_id');
  }, [transactionType, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      account_id: parseInt(values.account_id),
      sub_category_id: values.sub_category_id ? parseInt(values.sub_category_id) : null,
      destination_account_id: values.destination_account_id ? parseInt(values.destination_account_id) : null,
    };
    try {
      const response = await apiClient.post('/api/transactions', payload);
      const accountsResponse = await apiClient.get('/api/accounts');
      onTransactionAdded(response.data, accountsResponse.data);
      form.reset({
        type: 'expense',
        transaction_date: new Date(),
        amount: 0,
        account_id: '',
        sub_category_id: '',
        destination_account_id: '',
        notes: '',
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add transaction', error);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>+ Transaksi</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Transaksi Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem className="space-y-3"><FormLabel>Tipe Transaksi</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="expense" /></FormControl><FormLabel className="font-normal">Pengeluaran</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="income" /></FormControl><FormLabel className="font-normal">Pemasukan</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="transfer" /></FormControl><FormLabel className="font-normal">Transfer</FormLabel></FormItem>
                  </RadioGroup>
                </FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" placeholder="Rp 0" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="transaction_date" render={({ field }) => (
              <FormItem className="flex flex-col"><FormLabel>Tanggal</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP") : <span>Pilih tanggal</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button></FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent></Popover>
                <FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="account_id" render={({ field }) => (
              <FormItem><FormLabel>{transactionType === 'transfer' ? 'Dari Akun' : 'Akun'}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih akun" /></SelectTrigger></FormControl>
                  <SelectContent>{accounts.map(acc => <SelectItem key={acc.ID} value={acc.ID.toString()}>{acc.Name}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
            )} />

            {transactionType === 'transfer' && (
              <FormField control={form.control} name="destination_account_id" render={({ field }) => (
                <FormItem><FormLabel>Ke Akun</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih akun tujuan" /></SelectTrigger></FormControl>
                    <SelectContent>{accounts.map(acc => <SelectItem key={acc.ID} value={acc.ID.toString()}>{acc.Name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
            )}

            {transactionType !== 'transfer' && (
              <FormField control={form.control} name="sub_category_id" render={({ field }) => (
                <FormItem><FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger></FormControl>
                    <SelectContent>
  {categories.filter(cat => cat.Type === transactionType).map(cat => (
    cat.SubCategories && cat.SubCategories.map(sub => 
      <SelectItem key={sub.ID} value={sub.ID.toString()}>
        {cat.Name} / {sub.Name}
      </SelectItem>
    )

  ))}
</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
            )}

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Catatan</FormLabel><FormControl><Input placeholder="Catatan singkat (opsional)" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" className="w-full">Simpan Transaksi</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}