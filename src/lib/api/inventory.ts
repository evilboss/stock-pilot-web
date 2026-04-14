import apiClient from './axios';

export const inventoryApi = {
  getAll: async (params?: { page?: number; limit?: number; warehouseId?: string; productId?: string }) => {
    const res = await apiClient.get('/inventory', { params });
    return res.data;
  },
  getSummary: async () => {
    const res = await apiClient.get('/inventory/summary');
    return res.data;
  },
  adjust: async (data: { productId: string; warehouseId: string; quantity: number; notes?: string }) => {
    const res = await apiClient.post('/inventory/adjust', data);
    return res.data;
  },
};
