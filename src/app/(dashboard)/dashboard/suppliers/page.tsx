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
import { suppliersApi, Supplier } from '@/lib/api/suppliers';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => suppliersApi.getAll({ page, limit: 10, search }),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    reset();
  };

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Updated!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });
  const deleteMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Deactivated!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const onSubmit = (data: FormData) => {
    const clean = { ...data, email: data.email || undefined };
    if (editing) updateMutation.mutate({ id: editing.id, data: clean });
    else createMutation.mutate(clean);
  };

  const columns = [
    {
      key: 'name',
      header: 'Supplier',
      render: (_: any, row: Supplier) => (
        <span className="font-medium text-gray-900">{row.name}</span>
      ),
    },
    { key: 'email', header: 'Email', render: (_: any, row: Supplier) => row.email || '-' },
    { key: 'phone', header: 'Phone', render: (_: any, row: Supplier) => row.phone || '-' },
    {
      key: '_count',
      header: 'Products',
      render: (_: any, row: Supplier) => (
        <span className="badge-blue">{row._count?.products ?? 0}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_: any, row: Supplier) => (
        <span className={row.isActive ? 'badge-green' : 'badge-red'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (_: any, row: Supplier) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: Supplier) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(row);
              reset({
                name: row.name,
                email: row.email || '',
                phone: row.phone || '',
                address: row.address || '',
              });
              setIsModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Deactivate?')) deleteMutation.mutate(row.id);
            }}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg"
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
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your suppliers</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            reset();
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Supplier
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
          />
          <p className="text-sm text-gray-500">{data?.meta?.total ?? 0} suppliers</p>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Name *</label>
            <input {...register('name')} className="form-input" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" {...register('email')} className="form-input" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input {...register('phone')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Address</label>
            <textarea {...register('address')} className="form-input" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editing ? 'Update' : 'Create'}
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
