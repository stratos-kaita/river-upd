import React, { useState } from 'react';
import { Table, Order } from '../types';
import { Users, Clock, Coffee, ArrowRight, CheckCircle2, Receipt, AlertCircle, Sparkles } from 'lucide-react';
import { sounds } from '../utils/sound';

interface FloorMapScreenProps {
  tables: Table[];
  orders: Order[];
  currency: string;
  isMonochrome: boolean;
  onSelectTableForOrder: (tableId: string) => void;
  onClearTable: (tableId: string) => void;
  onUpdateTableStatus: (tableId: string, status: 'free' | 'occupied' | 'bill_requested') => void;
  onPaySelectedItems: (tableId: string, itemIdsByOrder: Record<string, string[]>) => void;
}

export const FloorMapScreen: React.FC<FloorMapScreenProps> = ({
  tables,
  orders,
  currency,
  isMonochrome,
  onSelectTableForOrder,
  onClearTable,
  onUpdateTableStatus,
  onPaySelectedItems,
}) => {
  const [selectedArea, setSelectedArea] = useState<'all' | 'indoor' | 'patio' | 'bar'>('all');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, string[]>>({});

  const activeTable = tables.find((t) => t.id === activeTableId) || null;

  const filteredTables = tables.filter(
    (t) => selectedArea === 'all' || t.area === selectedArea
  );

  const getTableOrders = (tableId: string) => {
    return orders.filter(
      (o) => o.tableId === tableId && o.status !== 'cancelled' && o.status !== 'delivered'
    );
  };

  const occupiedCount = tables.filter((t) => t.status === 'occupied' || getTableOrders(t.id).length > 0).length;
  const freeCount = tables.filter((t) => t.status === 'free' && getTableOrders(t.id).length === 0).length;
  const billReqCount = tables.filter((t) => t.status === 'bill_requested').length;

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'incoming':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Incoming</span>;
      case 'brewing':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">Brewing</span>;
      case 'ready':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 animate-pulse">Ready to Serve</span>;
      case 'delivered':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">Served</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-600">{status}</span>;
    }
  };

  const toggleSelectedItem = (orderId: string, itemId: string) => {
    setSelectedItemIds((prev) => {
      const current = prev[orderId] ?? [];
      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];

      return {
        ...prev,
        [orderId]: next,
      };
    });
  };

  const tableOrdersForSelectedTable = (tableId: string) => {
    return orders.filter((o) => o.tableId === tableId && o.status !== 'cancelled' && o.status !== 'delivered');
  };

  const selectedTableItems = activeTable
    ? tableOrdersForSelectedTable(activeTable.id).flatMap((order) =>
        (selectedItemIds[order.id] ?? [])
          .map((itemId) => {
            const item = order.items.find((it) => it.id === itemId && !it.paid);
            return item ? { orderId: order.id, item } : null;
          })
          .filter(Boolean) as Array<{ orderId: string; item: Order['items'][number] }>
      )
    : [];

  const selectedTableTotal = selectedTableItems.reduce((sum, entry) => sum + entry.item.totalPrice, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100">
      {/* Floor Top Bar */}
      <div className="p-4 bg-white border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold tracking-tight text-neutral-900">
            FLOOR & PATIO TABLE ORCHESTRATION
          </h1>
          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
            <span>
              <strong className="text-neutral-900 font-mono tabular-nums">{freeCount}</strong> Free
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-neutral-900 font-mono tabular-nums">{occupiedCount}</strong> Occupied
            </span>
            {billReqCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-semibold">
                  <strong className="font-mono tabular-nums">{billReqCount}</strong> Bill Requested
                </span>
              </>
            )}
          </div>
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded border border-neutral-200">
          {(['all', 'indoor', 'patio', 'bar'] as const).map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-3 py-1.5 text-xs font-semibold capitalize rounded transition-colors ${
                selectedArea === area
                  ? 'bg-white shadow-xs text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {area === 'all' ? 'All Areas' : area}
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3.5">
          {filteredTables.map((table) => {
            const tableOrders = getTableOrders(table.id);
            const hasOrders = tableOrders.length > 0;
            const isBillReq = table.status === 'bill_requested';
            const isOccupied = table.status === 'occupied' || hasOrders || isBillReq;
            
            const computedTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);
            const displayTotal = table.currentTotal && table.currentTotal > 0 ? table.currentTotal : computedTotal;

            const latestActiveOrder = tableOrders.find(
              (o) => o.status === 'incoming' || o.status === 'brewing' || o.status === 'ready'
            );

            return (
              <div
                key={table.id}
                onClick={() => {
                  sounds.playTap();
                  if (!isOccupied) {
                    onSelectTableForOrder(table.id);
                  } else {
                    setActiveTableId(table.id);
                  }
                }}
                className={`p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] min-h-[145px] shadow-2xs select-none ${
                  isBillReq
                    ? 'bg-amber-50 border-amber-500 border-2 text-amber-950'
                    : isOccupied
                    ? isMonochrome
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                    : 'bg-white border-neutral-200 text-neutral-900 hover:border-neutral-900 hover:shadow-md'
                }`}
              >
                {/* Table Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-bold text-sm tracking-tight">{table.name}</span>
                    <div
                      className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${
                        isOccupied && !isBillReq ? 'opacity-70' : 'text-neutral-500'
                      }`}
                    >
                      {table.area}
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[11px] font-mono tabular-nums ${
                      isOccupied && !isBillReq ? 'opacity-80' : 'text-neutral-500'
                    }`}
                  >
                    <Users size={12} />
                    <span>{table.seats}</span>
                  </div>
                </div>

                {/* Table Center Info */}
                <div className="my-2">
                  {isOccupied ? (
                    <div>
                      <div className="font-mono text-lg font-bold tabular-nums">
                        {displayTotal.toFixed(2)} {currency}
                      </div>
                      <div className="text-[10px] mt-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 opacity-90">
                          <Clock size={10} />
                          <span>
                            {tableOrders.length} {tableOrders.length === 1 ? 'Order' : 'Orders'}
                          </span>
                        </div>
                        {latestActiveOrder && (
                          <div className="font-semibold text-[10px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>
                              #{latestActiveOrder.orderNumber} {latestActiveOrder.status}
                            </span>
                          </div>
                        )}
                        {isBillReq && (
                          <div className="font-bold text-amber-800 flex items-center gap-1">
                            <Receipt size={10} />
                            <span>Bill Requested</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready & Available</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-medium">
                        Tap to start order
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Quick Action */}
                <div className="pt-2 border-t border-current/15 flex items-center justify-between text-xs font-semibold">
                  {isOccupied ? (
                    <>
                      <span className="text-[11px] opacity-90">View Tab ({tableOrders.length})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          sounds.playTap();
                          onSelectTableForOrder(table.id);
                        }}
                        className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>+ Order</span>
                        <ArrowRight size={11} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-700 font-bold">Tap Table to Order</span>
                      <ArrowRight size={13} className="text-emerald-700" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table Detail Drawer / Modal */}
      {activeTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-neutral-900">{activeTable.name}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    activeTable.status === 'free' && getTableOrders(activeTable.id).length === 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeTable.status === 'bill_requested'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-neutral-900 text-white'
                  }`}>
                    {activeTable.status === 'bill_requested'
                      ? 'Bill Requested'
                      : activeTable.status === 'free' && getTableOrders(activeTable.id).length === 0
                      ? 'Available'
                      : 'Occupied'}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {activeTable.area.toUpperCase()} AREA · {activeTable.seats} SEATS
                  {activeTable.seatedAt && ` · Seated ${new Date(activeTable.seatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTableId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const tableOrders = getTableOrders(activeTable.id);
                const computedTotal = tableOrders.reduce((sum, o) => sum + o.total, 0);
                const displayTotal = activeTable.currentTotal && activeTable.currentTotal > 0 ? activeTable.currentTotal : computedTotal;

                if (tableOrders.length === 0) {
                  return (
                    <div className="text-center py-8 px-4 bg-neutral-50 border border-dashed border-neutral-200 rounded-lg">
                      <Coffee size={32} className="mx-auto text-neutral-400 mb-2 stroke-1" />
                      <p className="text-sm font-semibold text-neutral-700">No Orders for {activeTable.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Table is currently clean and ready for guests.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Orders at {activeTable.name} ({tableOrders.length})
                      </span>
                      <span className="text-xs font-bold text-neutral-900">
                        Live Table Tab
                      </span>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-3">
                      {tableOrders.map((order) => (
                        <div
                          key={order.id}
                          className="border border-neutral-200 rounded-lg p-3 bg-neutral-50 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-neutral-900">
                                Order #{order.orderNumber}
                              </span>
                              <span className="text-[11px] text-neutral-500">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div>{getStatusBadge(order.status)}</div>
                          </div>

                          {/* Items Breakdown */}
                          <div className="divide-y divide-neutral-200/60 text-xs">
                            {order.items.map((it) => {
                              const isSelected = (selectedItemIds[order.id] ?? []).includes(it.id);

                              const isPaid = Boolean(it.paid);

                              return (
                                <div
                                  key={it.id}
                                  className={`py-1.5 flex justify-between items-start gap-2 rounded ${
                                    isSelected ? 'bg-neutral-900 text-white px-2 -mx-2' : isPaid ? 'opacity-60' : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-2 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isPaid}
                                      onChange={() => toggleSelectedItem(order.id, it.id)}
                                      className="mt-1 h-3.5 w-3.5 accent-neutral-900 disabled:cursor-not-allowed"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="min-w-0">
                                      <div className={`font-semibold ${isSelected ? 'text-white' : isPaid ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                                        {it.quantity}x {it.name}
                                        {isPaid && <span className="ml-2 text-[10px] uppercase tracking-wide font-bold text-emerald-600">Paid</span>}
                                      </div>
                                      {(it.modifiers.sugar || it.modifiers.milk || it.modifiers.notes) && (
                                        <div className={`text-[11px] ${isSelected ? 'text-neutral-200' : isPaid ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                          {[
                                            it.modifiers.size,
                                            it.modifiers.sugar && `Sugar: ${it.modifiers.sugar}`,
                                            it.modifiers.milk && it.modifiers.milk !== 'none' && `Milk: ${it.modifiers.milk}`,
                                            it.modifiers.notes,
                                          ].filter(Boolean).join(' · ')}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className={`font-mono font-bold tabular-nums shrink-0 ${isSelected ? 'text-white' : isPaid ? 'text-neutral-500 line-through' : 'text-neutral-800'}`}>
                                    {it.totalPrice.toFixed(2)} {currency}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-xs">
                            <span className="text-neutral-500">Order Subtotal:</span>
                            <span className="font-mono font-bold text-neutral-900">
                              {order.total.toFixed(2)} {currency}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cumulative Table Summary Card */}
                    <div className="p-3.5 bg-neutral-900 text-white rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-neutral-400 font-bold">
                          Total Table Balance
                        </div>
                        <div className="text-[11px] text-neutral-300 mt-0.5">
                          {tableOrders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0), 0)} Total Items Served
                        </div>
                      </div>
                      <div className="font-mono text-xl font-bold tabular-nums">
                        {displayTotal.toFixed(2)} {currency}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-neutral-200 bg-white space-y-2 shrink-0">
              {selectedTableItems.length > 0 && (
                <div className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-700 flex items-center justify-between gap-2">
                  <span>{selectedTableItems.length} item(s) selected</span>
                  <span className="font-mono font-bold text-neutral-900 tabular-nums">
                    {selectedTableTotal.toFixed(2)} {currency}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  const tableId = activeTable.id;
                  setActiveTableId(null);
                  onSelectTableForOrder(tableId);
                }}
                className="w-full py-3 rounded-lg bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <Coffee size={15} />
                <span>Start / Add to Order at {activeTable.name}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTableItems.length > 0) {
                      onPaySelectedItems(
                        activeTable.id,
                        Object.fromEntries(
                          Object.entries(selectedItemIds).filter(([, ids]) => ids.length > 0)
                        )
                      );
                      setSelectedItemIds({});
                      return;
                    }

                    const nextStatus = activeTable.status === 'bill_requested' ? 'occupied' : 'bill_requested';
                    onUpdateTableStatus(activeTable.id, nextStatus);
                  }}
                  className={`py-2 rounded-lg font-bold text-xs border flex items-center justify-center gap-1.5 transition-colors ${
                    selectedTableItems.length > 0
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : activeTable.status === 'bill_requested'
                      ? 'bg-amber-100 border-amber-400 text-amber-900'
                      : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <Receipt size={14} />
                  <span>
                    {selectedTableItems.length > 0
                      ? `Pay Selected (${selectedTableTotal.toFixed(2)} ${currency})`
                      : activeTable.status === 'bill_requested'
                      ? 'Bill Marked'
                      : 'Pay Selected'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClearTable(activeTable.id);
                    setSelectedItemIds({});
                    setActiveTableId(null);
                  }}
                  className="py-2 rounded-lg font-bold text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 size={14} />
                  <span>Clear & Free Table</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
