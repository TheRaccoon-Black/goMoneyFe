'use client';

// Definisikan tipe data untuk transaksi, termasuk relasi yang di-preload dari backend
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

export default function TransactionRow({ tx }: { tx: Transaction }) {
  // Format tanggal agar lebih mudah dibaca
  const formattedDate = new Date(tx.TransactionDate).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Format angka menjadi mata uang
  const formattedAmount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(tx.Amount);

  // Tentukan warna berdasarkan tipe transaksi
  const amountColor = tx.Type === 'income' ? 'text-green-600' : tx.Type === 'transfer' ? 'text-purple-600' : 'text-red-600';
  const sign = tx.Type === 'income' ? '+' : '-';

  const getCategoryText = () => {
    if (tx.Type === 'transfer') {
      return 'Transfer Antar Akun';
    }
    if (tx.SubCategory) {
      return `${tx.SubCategory.Category.Name} / ${tx.SubCategory.Name}`;
    }
    return 'Tanpa Kategori';
  }

  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex-1">
        <p className="font-semibold text-gray-800">{tx.Notes || getCategoryText()}</p>
        <p className="text-sm text-gray-500">{getCategoryText()}</p>
      </div>
      <div className="flex-1 text-center">
        <p className="text-sm text-gray-600">{tx.Account.Name}</p>
        <p className="text-xs text-gray-400">{formattedDate}</p>
      </div>
      <div className="flex-1 text-right">
        <p className={`font-bold ${amountColor}`}>{tx.Type === 'transfer' ? '' : sign} {formattedAmount}</p>
      </div>
    </div>
  );
}