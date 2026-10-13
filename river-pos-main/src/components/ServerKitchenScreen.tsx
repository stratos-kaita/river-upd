import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';
import {
  Clock,
  CheckCircle,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  PlusCircle,
  Search,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { sounds } from '../utils/sound';

interface ServerKitchenScreenProps {
  orders: Order[];
  currency: string;
  isMonochrome: boolean;
  soundAlerts: boolean;
  onToggleSound: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onSimulateOrder: () => void;
}

export const ServerKitchenScreen: React.FC<ServerKitchenScreenProps> = ({
  orders,
  currency,
  isMonochrome,
  soundAlerts,
  onToggleSound,
  onUpdateOrderStatus,
  onSimulateOrder,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'takeaway'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [now, setNow] = useState<number>(Date.now());

  // Tick every second to update order elapsed timers
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesType = filterType === 'all' || order.type === filterType;
    const matchesSearch =
      searchQuery === '' ||
      order.orderNumber.toString().includes(searchQuery) ||
      (order.tableName && order.tableName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.items.some((it) => it.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const incomingOrders = filteredOrders.filter((o) => o.status === 'incoming');
  const brewingOrders = filteredOrders.filter((o) => o.status === 'brewing');
  const readyOrders = filteredOrders.filter((o) => o.status === 'ready');
  const deliveredOrders = filteredOrders.filter((o) => o.status === 'delivered');

  // Elapsed time formatter
  const getElapsedFormatted = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    const diffSec = Math.floor((now - createdTime) / 1000);
    if (diffSec < 0) return '0s';
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const getTimerSeverity = (createdAt: string) => {
    const diffMin = (now - new Date(createdAt).getTime()) / 60000;
    if (diffMin > 6) return 'urgent';
    if (diffMin > 3) return 'warning';
    return 'normal';
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus) => {
    sounds.playTap();
    if (currentStatus === 'incoming') {
      onUpdateOrderStatus(orderId, 'brewing');
    } else if (currentStatus === 'brewing') {
      sounds.playReadyChime();
      onUpdateOrderStatus(orderId, 'ready');
    } else if (currentStatus === 'ready') {
      onUpdateOrderStatus(orderId, 'delivered');
    }
  };

  const renderOrderCard = (order: Order) => {
    const severity = getTimerSeverity(order.createdAt);
    const isUrgent = severity === 'urgent' && order.status !== 'delivered';
    const isWarning = severity === 'warning' && order.status !== 'delivered';

    return (
      <div
        key={order.id}
        className={`flex flex-col justify-between rounded border transition-all ${
          isMonochrome
            ? isUrgent
              ? 'bg-neutral-50 border-neutral-900 border-2 shadow-md'
              : 'bg-white border-neutral-300 shadow-2xs'
            : isUrgent
            ? 'bg-[#fff5f5] border-red-800 border-2 shadow-md'
            : 'bg-white border-[#EDE7DF] shadow-2xs'
        }`}
      >
        {/* Ticket Header */}
        <div className="p-3 border-b border-neutral-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xl font-black tabular-nums tracking-tight text-neutral-900">
                #{order.orderNumber}
              </span>
              {order.type === 'dine_in' ? (
                <span className="px-2 py-0.5 rounded bg-neutral-900 text-white font-extrabold text-xs uppercase tracking-wider shadow-xs">
                  {order.tableName || 'Table'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-neutral-200 text-neutral-800 font-bold text-xs uppercase tracking-wider">
                  Takeaway
                </span>
              )}
            </div>

            {/* Elapsed Timer */}
            <div
              className={`flex items-center gap-1 font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded shrink-0 ${
                isUrgent
                  ? 'bg-neutral-900 text-white'
                  : isWarning
                  ? 'bg-neutral-200 text-neutral-900'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              <Clock size={12} />
              <span>{getElapsedFormatted(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
            {order.customerName ? (
              <span className="font-semibold text-neutral-700">Guest: {order.customerName}</span>
            ) : (
              <span>Dine-In Guest</span>
            )}
            {order.notes && (
              <span className="italic text-neutral-600 truncate max-w-[150px]">
                {order.notes}
              </span>
            )}
          </div>
        </div>

        {/* Items List (Barista specifications) */}
        <div className="p-3 space-y-2 flex-1">
          {order.items.map((it) => (
            <div key={it.id} className="text-xs">
              <div className="flex items-baseline justify-between font-bold text-neutral-900">
                <span>
                  {it.quantity}x {it.name}
                </span>
                <span className="font-mono text-[11px] font-normal text-neutral-500 tabular-nums">
                  {it.totalPrice.toFixed(2)} {currency}
                </span>
              </div>

              {/* Barista Modifiers Breakdown (No pill boxes, crisp typography) */}
              <div className="text-[11px] text-neutral-600 font-medium pl-2 mt-0.5 space-x-1 border-l-2 border-neutral-300">
                {it.modifiers.size && (
                  <span className="capitalize font-semibold">{it.modifiers.size}</span>
                )}
                {it.modifiers.sugar && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize font-bold text-neutral-900">
                      {it.modifiers.sugar === 'sketos' && 'Σκέτος'}
                      {it.modifiers.sugar === 'metrios' && 'Μέτριος'}
                      {it.modifiers.sugar === 'glykos' && 'Γλυκός'}
                      {it.modifiers.sugar === 'brown' && 'Καστανή'}
                      {it.modifiers.sugar === 'stevia' && 'Stevia'}
                    </span>
                  </>
                )}
                {it.modifiers.milk && it.modifiers.milk !== 'none' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize font-semibold">
                      {it.modifiers.milk === 'cold_foam' ? 'Cold Crema Foam' : it.modifiers.milk}
                    </span>
                  </>
                )}
                {it.modifiers.ice && it.modifiers.ice !== 'normal' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{it.modifiers.ice} ice</span>
                  </>
                )}
                {it.modifiers.extraShots > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-neutral-900">
                      +{it.modifiers.extraShots} shot
                    </span>
                  </>
                )}
                {it.modifiers.decaf && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold">Decaf</span>
                  </>
                )}
                {it.modifiers.syrup && it.modifiers.syrup !== 'none' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{it.modifiers.syrup} syrup</span>
                  </>
                )}
                {it.modifiers.notes && (
                  <div className="text-[10px] text-neutral-700 italic mt-0.5 font-sans">
                    Note: "{it.modifiers.notes}"
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Button Footer */}
        <div className="p-2.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-2">
          {order.status === 'incoming' && (
            <button
              type="button"
              onClick={() => handleAdvanceStatus(order.id, 'incoming')}
              className={`w-full py-2 px-3 rounded font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98] ${
                isMonochrome
                  ? 'bg-neutral-900 hover:bg-neutral-800'
                  : 'bg-[#4A2C1D] hover:bg-[#382014]'
              }`}
            >
              <Play size={13} />
              <span>Start Brewing / Prep</span>
            </button>
          )}

          {order.status === 'brewing' && (
            <button
              type="button"
              onClick={() => handleAdvanceStatus(order.id, 'brewing')}
              className="w-full py-2 px-3 rounded font-bold text-xs text-white bg-amber-700 hover:bg-amber-800 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
            >
              <CheckCircle size={14} />
              <span>Mark Ready (Chime Bell)</span>
            </button>
          )}

          {order.status === 'ready' && (
            <button
              type="button"
              onClick={() => handleAdvanceStatus(order.id, 'ready')}
              className="w-full py-2 px-3 rounded font-bold text-xs text-white bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center gap-1.5 transition-transform active:scale-[0.98]"
            >
              <CheckCheck size={14} />
              <span>Served / Deliver Order</span>
            </button>
          )}

          {order.status === 'delivered' && (
            <div className="w-full flex items-center justify-between text-xs text-neutral-500">
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCheck size={14} /> Completed
              </span>
              <button
                type="button"
                onClick={() => onUpdateOrderStatus(order.id, 'brewing')}
                title="Recall back to brewing"
                className="p-1 hover:text-neutral-900 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-100">
      {/* KDS Control Toolbar */}
      <div className="p-3 md:p-4 bg-white border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-base font-bold tracking-tight text-neutral-900 flex items-center gap-2">
                <span>BAR SERVER & KITCHEN DISPLAY</span>
                <span className="text-xs font-mono font-normal text-neutral-500 tabular-nums">
                  ({incomingOrders.length + brewingOrders.length + readyOrders.length} active tickets)
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Live orders from floor waiters in real-time · Stationed in the bar
            </p>
          </div>
        </div>

        {/* Filter, Audio & Simulator Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Alert Status & Test */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-100 border border-neutral-200 text-xs font-medium">
            <button
              type="button"
              onClick={onToggleSound}
              className="flex items-center gap-1 hover:text-neutral-900 transition-colors font-bold"
              title={soundAlerts ? 'Mute Chimes' : 'Enable Chimes'}
            >
              {soundAlerts ? (
                <>
                  <Volume2 size={14} className="text-emerald-700" />
                  <span className="text-emerald-800">Chime ON</span>
                </>
              ) : (
                <>
                  <VolumeX size={14} className="text-neutral-400" />
                  <span className="text-neutral-500">Chime OFF</span>
                </>
              )}
            </button>
            <span className="text-neutral-300">|</span>
            <button
              type="button"
              onClick={() => sounds.playOrderChime()}
              className="text-[11px] text-neutral-600 hover:text-neutral-900 underline"
            >
              Test Ding
            </button>
          </div>

          {/* Order type filters */}
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded border border-neutral-200">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                filterType === 'all' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-600'
              }`}
            >
              All ({filteredOrders.length})
            </button>
            <button
              onClick={() => setFilterType('dine_in')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                filterType === 'dine_in' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Dine-In
            </button>
            <button
              onClick={() => setFilterType('takeaway')}
              className={`px-2.5 py-1 text-xs font-semibold rounded ${
                filterType === 'takeaway' ? 'bg-white shadow-xs text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Takeaway
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search table / #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2 py-1 text-xs border border-neutral-200 rounded w-28 sm:w-36 bg-neutral-50 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Simulate New Order button */}
          <button
            type="button"
            onClick={onSimulateOrder}
            title="Create a test waiter order to verify real-time alert and bar chime"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors shrink-0"
          >
            <PlusCircle size={14} />
            <span>Simulate Order</span>
          </button>
        </div>
      </div>

      {/* Columns Board (4 Columns) */}
      <div className="flex-1 p-3 md:p-4 overflow-x-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Column 1: Incoming / Queued */}
        <div className="flex flex-col h-full bg-neutral-50 rounded border border-neutral-200 overflow-hidden">
          <div className="p-3 bg-neutral-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider">
                1. Incoming Orders
              </span>
            </div>
            <span className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 bg-neutral-800 rounded">
              {incomingOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-3">
            {incomingOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-neutral-400 text-center">
                No new orders in queue
              </div>
            ) : (
              incomingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 2: In Preparation / Brewing */}
        <div className="flex flex-col h-full bg-neutral-50 rounded border border-neutral-200 overflow-hidden">
          <div className="p-3 bg-amber-800 text-white flex items-center justify-between shrink-0">
            <span className="font-bold text-xs uppercase tracking-wider">
              2. Brewing / In Prep
            </span>
            <span className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 bg-amber-900 rounded">
              {brewingOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-3">
            {brewingOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-neutral-400 text-center">
                No drinks currently brewing
              </div>
            ) : (
              brewingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 3: Ready for Pickup / Delivery */}
        <div className="flex flex-col h-full bg-neutral-50 rounded border border-neutral-200 overflow-hidden">
          <div className="p-3 bg-emerald-800 text-white flex items-center justify-between shrink-0">
            <span className="font-bold text-xs uppercase tracking-wider">
              3. Ready for Service
            </span>
            <span className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 bg-emerald-900 rounded">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-3">
            {readyOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-neutral-400 text-center">
                No orders waiting for pickup
              </div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        {/* Column 4: Completed / Archived */}
        <div className="flex flex-col h-full bg-neutral-50 rounded border border-neutral-200 overflow-hidden">
          <div className="p-3 bg-neutral-300 text-neutral-800 flex items-center justify-between shrink-0">
            <span className="font-bold text-xs uppercase tracking-wider">
              4. Completed
            </span>
            <span className="font-mono text-xs font-bold tabular-nums px-2 py-0.5 bg-neutral-200 rounded">
              {deliveredOrders.length}
            </span>
          </div>

          <div className="flex-1 p-2.5 overflow-y-auto space-y-3">
            {deliveredOrders.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-neutral-400 text-center">
                Completed orders will show here
              </div>
            ) : (
              deliveredOrders.slice(0, 10).map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
