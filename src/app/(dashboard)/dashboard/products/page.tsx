'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DataTable from '@/components/ui/data-table';
import Modal from '@/components/ui/modal';
import SearchInput from '@/components/ui/search-input';
import { productsApi, Product } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import { suppliersApi } from '@/lib/api/suppliers';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  costPrice: z.coerce.number().min(0, 'Cost price must be positive'),
  unit: z.string().optional(),
  minStockLevel: z.coerce.number().min(0).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  supplierId: z.string().optional(),
});
type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => productsApi.getAll({ page, limit: 10, search }),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoriesApi.getAll({ limit: 100 }),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-all'],
    queryFn: () => suppliersApi.getAll({ limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    reset();
  };

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create product'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProductForm> }) =>
      productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update product'),
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deactivated!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: Number(product.price),
      costPrice: Number(product.costPrice),
      unit: product.unit,
      minStockLevel: product.minStockLevel,
      categoryId: product.categoryId,
      supplierId: product.supplierId || undefined,
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ProductForm) => {
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data });
    else createMutation.mutate(data);
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (_: any, row: Product) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">SKU: {row.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (_: any, row: Product) => row.category?.name || '-',
    },
    {
      key: 'price',
      header: 'Price',
      render: (_: any, row: Product) => formatCurrency(Number(row.price)),
    },
    {
      key: 'costPrice',
      header: 'Cost',
      render: (_: any, row: Product) => formatCurrency(Number(row.costPrice)),
    },
    { key: 'unit', header: 'Unit' },
    {
      key: 'isActive',
      header: 'Status',
      render: (_: any, row: Product) => (
        <span className={row.isActive ? 'badge-green' : 'badge-red'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: Product) => (
        <div className="flex gap-2">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Deactivate this product?')) deleteMutation.mutate(row.id);
            }}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your product catalog</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            reset({ unit: 'pcs', minStockLevel: 0 });
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search products..."
          />
          <p className="text-sm text-gray-500">{data?.meta?.total ?? 0} products</p>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
          emptyMessage="No products found"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name *</label>
              <input {...register('name')} className="form-input" placeholder="Product name" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="form-label">SKU *</label>
              <input {...register('sku')} className="form-input" placeholder="PROD-001" />
              {errors.sku && <p className="mt-1 text-xs text-red-500">{errors.sku.message}</p>}
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="form-input" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Selling Price *</label>
              <input
                type="number"
                step="0.01"
                {...register('price')}
                className="form-input"
                placeholder="0.00"
              />
              {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>}
            </div>
            <div>
              <label className="form-label">Cost Price *</label>
              <input
                type="number"
                step="0.01"
                {...register('costPrice')}
                className="form-input"
                placeholder="0.00"
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-red-500">{errors.costPrice.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Unit</label>
              <input {...register('unit')} className="form-input" placeholder="pcs" />
            </div>
            <div>
              <label className="form-label">Min Stock Level</label>
              <input type="number" {...register('minStockLevel')} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Category *</label>
              <select {...register('categoryId')} className="form-input">
                <option value="">Select category</option>
                {categories?.data?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>
              )}
            </div>
            <div>
              <label className="form-label">Supplier</label>
              <select {...register('supplierId')} className="form-input">
                <option value="">No supplier</option>
                {suppliers?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn-primary flex-1"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingProduct
                  ? 'Update Product'
                  : 'Create Product'}
            </button>
            <button type="button" onClick={closeModal} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
