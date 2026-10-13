import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { Search, Printer, Calendar, TrendingUp, ShoppingBag, Clock } from 'lucide-react';

interface OrderHistoryScreenProps {
  orders: Order[];
  currency: string;
  isMonochrome: boolean;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  orders,
  currency,
  isMonochrome,
  onUpdateOrderStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = selectedStatus === 'all' || o.status === selectedStatus;
    const matchesSearch =
      searchQuery === '' ||
      o.orderNumber.toString().includes(searchQuery) ||
      (o.tableName && o.tableName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalRevenue = orders.reduce((acc, o) => acc + (o.paymentStatus === 'paid' ? o.total : 0), 0);
  const totalCompleted = orders.filter((o) => o.status === 'delivered').length;
  const totalActive = orders.filter((o) => o.status === 'incoming' || o.status === 'brewing' || o.status === 'ready').length;
  const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100">
      {/* Top Analytics Banner */}
      <div className="p-4 bg-white border-b border-neutral-200">
        <h1 className="text-base font-bold tracking-tight text-neutral-900 mb-3">
          ORDER LOG & SHIFT ANALYTICS
        </h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <TrendingUp size={13} />
              <span>Shift Sales</span>
            </div>
            <div className="font-mono text-xl font-black tabular-nums text-neutral-900 mt-1">
              {totalRevenue.toFixed(2)} {currency}
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <ShoppingBag size={13} />
              <span>Total Orders</span>
            </div>
            <div className="font-mono text-xl font-black tabular-nums text-neutral-900 mt-1">
              {orders.length}
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Clock size={13} />
              <span>Active in Queue</span>
            </div>
            <div className="font-mono text-xl font-black tabular-nums text-neutral-900 mt-1">
              {totalActive}
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Calendar size={13} />
              <span>Avg Ticket Size</span>
            </div>
            <div className="font-mono text-xl font-black tabular-nums text-neutral-900 mt-1">
              {avgTicket.toFixed(2)} {currency}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="p-4 bg-white border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {/* Status buttons */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded border border-neutral-200">
            {[
              { key: 'all', label: 'All' },
              { key: 'incoming', label: 'Incoming' },
              { key: 'brewing', label: 'Brewing' },
              { key: 'ready', label: 'Ready' },
              { key: 'delivered', label: 'Completed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedStatus(key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  selectedStatus === key
                    ? 'bg-white shadow-xs text-neutral-900'
                    : 'text-neutral-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search order #, table, drink..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded w-56 bg-neutral-50 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded border border-neutral-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Order #</th>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Type / Table</th>
                  <th className="py-2.5 px-4">Items Summary</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-neutral-400">
                      No orders found matching filter criteria
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-neutral-900">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-neutral-500 font-mono tabular-nums">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900">
                        {order.type === 'dine_in' ? order.tableName || 'Table' : 'Takeaway'}
                        {order.customerName && (
                          <span className="text-neutral-500 font-normal ml-1">
                            ({order.customerName})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-700 max-w-xs truncate">
                        {order.items
                          .map((it) => `${it.quantity}x ${it.name}`)
                          .join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-neutral-900">
                        {order.total.toFixed(2)} {currency}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                            order.status === 'incoming'
                              ? 'bg-neutral-900 text-white'
                              : order.status === 'brewing'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : order.status === 'ready'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setReceiptOrder(order)}
                          className="p-1 rounded border border-neutral-200 hover:bg-neutral-100 text-neutral-600 transition-colors"
                          title="View & Reprint Receipt"
                        >
                          <Printer size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-lg p-5 shadow-2xl border border-neutral-300 space-y-4">
            <div className="text-center font-mono text-xs space-y-1">
              <div className="font-bold text-sm">RIVER COFFEE & TERMINAL</div>
              <div className="text-[10px] text-neutral-500">Riverwalk Espresso Bar</div>
              <div className="border-b border-dashed border-neutral-300 py-1 font-bold">
                ORDER #{receiptOrder.orderNumber} · {new Date(receiptOrder.createdAt).toLocaleString()}
              </div>
              <div className="text-left space-y-1 py-2">
                {receiptOrder.items.map((it) => (
                  <div key={it.id} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-bold tabular-nums">
                      {it.totalPrice.toFixed(2)} {currency}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-neutral-300 pt-2 flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span className="tabular-nums">{receiptOrder.total.toFixed(2)} {currency}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 border border-neutral-300 rounded font-bold text-xs hover:bg-neutral-50"
              >
                Print
              </button>
              <button
                type="button"
                onClick={() => setReceiptOrder(null)}
                className="flex-1 py-2 bg-neutral-900 text-white rounded font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
