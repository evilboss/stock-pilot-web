import apiClient from './axios';

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: { products: number };
  createdAt: string;
}

export const categoriesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/categories', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/categories/${id}`);
    return res.data;
  },
  create: async (data: { name: string; description?: string }) => {
    const res = await apiClient.post('/categories', data);
    return res.data;
  },
  update: async (id: string, data: { name?: string; description?: string; isActive?: boolean }) => {
    const res = await apiClient.patch(`/categories/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/categories/${id}`);
    return res.data;
  },
};
