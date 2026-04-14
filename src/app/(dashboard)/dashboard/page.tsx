'use client';
import { useQuery } from '@tanstack/react-query';
import { Package, Warehouse, AlertTriangle, DollarSign } from 'lucide-react';
import StatCard from '@/components/ui/stat-card';
import { inventoryApi } from '@/lib/api/inventory';
import { transactionsApi } from '@/lib/api/transactions';
import { productsApi } from '@/lib/api/products';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const transactionTypeColors: Record<string, string> = {
  STOCK_IN: 'badge-green',
  STOCK_OUT: 'badge-red',
  ADJUSTMENT: 'badge-yellow',
  TRANSFER: 'badge-blue',
  RETURN: 'badge-blue',
};

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: inventoryApi.getSummary,
  });
  const { data: transactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: () => transactionsApi.getAll({ limit: 5 }),
  });
  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: productsApi.getLowStock,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back! Here&apos;s your inventory overview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={summary?.totalProducts ?? 0}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Warehouses"
          value={summary?.totalWarehouses ?? 0}
          icon={Warehouse}
          color="green"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(summary?.totalInventoryValue ?? 0)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Low Stock Items"
          value={summary?.lowStockCount ?? 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {!transactions?.data?.length ? (
            <p className="text-gray-500 text-sm">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.data.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.product?.name}</p>
                    <p className="text-xs text-gray-500">
                      {t.warehouse?.name} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={transactionTypeColors[t.type] || 'badge-blue'}>
                      {t.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{t.quantity} units</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Low Stock Alerts
          </h2>
          {!lowStock?.length ? (
            <p className="text-gray-500 text-sm">No low stock items. Great job!</p>
          ) : (
            <div className="space-y-3">
              {lowStock.slice(0, 5).map((p: any) => {
                const totalQty =
                  p.inventoryItems?.reduce(
                    (sum: number, item: any) => sum + item.quantity,
                    0,
                  ) ?? 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">
                        SKU: {p.sku} · Min: {p.minStockLevel}
                      </p>
                    </div>
                    <span className={totalQty === 0 ? 'badge-red' : 'badge-yellow'}>
                      {totalQty} in stock
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
