import apiClient from './axios';

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  description?: string;
  isActive: boolean;
  _count?: { inventoryItems: number };
  createdAt: string;
}

export const warehousesApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/warehouses', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/warehouses/${id}`);
    return res.data;
  },
  create: async (data: { name: string; location?: string; description?: string }) => {
    const res = await apiClient.post('/warehouses', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/warehouses/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/warehouses/${id}`);
    return res.data;
  },
};
