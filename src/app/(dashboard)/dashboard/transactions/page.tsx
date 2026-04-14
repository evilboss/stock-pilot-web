'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import { transactionsApi, Transaction } from '@/lib/api/transactions';
import { productsApi } from '@/lib/api/products';
import { warehousesApi } from '@/lib/api/warehouses';
import { formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const schema = z.object({
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN']),
  quantity: z.coerce.number().int().min(1, 'Must be at least 1'),
  productId: z.string().min(1, 'Product required'),
  warehouseId: z.string().min(1, 'Warehouse required'),
  notes: z.string().optional(),
  reference: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const typeColors: Record<string, string> = {
  STOCK_IN: 'badge-green',
  STOCK_OUT: 'badge-red',
  ADJUSTMENT: 'badge-yellow',
  TRANSFER: 'badge-blue',
  RETURN: 'badge-blue',
};

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => transactionsApi.getAll({ page, limit: 10 }),
  });
  const { data: products } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => productsApi.getAll({ limit: 200 }),
  });
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-all'],
    queryFn: () => warehousesApi.getAll({ limit: 100 }),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { type: 'STOCK_IN' } });

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast.success('Transaction created!');
      setIsModalOpen(false);
      reset({ type: 'STOCK_IN' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (_: any, row: Transaction) => (
        <span className={typeColors[row.type] || 'badge-blue'}>
          {row.type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (_: any, row: Transaction) => (
        <div>
          <p className="font-medium">{row.product?.name}</p>
          <p className="text-xs text-gray-500">{row.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (_: any, row: Transaction) => row.warehouse?.name,
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (_: any, row: Transaction) => (
        <span className="font-semibold">{row.quantity}</span>
      ),
    },
    { key: 'notes', header: 'Notes', render: (_: any, row: Transaction) => row.notes || '-' },
    {
      key: 'reference',
      header: 'Ref',
      render: (_: any, row: Transaction) => row.reference || '-',
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (_: any, row: Transaction) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">Track all stock movements</p>
        </div>
        <button
          onClick={() => {
            reset({ type: 'STOCK_IN' });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Transaction
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          emptyMessage="No transactions yet"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset({ type: 'STOCK_IN' });
        }}
        title="New Stock Transaction"
      >
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="form-label">Transaction Type *</label>
            <select {...register('type')} className="form-input">
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="TRANSFER">Transfer</option>
              <option value="RETURN">Return</option>
            </select>
          </div>
          <div>
            <label className="form-label">Product *</label>
            <select {...register('productId')} className="form-input">
              <option value="">Select product</option>
              {products?.data?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-xs text-red-500">{errors.productId.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Warehouse *</label>
            <select {...register('warehouseId')} className="form-input">
              <option value="">Select warehouse</option>
              {warehouses?.data?.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {errors.warehouseId && (
              <p className="mt-1 text-xs text-red-500">{errors.warehouseId.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Quantity *</label>
            <input type="number" {...register('quantity')} className="form-input" min="1" />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Reference</label>
            <input {...register('reference')} className="form-input" placeholder="PO-001, INV-002..." />
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary flex-1"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Transaction'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                reset({ type: 'STOCK_IN' });
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
