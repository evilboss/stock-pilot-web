import apiClient from './axios';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  costPrice: number;
  unit: string;
  minStockLevel: number;
  isActive: boolean;
  categoryId: string;
  supplierId?: string;
  category?: { id: string; name: string };
  supplier?: { id: string; name: string };
  inventoryItems?: Array<{ quantity: number; warehouse: { name: string } }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  price: number;
  costPrice: number;
  unit?: string;
  minStockLevel?: number;
  categoryId: string;
  supplierId?: string;
}

export const productsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get('/products', { params });
    return res.data;
  },
  getOne: async (id: string) => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },
  create: async (data: CreateProductData) => {
    const res = await apiClient.post('/products', data);
    return res.data;
  },
  update: async (id: string, data: Partial<CreateProductData>) => {
    const res = await apiClient.patch(`/products/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await apiClient.delete(`/products/${id}`);
    return res.data;
  },
  getLowStock: async () => {
    const res = await apiClient.get('/products/low-stock');
    return res.data;
  },
};
