'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus, Trash2, Search, Receipt } from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { warehousesApi } from '@/lib/api/warehouses';
import { salesApi, Sale, CreateSalePayload } from '@/lib/api/sales';
import ThermalInvoice from '@/components/pos/thermal-invoice';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'GCASH', 'TRANSFER'];

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const { data: productsData } = useQuery({
    queryKey: ['products-pos', search],
    queryFn: () => productsApi.getAll({ limit: 50, search }),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.getAll(),
  });

  const products = (productsData?.data ?? []).filter((p: any) => p.isActive);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : (warehousesData?.data ?? []);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          unitPrice: Number(product.price),
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, discount: Math.max(0, discount) } : i)),
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.quantity * i.unitPrice - i.discount, 0),
    [cart],
  );
  const taxAmount = (subtotal - overallDiscount) * (taxRate / 100);
  const total = subtotal - overallDiscount + taxAmount;

  const { mutate: createSale, isPending } = useMutation({
    mutationFn: (payload: CreateSalePayload) => salesApi.create(payload),
    onSuccess: (sale) => {
      setCompletedSale(sale);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setOverallDiscount(0);
      setNotes('');
      toast.success(`Sale ${sale.invoiceNo} completed!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to complete sale');
    },
  });

  const handleCheckout = () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (!warehouseId) return toast.error('Please select a warehouse');
    createSale({
      warehouseId,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      paymentMethod,
      discountAmount: overallDiscount,
      taxRate,
      notes: notes || undefined,
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left — Product Browser */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> POS Terminal
          </h1>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="form-input pl-9"
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 content-start">
          {products.map((p: any) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              className="bg-white border border-gray-200 rounded-xl p-3 text-left hover:border-primary hover:shadow-md transition-all group"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <ShoppingCart className="w-4 h-4 text-primary" />
              </div>
              <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>
              <p className="text-sm font-bold text-primary mt-1">₱{Number(p.price).toFixed(2)}</p>
              <p className="text-xs text-gray-400">per {p.unit}</p>
            </button>
          ))}
          {!products.length && (
            <p className="col-span-full text-center text-gray-400 py-12">No products found</p>
          )}
        </div>
      </div>

      {/* Right — Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-gray-900">Cart</h2>
          {cart.length > 0 && (
            <span className="ml-auto text-xs bg-primary text-white rounded-full px-2 py-0.5">{cart.length}</span>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {cart.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">Add products to start a sale</p>
          )}
          {cart.map((item) => (
            <div key={item.productId} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">₱{item.unitPrice.toFixed(2)} / {item.unit}</p>
                </div>
                <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {/* Qty */}
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                  <button onClick={() => updateQty(item.productId, -1)} className="px-2 py-1 text-gray-500 hover:text-gray-800">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateQty(item.productId, 1)} className="px-2 py-1 text-gray-500 hover:text-gray-800">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {/* Item discount */}
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-gray-400">Disc</span>
                  <input
                    type="number"
                    min={0}
                    value={item.discount}
                    onChange={(e) => updateDiscount(item.productId, Number(e.target.value))}
                    className="w-20 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-primary"
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-auto">
                  ₱{(item.quantity * item.unitPrice - item.discount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Details */}
        <div className="border-t px-4 py-3 space-y-2">
          {/* Warehouse */}
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="form-input text-sm"
          >
            <option value="">Select warehouse *</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {/* Customer */}
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional)"
            className="form-input text-sm"
          />
          <input
            type="text"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Customer phone (optional)"
            className="form-input text-sm"
          />

          {/* Payment method */}
          <div className="grid grid-cols-4 gap-1">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={cn(
                  'text-xs py-1.5 rounded-lg border font-medium transition-colors',
                  paymentMethod === m
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Discount & Tax */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Overall Discount (₱)</label>
              <input
                type="number"
                min={0}
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(Number(e.target.value))}
                className="form-input text-sm mt-0.5"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">Tax Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="form-input text-sm mt-0.5"
              />
            </div>
          </div>

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="form-input text-sm"
          />
        </div>

        {/* Totals & Checkout */}
        <div className="border-t px-4 py-3">
          <div className="space-y-1 text-sm mb-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>₱{subtotal.toFixed(2)}</span>
            </div>
            {overallDiscount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span><span>-₱{overallDiscount.toFixed(2)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({taxRate}%)</span><span>₱{taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-1 border-t">
              <span>Total</span><span>₱{total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isPending || !cart.length}
            className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50"
          >
            {isPending ? 'Processing…' : `Complete Sale · ₱${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Invoice Modal */}
      {completedSale && (
        <ThermalInvoice sale={completedSale} onClose={() => setCompletedSale(null)} />
      )}
    </div>
  );
}
