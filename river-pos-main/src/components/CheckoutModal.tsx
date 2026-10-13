import React, { useState } from 'react';
import { OrderItem, OrderType, PaymentMethod, Table } from '../types';
import { X, CreditCard, Banknote, CheckCircle, Printer } from 'lucide-react';

interface CheckoutModalProps {
  items: OrderItem[];
  orderType: OrderType;
  tableId?: string;
  tableName?: string;
  tables?: Table[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  shopName: string;
  taxRate: number;
  isMonochrome: boolean;
  onClose: () => void;
  onSelectTable?: (tableId: string) => void;
  onSubmitOrder: (details: {
    paymentMethod: PaymentMethod;
    paymentStatus: 'paid' | 'pending';
    tenderedCash?: number;
    changeDue?: number;
    customerName?: string;
    tableId?: string;
    tableName?: string;
  }) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  items,
  orderType,
  tableId,
  tableName,
  tables = [],
  subtotal,
  tax,
  total,
  currency,
  shopName,
  isMonochrome,
  onClose,
  onSelectTable,
  onSubmitOrder,
}) => {
  const [selectedTableIdState, setSelectedTableIdState] = useState<string>(tableId || '');
  const [tableError, setTableError] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tenderedCash, setTenderedCash] = useState<number>(total);
  const [customerName, setCustomerName] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<number>(101);

  const changeDue = Math.max(0, tenderedCash - total);

  const handleFastCash = (amount: number) => {
    setTenderedCash(amount);
  };

  const activeTableId = selectedTableIdState || tableId || '';
  const activeTable = tables.find((t) => t.id === activeTableId);
  const activeTableName = activeTable ? activeTable.name : tableName;

  const handleFinish = (isTab = false) => {
    if (orderType === 'dine_in' && !activeTableId) {
      setTableError(true);
      return;
    }
    const randomOrderNum = Math.floor(Math.random() * 800) + 105;
    setCompletedOrderNumber(randomOrderNum);
    setIsCompleted(true);
    onSubmitOrder({
      paymentMethod: isTab ? 'cash' : paymentMethod,
      paymentStatus: isTab ? 'pending' : 'paid',
      tenderedCash: !isTab && paymentMethod === 'cash' ? tenderedCash : undefined,
      changeDue: !isTab && paymentMethod === 'cash' ? changeDue : undefined,
      customerName: customerName.trim() || undefined,
      tableId: activeTableId || undefined,
      tableName: activeTableName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-md rounded-lg shadow-2xl overflow-hidden border ${
          isMonochrome
            ? 'bg-white border-neutral-900 text-neutral-900'
            : 'bg-[#fff8f5] border-[#4A2C1D] text-[#1f1b18]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight">
              {isCompleted ? 'Receipt / Order Confirmed' : 'Checkout & Settlement'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {!isCompleted ? (
          <div className="p-4 space-y-4">
            {/* Order Destination Strip */}
            <div className="p-3 bg-neutral-100 rounded text-xs font-medium space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold uppercase tracking-wider text-neutral-800">
                    {orderType === 'dine_in'
                      ? activeTableName
                        ? `Dine-In (${activeTableName})`
                        : 'Dine-In (Choose Table)'
                      : 'Takeaway'}
                  </span>
                  <span className="text-neutral-500 ml-2">· {items.length} items</span>
                </div>
                <div className="font-mono text-base font-bold tabular-nums">
                  {total.toFixed(2)} {currency}
                </div>
              </div>

              {orderType === 'dine_in' && (
                <div className="pt-2 border-t border-neutral-200 flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-neutral-700 whitespace-nowrap">
                    Destination Table:
                  </span>
                  {tables.length > 0 ? (
                    <select
                      value={activeTableId}
                      onChange={(e) => {
                        setSelectedTableIdState(e.target.value);
                        setTableError(false);
                        onSelectTable?.(e.target.value);
                      }}
                      className={`text-xs py-1.5 px-2.5 rounded font-bold border-2 transition-all ${
                        activeTableId
                          ? 'border-neutral-900 bg-white text-neutral-900'
                          : 'border-red-500 bg-red-50 text-red-700'
                      }`}
                    >
                      <option value="">⚠️ Select Table (Required)</option>
                      <optgroup label="Indoor Lounge">
                        {tables
                          .filter((t) => t.area === 'indoor')
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.seats} seats) {t.status === 'occupied' ? '• Occupied' : ''}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Sunny Patio">
                        {tables
                          .filter((t) => t.area === 'patio')
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.seats} seats) {t.status === 'occupied' ? '• Occupied' : ''}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Bar Counter">
                        {tables
                          .filter((t) => t.area === 'bar')
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.status === 'occupied' ? '• Occupied' : ''}
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  ) : (
                    <span className="font-bold text-xs">{activeTableName || 'Table'}</span>
                  )}
                </div>
              )}
              {tableError && !activeTableId && (
                <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs font-bold">
                  ⚠️ Please pick a table above so this order is routed to the floor!
                </div>
              )}
            </div>

            {/* Customer Name or Buzzer */}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 mb-1">
                Customer Name / Buzzer # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Nick / Buzzer #4"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded bg-white focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 mb-2">
                Tender Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cash');
                    setTenderedCash(total);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 border rounded text-xs font-bold transition-all ${
                    paymentMethod === 'cash'
                      ? isMonochrome
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                      : 'bg-white border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <Banknote size={16} />
                  <span>Cash / Μετρητά</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center justify-center gap-2 py-3 border rounded text-xs font-bold transition-all ${
                    paymentMethod === 'card'
                      ? isMonochrome
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                      : 'bg-white border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <CreditCard size={16} />
                  <span>Card / POS Tap</span>
                </button>
              </div>
            </div>

            {/* Cash Tender & Fast Cash Buttons */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 pt-1 border-t border-neutral-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-600">Fast Tender Options:</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Exact', val: total },
                    { label: '5 €', val: 5 },
                    { label: '10 €', val: 10 },
                    { label: '20 €', val: 20 },
                  ]
                    .filter((btn) => btn.val >= total || btn.label === 'Exact')
                    .map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => handleFastCash(btn.val)}
                        className={`py-2 px-1 text-xs font-bold border rounded transition-all ${
                          tenderedCash === btn.val
                            ? 'bg-neutral-800 text-white border-neutral-800'
                            : 'bg-white border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={() => handleFastCash(50)}
                    className={`py-2 px-1 text-xs font-bold border rounded transition-all ${
                      tenderedCash === 50
                        ? 'bg-neutral-800 text-white border-neutral-800'
                        : 'bg-white border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    50 €
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-neutral-50 border border-neutral-200 rounded">
                  <span className="text-xs font-semibold text-neutral-600">Tendered:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.50"
                      value={tenderedCash}
                      onChange={(e) => setTenderedCash(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right font-mono text-sm font-bold bg-white border border-neutral-300 rounded p-1"
                    />
                    <span className="text-xs font-mono">{currency}</span>
                  </div>
                </div>

                {/* Change Due Display */}
                <div className="flex items-center justify-between p-3 bg-neutral-900 text-white rounded">
                  <span className="text-xs font-bold uppercase tracking-wider">Change Due:</span>
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {changeDue.toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            )}

            {/* Total breakdown */}
            <div className="pt-2 border-t border-neutral-200 space-y-1 text-xs text-neutral-600">
              <div className="flex justify-between">
                <span>Net Subtotal:</span>
                <span className="font-mono tabular-nums">{subtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Greek VAT (13%):</span>
                <span className="font-mono tabular-nums">{tax.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-neutral-900 pt-1 border-t border-neutral-200">
                <span>Total Amount:</span>
                <span className="font-mono tabular-nums">{total.toFixed(2)} {currency}</span>
              </div>
            </div>

            {/* Submit & Dispatch to Server */}
            {orderType === 'dine_in' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleFinish(true)}
                  disabled={!activeTableId}
                  className={`w-full h-11 rounded font-bold text-xs text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                    isMonochrome
                      ? 'bg-neutral-900 hover:bg-neutral-800'
                      : 'bg-[#4A2C1D] hover:bg-[#382014]'
                  }`}
                >
                  <CheckCircle size={16} />
                  <span>
                    {!activeTableId
                      ? '⚠️ Choose Table to Send Order'
                      : `⚡ Put on ${activeTableName || 'Table'} Tab & Send to Bar`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish(false)}
                  disabled={!activeTableId}
                  className="w-full h-9 rounded font-semibold text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Pay Now ({paymentMethod.toUpperCase()}) & Send</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleFinish(false)}
                className={`w-full h-12 rounded font-bold text-sm text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98] ${
                  isMonochrome
                    ? 'bg-neutral-900 hover:bg-neutral-800'
                    : 'bg-[#4A2C1D] hover:bg-[#382014]'
                }`}
              >
                <CheckCircle size={18} />
                <span>Complete Payment & Send to Bar</span>
              </button>
            )}
          </div>
        ) : (
          /* Thermal Receipt View */
          <div className="p-4 space-y-4">
            <div className="p-4 bg-white border border-dashed border-neutral-300 rounded text-center text-xs space-y-2 font-mono">
              <div className="font-bold text-sm tracking-tight">{shopName.toUpperCase()}</div>
              <div className="text-[10px] text-neutral-500">River Coffee & Terminal</div>
              <div className="border-b border-dashed border-neutral-300 py-1 text-[11px]">
                Order #{completedOrderNumber} · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-left space-y-1 py-1">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between text-[11px]">
                    <span className="truncate pr-2">
                      {it.quantity}x {it.name}
                      {it.modifiers.sugar && ` (${it.modifiers.sugar})`}
                    </span>
                    <span className="tabular-nums font-bold">
                      {it.totalPrice.toFixed(2)} {currency}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-neutral-300 pt-2 flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span className="tabular-nums">{total.toFixed(2)} {currency}</span>
              </div>
              <div className="text-[10px] text-neutral-500 pt-1">
                Paid via {paymentMethod.toUpperCase()} · Sent to Kitchen Barista
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 border border-neutral-300 rounded font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-50"
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-2.5 rounded font-bold text-xs text-white ${
                  isMonochrome ? 'bg-neutral-900' : 'bg-[#4A2C1D]'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
