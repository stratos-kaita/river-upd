import React, { useState, useEffect } from 'react';
import { MenuItem, OrderItem, OrderType, Table, ModifierSelection } from '../types';
import { TicketPanel } from './TicketPanel';
import { ModifierModal } from './ModifierModal';
import { CheckoutModal } from './CheckoutModal';
import { Plus, SlidersHorizontal, Sparkles, Coffee, Beer, Utensils, GlassWater, ArrowLeft, ShoppingBag } from 'lucide-react';
import { sounds } from '../utils/sound';

interface PosTerminalProps {
  menuItems: MenuItem[];
  tables: Table[];
  currency: string;
  shopName: string;
  taxRate: number;
  isMonochrome: boolean;
  onSendOrder: (orderData: {
    type: OrderType;
    tableId?: string;
    tableName?: string;
    customerName?: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: 'cash' | 'card' | 'split';
    paymentStatus: 'paid' | 'pending';
    tenderedCash?: number;
    changeDue?: number;
  }) => void;
  onCartCountChange?: (count: number) => void;
  isMobileCartOpen: boolean;
  onCloseMobileCart: () => void;
  selectedTableId?: string;
  onSelectTable?: (tableId: string) => void;
  onBackToFloorMap?: () => void;
}

type MenuCategory = 'coffee' | 'beer' | 'tea' | 'food';

export const PosTerminal: React.FC<PosTerminalProps> = ({
  menuItems,
  tables,
  currency,
  shopName,
  taxRate,
  isMonochrome,
  onSendOrder,
  onCartCountChange,
  isMobileCartOpen,
  onCloseMobileCart,
  selectedTableId: selectedTableIdProp,
  onSelectTable: onSelectTableProp,
  onBackToFloorMap,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory>('coffee');
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>(selectedTableIdProp ? 'dine_in' : 'takeaway');
  const [internalTableId, setInternalTableId] = useState<string>(selectedTableIdProp || '');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  useEffect(() => {
    if (selectedTableIdProp) {
      setInternalTableId(selectedTableIdProp);
      setOrderType('dine_in');
    } else {
      setInternalTableId('');
      setOrderType('takeaway');
    }
  }, [selectedTableIdProp]);

  const activeTableId = selectedTableIdProp !== undefined && selectedTableIdProp !== '' 
    ? selectedTableIdProp 
    : internalTableId;

  const handleSelectTable = (id: string) => {
    setInternalTableId(id);
    onSelectTableProp?.(id);
  };

  // Filter items based on the 4 categories
  const filteredItems = menuItems.filter((item) => {
    if (!item.available) return false;
    if (selectedCategory === 'coffee') {
      return item.category === 'coffee' || item.category === 'espresso' || item.category === 'iced' || item.category === 'hot';
    }
    if (selectedCategory === 'beer') {
      return item.category === 'beer';
    }
    if (selectedCategory === 'tea') {
      return item.category === 'tea' || item.category === 'tea_beverage';
    }
    if (selectedCategory === 'food') {
      return item.category === 'food' || item.category === 'bakery' || item.category === 'snacks';
    }
    return false;
  });

  // Quick Add with default modifiers
  const handleQuickAdd = (item: MenuItem) => {
    sounds.playTap();
    const defaultMods: ModifierSelection = {
      size: item.defaultModifiers?.size || 'regular',
      sugar: item.defaultModifiers?.sugar || 'sketos',
      milk: item.defaultModifiers?.milk || 'none',
      ice: item.defaultModifiers?.ice || 'normal',
      extraShots: 0,
      decaf: false,
    };

    const existingIndex = cartItems.findIndex(
      (ci) => ci.menuItemId === item.id && JSON.stringify(ci.modifiers) === JSON.stringify(defaultMods)
    );

    if (existingIndex > -1) {
      setCartItems((prev) =>
        prev.map((ci, idx) =>
          idx === existingIndex
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                totalPrice: (ci.quantity + 1) * ci.unitPrice,
              }
            : ci
        )
      );
    } else {
      const newItem: OrderItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: item.id,
        name: item.name,
        greekName: item.greekName,
        unitPrice: item.basePrice,
        quantity: 1,
        modifiers: defaultMods,
        totalPrice: item.basePrice,
      };
      setCartItems((prev) => [...prev, newItem]);
    }
  };

  // Add customized item
  const handleAddCustomized = (
    item: MenuItem,
    modifiers: ModifierSelection,
    quantity: number,
    totalUnitPrice: number
  ) => {
    sounds.playTap();
    const newItem: OrderItem = {
      id: `ci-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      menuItemId: item.id,
      name: item.name,
      greekName: item.greekName,
      unitPrice: totalUnitPrice,
      quantity,
      modifiers,
      totalPrice: totalUnitPrice * quantity,
    };
    setCartItems((prev) => [...prev, newItem]);
  };

  // Tell the app how many items are in the ticket (used by the phone header "Ticket" button)
  const cartCountValue = cartItems.reduce((sum, it) => sum + it.quantity, 0);
  useEffect(() => {
    onCartCountChange?.(cartCountValue);
    return () => onCartCountChange?.(0);
  }, [cartCountValue]);

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    sounds.playTap();
    setCartItems((prev) =>
      prev
        .map((it) => {
          if (it.id === itemId) {
            const newQty = it.quantity + delta;
            return newQty > 0
              ? { ...it, quantity: newQty, totalPrice: newQty * it.unitPrice }
              : null;
          }
          return it;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleRemoveItem = (itemId: string) => {
    sounds.playTap();
    setCartItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const handleClearTicket = () => {
    sounds.playTap();
    setCartItems([]);
  };

  // Submit and checkout order
  const subtotal = cartItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const tax = subtotal * taxRate;
  const total = subtotal;

  const handleFinalOrderSubmit = (details: {
    paymentMethod: 'cash' | 'card' | 'split';
    paymentStatus: 'paid' | 'pending';
    tenderedCash?: number;
    changeDue?: number;
    customerName?: string;
    tableId?: string;
    tableName?: string;
  }) => {
    const finalTableId = details.tableId || activeTableId;
    const selectedTable = tables.find((t) => t.id === finalTableId);
    onSendOrder({
      type: orderType,
      tableId: orderType === 'dine_in' ? finalTableId : undefined,
      tableName: orderType === 'dine_in' ? (details.tableName || selectedTable?.name) : undefined,
      customerName: details.customerName,
      items: cartItems,
      subtotal,
      tax,
      total,
      paymentMethod: details.paymentMethod,
      paymentStatus: details.paymentStatus,
      tenderedCash: details.tenderedCash,
      changeDue: details.changeDue,
    });

    // Reset ticket after order placement
    setCartItems([]);
    setInternalTableId('');
    onSelectTableProp?.('');
    onCloseMobileCart();
  };

  const [tableMissingWarning, setTableMissingWarning] = useState<boolean>(false);

  const handleQuickSendToBar = () => {
    if (orderType === 'takeaway') {
      sounds.playReadyChime();
      handleFinalOrderSubmit({
        paymentMethod: 'cash',
        paymentStatus: 'paid',
        customerName: 'Takeaway Counter',
      });
      return;
    }
    if (orderType === 'dine_in' && !activeTableId) {
      // No table chosen yet: open the checkout window where the table can be picked
      setTableMissingWarning(true);
      setTimeout(() => setTableMissingWarning(false), 3000);
      onCloseMobileCart();
      setIsCheckoutOpen(true);
      return;
    }
    sounds.playReadyChime();
    const finalTableId = activeTableId;
    const selectedTable = tables.find((t) => t.id === finalTableId);
    handleFinalOrderSubmit({
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      tableId: finalTableId,
      tableName: selectedTable?.name,
    });
  };

  const categories = [
    { key: 'coffee', label: 'Coffee', icon: Coffee },
    { key: 'beer', label: 'Beer', icon: Beer },
    { key: 'tea', label: 'Tea', icon: GlassWater },
    { key: 'food', label: 'Food', icon: Utensils },
  ];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Catalog Area (8 cols on desktop / full on mobile) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Table & Order Mode Strip */}
        {orderType === 'dine_in' ? (
          <div className="px-3.5 py-2.5 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              {onBackToFloorMap && (
                <button
                  type="button"
                  onClick={onBackToFloorMap}
                  className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Floor Tables</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-300 text-xs font-bold uppercase tracking-wide">
                  Table Order
                </span>
                <span className="font-extrabold text-sm text-white">
                  {tables.find((t) => t.id === activeTableId)?.name || 'Table'}
                </span>
                <span className="text-xs text-neutral-300 hidden sm:inline">
                  ({tables.find((t) => t.id === activeTableId)?.area.toUpperCase()} · {tables.find((t) => t.id === activeTableId)?.seats} seats)
                </span>
              </div>
            </div>
            <div className="text-xs text-neutral-300 font-medium">
              Dispatches straight to table tab
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-2.5 bg-amber-500/10 border-b border-amber-300/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                <ShoppingBag size={12} />
                <span>Take Away</span>
              </span>
              <span className="text-xs font-bold text-amber-950">
                Take Away Orders (To-Go)
              </span>
              <span className="text-[11px] text-amber-800 hidden md:inline">
                • For table dine-in orders, tap table on Floor Tables
              </span>
            </div>
            {onBackToFloorMap && (
              <button
                type="button"
                onClick={onBackToFloorMap}
                className="text-xs font-bold text-amber-900 hover:text-amber-950 hover:underline flex items-center gap-1"
              >
                <span>Floor Tables</span>
                <span>→</span>
              </button>
            )}
          </div>
        )}

        {/* Category Selector (2 per line, bigger buttons, no search bar) */}
        <div className="p-3.5 md:p-4 border-b border-neutral-200 bg-white shrink-0">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {categories.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategory(key as MenuCategory)}
                className={`min-h-[58px] sm:min-h-[64px] py-3.5 px-4 rounded-lg flex items-center justify-center gap-2.5 sm:gap-3 font-bold text-sm sm:text-base tracking-wide uppercase transition-all select-none border-2 active:scale-[0.99] ${
                  selectedCategory === key
                    ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                    : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:border-neutral-400 hover:bg-white'
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-xs">
              No products available in this category
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between p-3.5 rounded border transition-all text-left group ${
                    isMonochrome
                      ? 'bg-white border-neutral-200 hover:border-neutral-900 shadow-2xs'
                      : 'bg-white border-[#EDE7DF] hover:border-[#C59B6D] shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Popular indicator */}
                    {item.popular && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        <Sparkles size={11} />
                        <span>Staff Favorite</span>
                      </div>
                    )}
                    <h3 className="font-bold text-sm leading-tight text-neutral-900">
                      {item.name}
                    </h3>
                    {item.greekName && (
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {item.greekName}
                      </p>
                    )}
                    <p className="text-[11px] text-neutral-500 mt-1.5 line-clamp-2 leading-snug">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                    {/* Price Tabular */}
                    <div className="font-mono text-sm font-bold tabular-nums text-neutral-900">
                      {item.basePrice.toFixed(2)} {currency}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      {/* Customize button */}
                      <button
                        type="button"
                        onClick={() => setCustomizingItem(item)}
                        title="Customize Sugar / Milk / Extras"
                        aria-label="Customize item"
                        className="p-2.5 lg:p-1.5 rounded border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                      >
                        <SlidersHorizontal size={18} />
                      </button>

                      {/* Quick Add button */}
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(item)}
                        title="Quick Add with Defaults"
                        aria-label="Quick add"
                        className={`p-2.5 lg:p-1.5 rounded font-bold text-white transition-transform active:scale-95 ${
                          isMonochrome
                            ? 'bg-neutral-900 hover:bg-neutral-800'
                            : 'bg-[#4A2C1D] hover:bg-[#382014]'
                        }`}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Mobile Sticky Quick Action Bottom Bar */}
        {cartItems.length > 0 && (
          <div style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
            className="lg:hidden sticky bottom-0 z-20 bg-white border-t-2 border-neutral-900 px-3.5 pt-2.5 shadow-2xl flex items-center justify-between gap-2.5">
            <div className="min-w-0 cursor-pointer" onClick={() => setIsCheckoutOpen(true)}>
              <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 truncate">
                {orderType === 'dine_in' ? (
                  activeTableId ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-mono font-bold">
                      {tables.find((t) => t.id === activeTableId)?.name}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-bold animate-pulse">
                      ⚠️ Pick Table
                    </span>
                  )
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800 text-[11px] font-mono">
                    Takeaway
                  </span>
                )}
                <span>{cartItems.reduce((s, i) => s + i.quantity, 0)} items</span>
              </div>
              <div className="text-sm font-extrabold font-mono text-neutral-900">
                {total.toFixed(2)} {currency}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="px-3 py-3 border border-neutral-300 rounded text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Pay / Bill
              </button>
              <button
                type="button"
                onClick={handleQuickSendToBar}
                className="px-4 py-3 rounded bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-black tracking-wide flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span>⚡ Send to Bar</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Desktop Persistent Ticket Manifest (4 cols) */}
      <div className="hidden lg:block w-80 xl:w-96 shrink-0 h-full">
        <TicketPanel
          items={cartItems}
          orderType={orderType}
          selectedTableId={activeTableId}
          tables={tables}
          currency={currency}
          isMonochrome={isMonochrome}
          onSetOrderType={setOrderType}
          onSelectTable={handleSelectTable}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearTicket={handleClearTicket}
          onCheckout={() => setIsCheckoutOpen(true)}
          onQuickSendToBar={handleQuickSendToBar}
        />
      </div>

      {/* Mobile Slide-Over Ticket Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-sm h-full bg-white flex flex-col shadow-2xl">
            <TicketPanel
              items={cartItems}
              orderType={orderType}
              selectedTableId={activeTableId}
              tables={tables}
              currency={currency}
              isMonochrome={isMonochrome}
              onSetOrderType={setOrderType}
              onSelectTable={handleSelectTable}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearTicket={handleClearTicket}
              onCheckout={() => {
                onCloseMobileCart();
                setIsCheckoutOpen(true);
              }}
              onQuickSendToBar={handleQuickSendToBar}
            />
          </div>
        </div>
      )}

      {/* Modifier Customizer Modal */}
      {customizingItem && (
        <ModifierModal
          item={customizingItem}
          currency={currency}
          isMonochrome={isMonochrome}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={handleAddCustomized}
        />
      )}

      {/* Settlement & Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          items={cartItems}
          orderType={orderType}
          tableId={activeTableId}
          tableName={tables.find((t) => t.id === activeTableId)?.name}
          tables={tables}
          subtotal={subtotal}
          tax={tax}
          total={total}
          currency={currency}
          shopName={shopName}
          taxRate={taxRate}
          isMonochrome={isMonochrome}
          onClose={() => setIsCheckoutOpen(false)}
          onSelectTable={handleSelectTable}
          onSubmitOrder={handleFinalOrderSubmit}
        />
      )}
    </div>
  );
};
