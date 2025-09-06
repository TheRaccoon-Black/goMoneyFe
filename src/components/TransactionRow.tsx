// file: src/components/TransactionRow.tsx
'use client';

import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Definisikan tipe data untuk transaksi
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

// Komponen sekarang menerima props baru: onDelete dan onEdit
interface TransactionRowProps {
  tx: Transaction;
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void; // Akan kita gunakan nanti
}

export default function TransactionRow({ tx, onDelete, onEdit }: TransactionRowProps) {
  const formattedDate = new Date(tx.TransactionDate).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(tx.Amount);
  const amountColor = tx.Type === 'income' ? 'text-green-600' : tx.Type === 'expense' ? 'text-red-600' : 'text-gray-700';
  const sign = tx.Type === 'income' ? '+' : '-';

  const getCategoryText = () => { /* ... (fungsi ini tetap sama) ... */ };

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 hover:bg-gray-50 group">
      <div className="flex-1">
        <p className="font-semibold text-gray-800">{tx.Notes || getCategoryText()}</p>
        <p className="text-sm text-gray-500">{getCategoryText()}</p>
      </div>
      <div className="flex-1 text-center">
        <p className="text-sm text-gray-600">{tx.Account.Name}</p>
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>
      <div className="flex items-center justify-end flex-1">
        <p className={`font-bold mr-4 ${amountColor}`}>
          {tx.Type === 'transfer' ? '' : sign} {formattedAmount}
        </p>
        {/* --- Tombol Aksi Baru --- */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
              <span className="sr-only">Buka menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(tx)}>
              <Pencil className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(tx)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Hapus</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}