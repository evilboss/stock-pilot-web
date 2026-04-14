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
import { usersApi, User } from '@/lib/api/users';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import apiClient from '@/lib/api/axios';

const createSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  roleId: z.string().min(1, 'Required'),
});
const updateSchema = createSchema.extend({ password: z.string().min(6).optional().or(z.literal('')) });
type FormData = z.infer<typeof createSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersApi.getAll({ page, limit: 10, search }),
  });
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data;
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(editing ? updateSchema : createSchema),
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    reset();
  };

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Updated!');
      closeModal();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });
  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted!');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  });

  const onSubmit = (data: FormData) => {
    const payload = editing && !data.password ? { ...data, password: undefined } : data;
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (_: any, row: User) => (
        <div>
          <p className="font-medium text-gray-900">
            {row.firstName} {row.lastName}
          </p>
          <p className="text-xs text-gray-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (_: any, row: User) => <span className="badge-blue">{row.role?.name || '-'}</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (_: any, row: User) => (
        <span className={row.isActive ? 'badge-green' : 'badge-red'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (_: any, row: User) => formatDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: any, row: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditing(row);
              reset({
                firstName: row.firstName,
                lastName: row.lastName,
                email: row.email,
                password: '',
                roleId: row.roleId,
              });
              setIsModalOpen(true);
            }}
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this user?')) deleteMutation.mutate(row.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system users</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            reset();
            setIsModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add User
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
          <p className="text-sm text-gray-500">{data?.meta?.total ?? 0} users</p>
        </div>
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={setPage}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name *</label>
              <input {...register('firstName')} className="form-input" />
              {errors.firstName && (
                <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input {...register('lastName')} className="form-input" />
              {errors.lastName && (
                <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className="form-label">Email *</label>
            <input type="email" {...register('email')} className="form-input" />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div>
            <label className="form-label">
              Password {editing ? '(leave blank to keep current)' : '*'}
            </label>
            <input type="password" {...register('password')} className="form-input" />
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="form-label">Role *</label>
            <select {...register('roleId')} className="form-input">
              <option value="">Select role</option>
              {Array.isArray(roles)
                ? roles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))
                : null}
            </select>
            {errors.roleId && <p className="mt-1 text-xs text-red-500">{errors.roleId.message}</p>}
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
