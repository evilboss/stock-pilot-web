import apiClient from './axios';

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  _count?: { products: number };
  createdAt: string;
}

export const suppliersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/suppliers', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/suppliers/${id}`);
    return res.data;
  },
  create: async (data: { name: string; email?: string; phone?: string; address?: string }) => {
    const res = await apiClient.post('/suppliers', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/suppliers/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/suppliers/${id}`);
    return res.data;
  },
};
