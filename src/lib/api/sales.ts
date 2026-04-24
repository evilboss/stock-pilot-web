import apiClient from './axios';

export interface SaleItem {
  id: string;
  productId: string;
  product: { name: string; sku: string; unit: string };
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  invoiceNo: string;
  customerName?: string;
  customerPhone?: string;
  warehouseId: string;
  warehouse: { name: string };
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface CreateSalePayload {
  warehouseId: string;
  customerName?: string;
  customerPhone?: string;
  items: { productId: string; quantity: number; unitPrice: number; discount?: number }[];
  paymentMethod?: string;
  discountAmount?: number;
  taxRate?: number;
  notes?: string;
}

export const salesApi = {
  create: (data: CreateSalePayload) => apiClient.post<Sale>('/sales', data).then((r) => r.data),
  getAll: (params?: Record<string, any>) =>
    apiClient.get<{ data: Sale[]; meta: any }>('/sales', { params }).then((r) => r.data),
  getOne: (id: string) => apiClient.get<Sale>(`/sales/${id}`).then((r) => r.data),
  voidSale: (id: string) => apiClient.patch<Sale>(`/sales/${id}/void`).then((r) => r.data),
};
