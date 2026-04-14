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
import { warehousesApi, Warehouse } from '@/lib/api/warehouses';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().optional(),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['warehouses', page, search],
    queryFn: () => warehousesApi.getAll({ page, limit: 10, search }),
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
    mutationFn: warehousesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => warehousesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Updated!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });
  const deleteMutation = useMutation({
    mutationFn: warehousesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Deactivated!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const columns = [
    {
      key: 'name',
      header: 'Warehouse',
      render: (_: any, row: Warehouse) => (
        <span className="font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (_: any, row: Warehouse) => row.location || '-',
    },
    {
      key: 'description',
      header: 'Description',
      render: (_: any, row: Warehouse) => row.description || '-',
    },
    {
      key: '_count',
      header: 'Items',
      render: (_: any, row: Warehouse) => (
        <span className="badge-blue">{row._count?.inventoryItems ?? 0} items</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_: any, row: Warehouse) => (
        <span className={row.isActive ? 'badge-green' : 'badge-red'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: Warehouse) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(row);
              reset({
                name: row.name,
                location: row.location || '',
                description: row.description || '',
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
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-500 text-sm mt-1">Manage storage locations</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            reset();
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Warehouse
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
          <p className="text-sm text-gray-500">{data?.meta?.total ?? 0} warehouses</p>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? 'Edit Warehouse' : 'Add Warehouse'}>
        <form
          onSubmit={handleSubmit((d) =>
            editing
              ? updateMutation.mutate({ id: editing.id, data: d })
              : createMutation.mutate(d),
          )}
          className="space-y-4"
        >
          <div>
            <label className="form-label">Name *</label>
            <input {...register('name')} className="form-input" />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
          </div>
          <div>
            <label className="form-label">Location</label>
            <input {...register('location')} className="form-input" />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="form-input" rows={2} />
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
