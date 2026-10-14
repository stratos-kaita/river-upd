import React from 'react';
import { OrderItem, OrderType, Table } from '../types';
import { Trash2, Plus, Minus, ArrowRight, Coffee, Utensils } from 'lucide-react';

interface TicketPanelProps {
  items: OrderItem[];
  orderType: OrderType;
  selectedTableId?: string;
  tables: Table[];
  currency: string;
  isMonochrome: boolean;
  canRemoveItems?: boolean;
  onSetOrderType: (type: OrderType) => void;
  onSelectTable: (tableId: string) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearTicket: () => void;
  onCheckout: () => void;
  onQuickSendToBar?: () => void;
}

export const TicketPanel: React.FC<TicketPanelProps> = ({
  items,
  orderType,
  selectedTableId,
  tables,
  currency,
  isMonochrome,
  canRemoveItems = false,
  onSetOrderType,
  onSelectTable,
  onUpdateQuantity,
  onRemoveItem,
  onClearTicket,
  onCheckout,
  onQuickSendToBar,
}) => {
  const subtotal = items.reduce((acc, it) => acc + it.totalPrice, 0);
  const tax = subtotal * 0.13; // Greek hospitality VAT
  const total = subtotal;

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  return (
    <div
      className={`flex flex-col h-full border-l transition-colors ${
        isMonochrome
          ? 'bg-white border-neutral-200 text-neutral-900'
          : 'bg-[#fff8f5] border-[#ebe0db] text-[#1f1b18]'
      }`}
    >
      {/* Top Header: Order Mode & Table Selection */}
      <div className="p-3.5 border-b border-neutral-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Current Order
          </span>
          <span className="text-xs font-mono font-semibold text-neutral-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Order Mode Badge */}
        {orderType === 'dine_in' ? (
          <div className="flex items-center justify-between p-2.5 rounded bg-neutral-900 text-white shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">🍽️</span>
              <div>
                <div className="font-extrabold text-xs tracking-tight">
                  {selectedTable?.name || 'Table Order'}
                </div>
                <div className="text-[10px] text-neutral-300 uppercase tracking-wider">
                  {selectedTable?.area} Area · {selectedTable?.seats} seats
                </div>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              Table Tab
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded bg-amber-500/15 border border-amber-300 text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">🛍️</span>
              <div>
                <div className="font-extrabold text-xs">Take Away Order</div>
                <div className="text-[10px] text-amber-800">Direct Counter & Pick-up</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
              Takeaway
            </span>
          </div>
        )}
      </div>

      {/* Items Scroll List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-neutral-400">
            <Coffee size={36} className="mb-2 stroke-1 opacity-50" />
            <p className="text-xs font-medium">Ticket is empty</p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Select items from the menu to build the order
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="py-2.5 px-2 hover:bg-neutral-50 rounded transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-semibold text-xs leading-tight text-neutral-900">
                      {item.name}
                    </span>
                  </div>

                  {/* Modifiers List (Anti-pill unboxed metadata with separators) */}
                  <div className="text-[11px] text-neutral-500 mt-0.5 space-x-1 leading-snug">
                    {item.modifiers.size && (
                      <span className="capitalize">{item.modifiers.size}</span>
                    )}
                    {item.modifiers.sugar && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-neutral-700 capitalize">
                          {item.modifiers.sugar}
                        </span>
                      </>
                    )}
                    {item.modifiers.milk && item.modifiers.milk !== 'none' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{item.modifiers.milk.replace('_', ' ')}</span>
                      </>
                    )}
                    {item.modifiers.ice && item.modifiers.ice !== 'normal' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="capitalize">{item.modifiers.ice.replace('_', ' ')}</span>
                      </>
                    )}
                    {item.modifiers.extraShots > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-neutral-800">
                          +{item.modifiers.extraShots} shot
                        </span>
                      </>
                    )}
                    {item.modifiers.notes && (
                      <div className="text-[10px] text-neutral-600 italic mt-0.5">
                        "{item.modifiers.notes}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="font-mono text-xs font-bold tabular-nums text-neutral-900 shrink-0">
                  {item.totalPrice.toFixed(2)} {currency}
                </div>
              </div>

              {/* Quantity Stepper & Remove */}
              <div className="flex items-center justify-between mt-2 pt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="w-6 h-6 rounded border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 text-neutral-600"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center font-bold text-xs font-mono tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="w-6 h-6 rounded border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 text-neutral-600"
                    aria-label="Increase quantity"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {canRemoveItems && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Footer Totals & Action */}
      {items.length > 0 && (
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50 space-y-2.5">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums font-medium">
                {(subtotal - tax).toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>VAT (13% incl.):</span>
              <span className="font-mono tabular-nums font-medium">
                {tax.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-neutral-900 pt-1 border-t border-neutral-200">
              <span>Total:</span>
              <span className="font-mono tabular-nums">
                {total.toFixed(2)} {currency}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {onQuickSendToBar && (
              <button
                type="button"
                onClick={onQuickSendToBar}
                disabled={orderType === 'dine_in' && !selectedTableId}
                className={`w-full py-2.5 px-4 rounded text-xs font-black tracking-wide text-white flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                  isMonochrome
                    ? 'bg-neutral-900 hover:bg-neutral-800'
                    : 'bg-[#4A2C1D] hover:bg-[#382014]'
                }`}
              >
                <span>
                  ⚡ Send to Bar ({orderType === 'dine_in' ? selectedTable?.name || 'Table Tab' : 'Take Away'})
                </span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClearTicket}
                className="py-2 px-3 border border-neutral-300 rounded text-xs font-semibold hover:bg-neutral-100 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onCheckout}
                disabled={orderType === 'dine_in' && !selectedTableId}
                className="flex-1 py-2 px-3 rounded text-xs font-bold border border-neutral-300 text-neutral-800 hover:bg-neutral-100 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{orderType === 'dine_in' ? 'Tender / Pay' : 'Pay & Receipt'}</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
