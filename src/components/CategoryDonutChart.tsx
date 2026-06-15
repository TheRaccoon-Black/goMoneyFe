'use client';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CategoryDonutChart({ transactions }: CategoryChartProps) {
  const expenseData = transactions
    .filter(tx => tx.Type === 'expense' && tx.SubCategory)
    .reduce((acc, tx) => {
      const categoryName = tx.SubCategory!.Category.Name;
      const existing = acc.find(item => item.name === categoryName);
      if (existing) {
        existing.value += tx.Amount;
      } else {
        acc.push({ name: categoryName, value: tx.Amount, color: '' });
      }
      return acc;
    }, [] as { name: string; value: number; color: string }[]);

  if (expenseData.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No spending data this month</p>
      </div>
    );
  }

  const total = expenseData.reduce((sum, item) => sum + item.value, 0);

  const sortedData = [...expenseData]
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }));

  return (
    <div className="space-y-6">
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
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
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {sortedData.map((item) => {
          const percentage = (item.value / total) * 100;
          const formattedValue = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(item.value);

          return (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-700 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-gray-500 text-xs">{percentage.toFixed(0)}%</span>
                <span className="font-medium text-gray-900 tabular-nums">{formattedValue}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
