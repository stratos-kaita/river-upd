import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PosTerminal } from './components/PosTerminal';
import { ServerKitchenScreen } from './components/ServerKitchenScreen';
import { FloorMapScreen } from './components/FloorMapScreen';
import { OrderHistoryScreen } from './components/OrderHistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginModal, DEFAULT_ACCOUNTS } from './components/LoginModal';
import {
  ActiveScreen,
  Order,
  MenuItem,
  Table,
  ShopSettings,
  OrderStatus,
  OrderType,
  OrderItem,
  UserAccount,
} from './types';
import { api } from './services/api';
import { INITIAL_MENU_ITEMS, INITIAL_TABLES, INITIAL_ORDERS, DEFAULT_SETTINGS } from './data/menuData';
import { sounds } from './utils/sound';

export default function App() {
  const [currentAccount, setCurrentAccount] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('river_session_account');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('tables');
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string>('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return !sessionStorage.getItem('river_session_account');
      } catch {
        // ignore
      }
    }
    return true;
  });
  const [targetScreenAfterLogin, setTargetScreenAfterLogin] = useState<ActiveScreen | null>(null);

  // Initialize data and subscribe to real-time events
  useEffect(() => {
    let mounted = true;

    // Load initial data
    Promise.all([
      api.getOrders(),
      api.getMenu(),
      api.getTables(),
      api.getSettings(),
    ]).then(([fetchedOrders, fetchedMenu, fetchedTables, fetchedSettings]) => {
      if (!mounted) return;
      if (fetchedOrders) setOrders(fetchedOrders);
      if (fetchedMenu) setMenuItems(fetchedMenu);
      if (fetchedTables) setTables(fetchedTables);
      if (fetchedSettings) setSettings(fetchedSettings);
    });

    // Real-time listener for incoming orders
    const handleOrderCreated = (newOrder: unknown) => {
      const order = newOrder as Order;
      setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
      if (settings.soundAlerts) {
        sounds.playOrderChime();
      }
    };

    const handleOrderUpdated = (updatedOrder: unknown) => {
      const order = updatedOrder as Order;
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    };

    const handleTablesUpdated = (updatedTables: unknown) => {
      setTables(updatedTables as Table[]);
    };

    const handleMenuUpdated = (updatedMenu: unknown) => {
      setMenuItems(updatedMenu as MenuItem[]);
    };

    const handleSettingsUpdated = (updatedSettings: unknown) => {
      setSettings(updatedSettings as ShopSettings);
    };

    api.on('order_created', handleOrderCreated);
    api.on('order_updated', handleOrderUpdated);
    api.on('tables_updated', handleTablesUpdated);
    api.on('menu_updated', handleMenuUpdated);
    api.on('settings_updated', handleSettingsUpdated);

    return () => {
      mounted = false;
      api.off('order_created', handleOrderCreated);
      api.off('order_updated', handleOrderUpdated);
      api.off('tables_updated', handleTablesUpdated);
      api.off('menu_updated', handleMenuUpdated);
      api.off('settings_updated', handleSettingsUpdated);
    };
  }, [settings.soundAlerts]);

  // Role-based Navigation
  const handleNavigate = (screen: ActiveScreen) => {
    if (!currentAccount) {
      setTargetScreenAfterLogin(screen);
      setIsLoginModalOpen(true);
      return;
    }
    // Only settings & history require Boss authorization
    if (
      (screen === 'settings' || screen === 'history') &&
      currentAccount.role !== 'boss'
    ) {
      setTargetScreenAfterLogin(screen);
      setIsLoginModalOpen(true);
      return;
    }
    setCurrentScreen(screen);
  };

  const handleLogin = (account: UserAccount) => {
    setCurrentAccount(account);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('river_session_account', JSON.stringify(account));
      } catch {
        // ignore
      }
    }
    setIsLoginModalOpen(false);
    if (account.role === 'boss' && targetScreenAfterLogin) {
      setCurrentScreen(targetScreenAfterLogin);
      setTargetScreenAfterLogin(null);
    } else if (
      account.role === 'waiter' &&
      (currentScreen === 'settings' || currentScreen === 'history')
    ) {
      setCurrentScreen('tables');
    }
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('river_session_account');
      } catch {
        // ignore
      }
    }
    setTargetScreenAfterLogin(null);
    setIsLoginModalOpen(true);
    setCurrentScreen('tables');
  };

  // Order Operations
  const handleSendOrder = async (orderData: {
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
  }) => {
    const created = await api.createOrder({
      ...orderData,
      status: 'incoming',
      paymentStatus: orderData.paymentStatus || 'pending',
      notes: orderData.customerName
        ? `Ordered by ${currentAccount?.name || 'Staff'} (${orderData.customerName})`
        : `Staff: ${currentAccount?.name || 'Staff'}`,
    });
    if (created) {
      setOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)]);
      if (created.tableId) {
        setTables((prev) =>
          prev.map((t) => {
            if (t.id === created.tableId) {
              const prevTotal = (t.status === 'occupied' || t.status === 'bill_requested') && t.currentTotal ? t.currentTotal : 0;
              return {
                ...t,
                status: 'occupied',
                activeOrderId: created.id,
                currentTotal: Math.round((prevTotal + created.total) * 100) / 100,
                seatedAt: t.seatedAt || new Date().toISOString(),
              };
            }
            return t;
          })
        );
        setCurrentScreen('tables');
      }
    }
    setSelectedTableForOrder('');
    if (settings.soundAlerts) {
      sounds.playOrderChime();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await api.updateOrderStatus(orderId, status);
  };

  const handlePaySelectedItems = async (tableId: string, itemIdsByOrder: Record<string, string[]>) => {
    const entries = Object.entries(itemIdsByOrder).filter(([, ids]) => ids.length > 0);
    if (entries.length === 0) return;

    const updatedOrders = await Promise.all(
      entries.map(async ([orderId, ids]) => api.paySelectedOrderItems(orderId, ids))
    );

    const paidOrders = updatedOrders.filter(Boolean) as Order[];
    if (paidOrders.length === 0) return;

    setOrders((prev) => {
      const nextOrders = prev.map((order) => {
        const updated = paidOrders.find((nextOrder) => nextOrder.id === order.id);
        return updated ? updated : order;
      });

      const remainingTableTotal = nextOrders
        .filter((order) => order.tableId === tableId && order.status !== 'cancelled')
        .reduce((sum, order) => sum + order.total, 0);

      setTables((tablePrev) =>
        tablePrev.map((table) =>
          table.id === tableId
            ? {
                ...table,
                currentTotal: remainingTableTotal || undefined,
                status: remainingTableTotal > 0 ? 'occupied' : 'free',
              }
            : table
        )
      );

      return nextOrders;
    });
  };

  // Table Operations
  const handleSelectTableForOrder = (tableId: string) => {
    setSelectedTableForOrder(tableId);
    setCurrentScreen('pos');
  };

  const handleClearTable = async (tableId: string) => {
    const activeTableOrders = orders.filter(
      (order) => order.tableId === tableId && order.status !== 'cancelled' && order.status !== 'delivered'
    );

    setOrders((prev) =>
      prev.map((order) =>
        order.tableId === tableId && order.status !== 'cancelled' && order.status !== 'delivered'
          ? { ...order, status: 'delivered', updatedAt: new Date().toISOString() }
          : order
      )
    );

    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: 'free', activeOrderId: undefined, currentTotal: undefined, seatedAt: undefined }
          : t
      )
    );

    if (activeTableOrders.length > 0) {
      await Promise.all(
        activeTableOrders.map((order) => api.updateOrderStatus(order.id, 'delivered'))
      );
    }

    await api.updateTable(tableId, {
      status: 'free',
      activeOrderId: undefined,
      currentTotal: undefined,
      seatedAt: undefined,
    });

    setSelectedTableForOrder('');
  };

  const handleUpdateTableStatus = async (
    tableId: string,
    status: 'free' | 'occupied' | 'bill_requested'
  ) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status } : t))
    );
    await api.updateTable(tableId, { status });
  };

  // Menu Operations (Boss only)
  const handleAddMenuItem = async (item: MenuItem) => {
    await api.addMenuItem(item);
  };

  const handleUpdateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    await api.updateMenuItem(id, updates);
  };

  // Settings
  const handleUpdateSettings = async (newSettings: Partial<ShopSettings>) => {
    const updated = await api.updateSettings(newSettings);
    setSettings(updated);
  };

  const handleToggleSound = () => {
    const nextSound = !settings.soundAlerts;
    if (nextSound) sounds.playOrderChime();
    handleUpdateSettings({ soundAlerts: nextSound });
  };

  // Simulate Order (For demo / test in kitchen server)
  const handleSimulateOrder = () => {
    const sampleCustomerNames = ['Giannis', 'Eleni', 'Dimitris', 'Maria', 'Alexandros', 'Sofia'];
    const randomCustomer = sampleCustomerNames[Math.floor(Math.random() * sampleCustomerNames.length)];
    const randomOrderType: OrderType = Math.random() > 0.4 ? 'dine_in' : 'takeaway';
    const randomTable = randomOrderType === 'dine_in' ? tables[Math.floor(Math.random() * tables.length)] : undefined;

    const sampleOrdersList: OrderItem[] = [
      {
        id: `sim-it-${Date.now()}-1`,
        menuItemId: 'freddo-cappuccino',
        name: 'Freddo Cappuccino',
        greekName: 'Φρέντο Καπουτσίνο',
        unitPrice: 3.20,
        quantity: Math.floor(Math.random() * 2) + 1,
        modifiers: {
          size: 'double',
          sugar: Math.random() > 0.5 ? 'metrios' : 'sketos',
          milk: 'cold_foam',
          ice: 'normal',
          extraShots: 0,
          decaf: false,
          notes: 'Thick cold crema foam',
        },
        totalPrice: 3.20,
      },
      {
        id: `sim-it-${Date.now()}-2`,
        menuItemId: 'bougatsa-cream',
        name: 'Thessaloniki Bougatsa (Cream)',
        greekName: 'Μπουγάτσα με Κρέμα',
        unitPrice: 2.80,
        quantity: 1,
        modifiers: {
          size: 'regular',
          sugar: 'sketos',
          milk: 'none',
          ice: 'no_ice',
          extraShots: 0,
          decaf: false,
          notes: 'Heated with extra cinnamon',
        },
        totalPrice: 2.80,
      },
    ];

    const subtotal = sampleOrdersList.reduce((acc, it) => acc + it.totalPrice, 0);
    const tax = subtotal * settings.taxRate;

    handleSendOrder({
      type: randomOrderType,
      tableId: randomTable?.id,
      tableName: randomTable?.name,
      customerName: randomCustomer,
      items: sampleOrdersList,
      subtotal,
      tax,
      total: subtotal,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
    });
  };

  const isMonochrome = settings.theme === 'monochrome';
  const openOrdersCount = orders.filter(
    (o) => o.status === 'incoming' || o.status === 'brewing' || o.status === 'ready'
  ).length;

  return (
    <div className="h-dvh flex flex-col overflow-hidden font-sans bg-[#f9f9f9] text-[#1a1c1c]">
      {/* 3-Zone Navigation Top Bar */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        cartCount={cartCount}
        openOrdersCount={openOrdersCount}
        settings={settings}
        currentAccount={currentAccount}
        onToggleSound={handleToggleSound}
        onOpenMobileCart={() => setIsMobileCartOpen(true)}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Screen Views */}
      <main className="flex-1 flex overflow-hidden">
        {currentScreen === 'pos' && (
          <PosTerminal
            menuItems={menuItems}
            tables={tables}
            currency={settings.currency}
            shopName={settings.shopName}
            taxRate={settings.taxRate}
            isMonochrome={isMonochrome}
            canRemoveItems={currentAccount?.role === 'boss'}
            onSendOrder={handleSendOrder}
            onCartCountChange={setCartCount}
            isMobileCartOpen={isMobileCartOpen}
            onCloseMobileCart={() => setIsMobileCartOpen(false)}
            selectedTableId={selectedTableForOrder}
            onSelectTable={setSelectedTableForOrder}
            onBackToFloorMap={() => {
              setSelectedTableForOrder('');
              setCurrentScreen('tables');
            }}
          />
        )}

        {currentScreen === 'tables' && (
          <FloorMapScreen
            tables={tables}
            orders={orders}
            currency={settings.currency}
            isMonochrome={isMonochrome}
            onSelectTableForOrder={handleSelectTableForOrder}
            onClearTable={handleClearTable}
            onUpdateTableStatus={handleUpdateTableStatus}
            onPaySelectedItems={handlePaySelectedItems}
          />
        )}

        {/* Server / Kitchen Display Screen */}
        {currentScreen === 'kds' && currentAccount && (
          <ServerKitchenScreen
            orders={orders}
            currency={settings.currency}
            isMonochrome={isMonochrome}
            soundAlerts={settings.soundAlerts}
            onToggleSound={handleToggleSound}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onSimulateOrder={handleSimulateOrder}
          />
        )}

        {currentScreen === 'history' && currentAccount?.role === 'boss' && (
          <OrderHistoryScreen
            orders={orders}
            currency={settings.currency}
            isMonochrome={isMonochrome}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {currentScreen === 'settings' && currentAccount?.role === 'boss' && (
          <SettingsScreen
            settings={settings}
            menuItems={menuItems}
            onUpdateSettings={handleUpdateSettings}
            onAddMenuItem={handleAddMenuItem}
            onUpdateMenuItem={handleUpdateMenuItem}
          />
        )}
      </main>

      {/* Staff Login & Account Switcher Modal */}
      <LoginModal
        currentAccount={currentAccount}
        targetRole={targetScreenAfterLogin ? 'boss' : undefined}
        isOpen={isLoginModalOpen}
        onClose={() => {
          if (currentAccount) {
            setIsLoginModalOpen(false);
            setTargetScreenAfterLogin(null);
          }
        }}
        onLogin={handleLogin}
      />
    </div>
  );
}
