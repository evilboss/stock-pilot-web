'use client';
import { Printer, X } from 'lucide-react';
import { Sale } from '@/lib/api/sales';

interface Props {
  sale: Sale;
  onClose: () => void;
}

function formatCurrency(n: number | string) {
  return `₱${Number(n).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ThermalInvoice({ sale, onClose }: Props) {
  const handlePrint = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${sale.invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 4mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 15px; }
    .small { font-size: 10px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
    .item-name { flex: 1; }
    .item-qty { width: 28px; text-align: center; }
    .item-price { width: 60px; text-align: right; }
    .item-total { width: 64px; text-align: right; }
    .total-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .grand-total { font-size: 14px; font-weight: bold; }
    @media print {
      @page { margin: 0; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold large">STOCKPILOT</p>
    <p class="small">Inventory & POS System</p>
    <p class="small">${sale.warehouse.name}</p>
  </div>

  <div class="divider"></div>

  <p><span class="bold">Invoice#:</span> ${sale.invoiceNo}</p>
  <p><span class="bold">Date:</span> ${formatDate(sale.createdAt)}</p>
  ${sale.customerName ? `<p><span class="bold">Customer:</span> ${sale.customerName}</p>` : ''}
  ${sale.customerPhone ? `<p><span class="bold">Phone:</span> ${sale.customerPhone}</p>` : ''}
  <p><span class="bold">Payment:</span> ${sale.paymentMethod}</p>

  <div class="divider"></div>

  <div class="row bold small">
    <span class="item-name">ITEM</span>
    <span class="item-qty">QTY</span>
    <span class="item-price">PRICE</span>
    <span class="item-total">TOTAL</span>
  </div>
  <div class="divider"></div>

  ${sale.items.map((item) => `
    <div>
      <p class="item-name bold">${item.product.name}</p>
      <div class="row small">
        <span class="item-name">${item.product.sku}</span>
        <span class="item-qty">${item.quantity}</span>
        <span class="item-price">${formatCurrency(item.unitPrice)}</span>
        <span class="item-total">${formatCurrency(item.total)}</span>
      </div>
      ${Number(item.discount) > 0 ? `<p class="small" style="text-align:right">Disc: -${formatCurrency(item.discount)}</p>` : ''}
    </div>
  `).join('<div class="divider" style="border-style:dotted"></div>')}

  <div class="divider"></div>

  <div class="total-row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
  ${Number(sale.discountAmount) > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatCurrency(sale.discountAmount)}</span></div>` : ''}
  ${Number(sale.taxAmount) > 0 ? `<div class="total-row"><span>Tax</span><span>${formatCurrency(sale.taxAmount)}</span></div>` : ''}

  <div class="divider"></div>
  <div class="total-row grand-total"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>
  <div class="divider"></div>

  <div class="center" style="margin-top:8px">
    <p>Thank you for your purchase!</p>
    <p class="small" style="margin-top:4px">Powered by StockPilot</p>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=420,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-900">Invoice {sale.invoiceNo}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="font-mono text-xs bg-gray-50 border border-dashed border-gray-300 rounded p-4 space-y-1">
            <p className="text-center font-bold text-base">STOCKPILOT</p>
            <p className="text-center text-gray-500">Inventory &amp; POS System</p>
            <p className="text-center text-gray-500">{sale.warehouse.name}</p>
            <hr className="border-dashed border-gray-400 my-2" />
            <p><span className="font-bold">Invoice#:</span> {sale.invoiceNo}</p>
            <p><span className="font-bold">Date:</span> {formatDate(sale.createdAt)}</p>
            {sale.customerName && <p><span className="font-bold">Customer:</span> {sale.customerName}</p>}
            {sale.customerPhone && <p><span className="font-bold">Phone:</span> {sale.customerPhone}</p>}
            <p><span className="font-bold">Payment:</span> {sale.paymentMethod}</p>
            <hr className="border-dashed border-gray-400 my-2" />
            <div className="flex font-bold text-gray-600">
              <span className="flex-1">ITEM</span>
              <span className="w-7 text-center">QTY</span>
              <span className="w-16 text-right">PRICE</span>
              <span className="w-16 text-right">TOTAL</span>
            </div>
            <hr className="border-dashed border-gray-400 my-1" />
            {sale.items.map((item, i) => (
              <div key={i} className="mb-1">
                <p className="font-bold">{item.product.name}</p>
                <div className="flex text-gray-700">
                  <span className="flex-1 text-gray-400">{item.product.sku}</span>
                  <span className="w-7 text-center">{item.quantity}</span>
                  <span className="w-16 text-right">{formatCurrency(item.unitPrice)}</span>
                  <span className="w-16 text-right">{formatCurrency(item.total)}</span>
                </div>
                {Number(item.discount) > 0 && (
                  <p className="text-right text-gray-400">Disc: -{formatCurrency(item.discount)}</p>
                )}
              </div>
            ))}
            <hr className="border-dashed border-gray-400 my-2" />
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
            {Number(sale.discountAmount) > 0 && (
              <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(sale.discountAmount)}</span></div>
            )}
            {Number(sale.taxAmount) > 0 && (
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(sale.taxAmount)}</span></div>
            )}
            <hr className="border-dashed border-gray-400 my-1" />
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span><span>{formatCurrency(sale.total)}</span>
            </div>
            <hr className="border-dashed border-gray-400 my-2" />
            <p className="text-center">Thank you for your purchase!</p>
            <p className="text-center text-gray-400">Powered by StockPilot</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4 border-t">
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
          <button onClick={handlePrint} className="btn-primary flex-1 flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
