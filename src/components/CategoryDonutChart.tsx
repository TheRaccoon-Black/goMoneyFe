'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Transaction {
  Amount: number;
  Type: string;
  SubCategory?: {
    Category: {
      Name: string;
    };
  };
}

interface CategoryChartProps {
  transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF42A1'];

export default function CategoryDonutChart({ transactions }: CategoryChartProps) {
  // Proses data untuk chart
  const expenseData = transactions
    .filter(tx => tx.Type === 'expense' && tx.SubCategory)
    .reduce((acc, tx) => {
      const categoryName = tx.SubCategory!.Category.Name;
      const existing = acc.find(item => item.name === categoryName);
      if (existing) {
        existing.value += tx.Amount;
      } else {
        acc.push({ name: categoryName, value: tx.Amount });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  if (expenseData.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">Belum ada data pengeluaran bulan ini.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={expenseData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
          nameKey="name"
        >
          {expenseData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(value)
          }
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}