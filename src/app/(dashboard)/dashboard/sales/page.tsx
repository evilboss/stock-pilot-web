'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Eye, Ban } from 'lucide-react';
import { salesApi, Sale } from '@/lib/api/sales';
import ThermalInvoice from '@/components/pos/thermal-invoice';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

function formatCurrency(n: number | string) {
  return `₱${Number(n).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const statusClass: Record<string, string> = {
  COMPLETED: 'badge-green',
  VOID: 'badge-red',
  REFUNDED: 'badge-yellow',
};

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page],
    queryFn: () => salesApi.getAll({ page, limit: 15 }),
  });

  const { mutate: voidSale } = useMutation({
    mutationFn: (id: string) => salesApi.voidSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Sale voided and inventory restored');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to void sale'),
  });

  const sales: Sale[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <p className="text-gray-500 text-sm mt-1">All completed POS transactions</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Warehouse</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading…</td></tr>
              )}
              {!isLoading && !sales.length && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No sales yet. Go to POS to make a sale.</td></tr>
              )}
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">{sale.invoiceNo}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(sale.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{sale.customerName ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{sale.warehouse?.name}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="badge-blue">{sale.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(sale.total)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(statusClass[sale.status] ?? 'badge-blue')}>{sale.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setViewSale(sale)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded"
                        title="View / Print"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewSale(sale)}
                        className="p-1.5 text-gray-400 hover:text-primary rounded"
                        title="Print receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {sale.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            if (confirm(`Void sale ${sale.invoiceNo}? This will restore inventory.`)) {
                              voidSale(sale.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                          title="Void sale"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {meta.total} sales · page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary text-sm py-1 px-3 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {viewSale && <ThermalInvoice sale={viewSale} onClose={() => setViewSale(null)} />}
    </div>
  );
}
