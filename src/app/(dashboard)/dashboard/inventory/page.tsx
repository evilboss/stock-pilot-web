'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import { inventoryApi } from '@/lib/api/inventory';
import { productsApi } from '@/lib/api/products';
import { warehousesApi } from '@/lib/api/warehouses';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const schema = z.object({
  productId: z.string().min(1, 'Product is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  quantity: z.coerce.number().int('Must be a whole number'),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page],
    queryFn: () => inventoryApi.getAll({ page, limit: 10 }),
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
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      toast.success('Inventory adjusted!');
      setIsModalOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (_: any, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{row.product?.name}</p>
          <p className="text-xs text-gray-500">SKU: {row.product?.sku}</p>
        </div>
      ),
    },
    {
      key: 'warehouse',
      header: 'Warehouse',
      render: (_: any, row: any) => row.warehouse?.name,
    },
    {
      key: 'category',
      header: 'Category',
      render: (_: any, row: any) => row.product?.category?.name || '-',
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (_: any, row: any) => {
        const min = row.product?.minStockLevel ?? 0;
        const qty = row.quantity;
        return (
          <span className={qty === 0 ? 'badge-red' : qty <= min ? 'badge-yellow' : 'badge-green'}>
            {qty} {row.product?.unit}
          </span>
        );
      },
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (_: any, row: any) => formatDate(row.updatedAt),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Track stock levels across warehouses</p>
        </div>
        <button
          onClick={() => {
            reset();
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Adjust Stock
        </button>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          emptyMessage="No inventory items found"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Adjust Inventory"
      >
        <form onSubmit={handleSubmit((d) => adjustMutation.mutate(d))} className="space-y-4">
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
            <label className="form-label">
              Quantity (positive = add, negative = remove) *
            </label>
            <input
              type="number"
              {...register('quantity')}
              className="form-input"
              placeholder="e.g. 50 or -10"
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea {...register('notes')} className="form-input" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={adjustMutation.isPending} className="btn-primary flex-1">
              {adjustMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                reset();
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
