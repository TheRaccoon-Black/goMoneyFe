'use client';

import { MoreHorizontal, Trash2, Pencil, ArrowDownRight, ArrowUpRight, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Transaction {
  ID: number;
  Notes?: string;
  Amount: number;
  Type: 'income' | 'expense' | 'transfer';
  TransactionDate: string;
  Account: {
    ID: number;
    Name: string;
  };
  SubCategory?: {
    ID?: number;
    Name: string;
    Category: {
      Name: string;
    };
  };
}

interface TransactionRowProps {
  tx: Transaction;
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
}

export default function TransactionRow({ tx, onDelete, onEdit }: TransactionRowProps) {
  const formattedDate = new Date(tx.TransactionDate).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short',
  });
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(tx.Amount);

  const isIncome = tx.Type === 'income';
  const isTransfer = tx.Type === 'transfer';

  const config = {
    income: {
      icon: ArrowUpRight,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    expense: {
      icon: ArrowDownRight,
      bg: 'bg-red-50',
      text: 'text-red-500',
    },
    transfer: {
      icon: ArrowRightLeft,
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
  }[tx.Type];

  const Icon = config.icon;
  const title = tx.Notes || (isTransfer ? 'Transfer' : tx.SubCategory?.Name || 'Transaction');
  const subtitle = tx.SubCategory
    ? `${tx.SubCategory.Category.Name} · ${tx.Account.Name}`
    : tx.Account.Name;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors group">
      <div className={`${config.bg} p-2.5 rounded-xl shrink-0`}>
        <Icon className={`h-4 w-4 ${config.text}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${config.text}`}>
          {sign} {formattedAmount}
        </p>
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="sr-only">Open menu</span>
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
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
