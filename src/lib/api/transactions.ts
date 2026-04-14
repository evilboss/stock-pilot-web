import apiClient from './axios';

export interface Transaction {
  id: string;
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'TRANSFER' | 'RETURN';
  quantity: number;
  notes?: string;
  reference?: string;
  productId: string;
  warehouseId: string;
  product?: { name: string; sku: string };
  warehouse?: { name: string };
  createdAt: string;
}

export const transactionsApi = {
  getAll: async (params?: { page?: number; limit?: number; productId?: string; warehouseId?: string; type?: string }) => {
    const res = await apiClient.get('/transactions', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/transactions/${id}`);
    return res.data;
  },
  create: async (data: { type: string; quantity: number; notes?: string; reference?: string; productId: string; warehouseId: string }) => {
    const res = await apiClient.post('/transactions', data);
    return res.data;
  },
};
