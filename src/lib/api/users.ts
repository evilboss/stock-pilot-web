import apiClient from './axios';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roleId: string;
  role?: { id: string; name: string };
  createdAt: string;
}

export const usersApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/users', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await apiClient.post('/users', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await apiClient.patch(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data;
  },
};
