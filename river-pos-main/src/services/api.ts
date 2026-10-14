import { Order, MenuItem, Table, ShopSettings, OrderStatus } from '../types';
import { INITIAL_MENU_ITEMS, INITIAL_TABLES, INITIAL_ORDERS, DEFAULT_SETTINGS } from '../data/menuData';

const LOCAL_STORAGE_ORDERS_KEY = 'paok_pos_orders';
const LOCAL_STORAGE_MENU_KEY = 'paok_pos_menu';
const LOCAL_STORAGE_TABLES_KEY = 'paok_pos_tables';
const LOCAL_STORAGE_SETTINGS_KEY = 'paok_pos_settings';

export class ApiService {
  private static instance: ApiService;
  private eventSource: EventSource | null = null;
  private listeners: { [event: string]: ((data: unknown) => void)[] } = {};

  private constructor() {
    this.initSSE();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private initSSE() {
    if (typeof window === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.addEventListener('init', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.emit('init', data);
        } catch {
          // parse error
        }
      });

      this.eventSource.addEventListener('order_created', (e: MessageEvent) => {
        try {
          const order = JSON.parse(e.data);
          this.emit('order_created', order);
        } catch {
          // parse error
        }
      });

      this.eventSource.addEventListener('order_updated', (e: MessageEvent) => {
        try {
          const order = JSON.parse(e.data);
          this.emit('order_updated', order);
        } catch {
          // parse error
        }
      });

      this.eventSource.addEventListener('tables_updated', (e: MessageEvent) => {
        try {
          const tables = JSON.parse(e.data);
          this.emit('tables_updated', tables);
        } catch {
          // parse error
        }
      });

      this.eventSource.addEventListener('menu_updated', (e: MessageEvent) => {
        try {
          const items = JSON.parse(e.data);
          this.emit('menu_updated', items);
        } catch {
          // parse error
        }
      });

      this.eventSource.onerror = () => {
        // SSE disconnected, will retry automatically or use fallback
      };
    } catch {
      // EventSource not supported or failed
    }
  }

  public on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: (data: unknown) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  private emit(event: string, data: unknown) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }

  // --- Orders ---
  async getOrders(): Promise<Order[]> {
    const normalizeOrder = (order: Partial<Order>): Order => ({
      ...order,
      id: order.id || `ord-${Date.now()}`,
      orderNumber: order.orderNumber || 1,
      type: order.type || 'takeaway',
      items: order.items || [],
      subtotal: Number(order.subtotal ?? 0),
      tax: Number(order.tax ?? 0),
      total: Number(order.total ?? 0),
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus || 'pending',
      status: order.status || 'incoming',
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || new Date().toISOString(),
    } as Order);

    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const json = await res.json();
        if (json.orders) {
          const normalizedOrders = json.orders.map(normalizeOrder);
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(normalizedOrders));
          return normalizedOrders;
        }
      }
    } catch {
      // Backend unavailable, fallback to local storage
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed.map(normalizeOrder) : INITIAL_ORDERS;
      } catch {
        // ignore
      }
    }
    return INITIAL_ORDERS.map((order) => ({ ...order, status: order.status || 'incoming' }));
  }

  async createOrder(order: Partial<Order>): Promise<Order> {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.tables) {
          localStorage.setItem(LOCAL_STORAGE_TABLES_KEY, JSON.stringify(json.tables));
          this.emit('tables_updated', json.tables);
        }
        if (json.order) {
          const current = await this.getOrders();
          localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify([json.order, ...current.filter((o) => o.id !== json.order.id)]));
          this.emit('order_created', json.order);
          return json.order;
        }
      }
    } catch {
      // Fallback local handling
    }

    // Local fallback creation
    const current = await this.getOrders();
    const orderNumber = current.length > 0 ? Math.max(...current.map((o) => o.orderNumber)) + 1 : 101;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      type: order.type || 'takeaway',
      items: order.items || [],
      subtotal: order.subtotal || 0,
      tax: order.tax || 0,
      total: order.total || 0,
      paymentMethod: order.paymentMethod || 'cash',
      paymentStatus: order.paymentStatus || 'paid',
      status: 'incoming',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tableId: order.tableId,
      tableName: order.tableName,
      customerName: order.customerName,
      notes: order.notes,
      tenderedCash: order.tenderedCash,
      changeDue: order.changeDue,
    };

    const updated = [newOrder, ...current];
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updated));

    // Also update tables in local fallback if tableId is assigned
    if (newOrder.tableId) {
      const currentTables = await this.getTables();
      const updatedTables = currentTables.map((t) => {
        if (t.id === newOrder.tableId) {
          return {
            ...t,
            status: 'occupied' as const,
            activeOrderId: newOrder.id,
            currentTotal: (t.status === 'occupied' && t.currentTotal ? t.currentTotal : 0) + newOrder.total,
            seatedAt: t.seatedAt || new Date().toISOString(),
          };
        }
        return t;
      });
      localStorage.setItem(LOCAL_STORAGE_TABLES_KEY, JSON.stringify(updatedTables));
      this.emit('tables_updated', updatedTables);
    }

    this.emit('order_created', newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.order;
      }
    } catch {
      // Fallback
    }

    const current = await this.getOrders();
    let updatedOrder: Order | null = null;
    const updated = current.map((o) => {
      if (o.id === id) {
        updatedOrder = { ...o, status, updatedAt: new Date().toISOString() };
        return updatedOrder;
      }
      return o;
    });

    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updated));
    if (updatedOrder) {
      this.emit('order_updated', updatedOrder);
    }
    return updatedOrder;
  }

  async paySelectedOrderItems(orderId: string, itemIds: string[]): Promise<Order | null> {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      if (res.ok) {
        const json = await res.json();
        return json.order;
      }
    } catch {
      // Fallback local handling
    }

    const current = await this.getOrders();
    let updatedOrder: Order | null = null;
    const updated = current.map((o) => {
      if (o.id !== orderId) return o;

      const paidItemIds = new Set(itemIds);
      const items = o.items.map((item) => (paidItemIds.has(item.id) ? { ...item, paid: true } : item));
      const unpaidItems = items.filter((item) => !item.paid);
      const subtotal = unpaidItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const updatedOrderData: Order = {
        ...o,
        items,
        subtotal,
        total: subtotal + subtotal * 0.0,
        paymentStatus: unpaidItems.length === 0 ? 'paid' : 'pending',
        updatedAt: new Date().toISOString(),
      };
      updatedOrderData.tax = 0;
      updatedOrderData.total = subtotal;
      return updatedOrderData;
    });

    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updated));
    if (updatedOrder) {
      this.emit('order_updated', updatedOrder);
      return updatedOrder;
    }

    const fallbackOrder = updated.find((o) => o.id === orderId) || null;
    if (fallbackOrder) {
      this.emit('order_updated', fallbackOrder);
    }
    return fallbackOrder;
  }

  // --- Menu ---
  async getMenu(): Promise<MenuItem[]> {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const json = await res.json();
        if (json.items) {
          localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(json.items));
          return json.items;
        }
      }
    } catch {
      // Fallback
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_MENU_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.some((it: MenuItem) => it.category === 'beer')) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return INITIAL_MENU_ITEMS;
  }

  async addMenuItem(item: MenuItem): Promise<MenuItem> {
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        const json = await res.json();
        return json.item;
      }
    } catch {
      // Fallback
    }

    const current = await this.getMenu();
    const updated = [...current, item];
    localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(updated));
    this.emit('menu_updated', updated);
    return item;
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        return json.item;
      }
    } catch {
      // Fallback
    }

    const current = await this.getMenu();
    let updatedItem: MenuItem | null = null;
    const updated = current.map((i) => {
      if (i.id === id) {
        updatedItem = { ...i, ...updates };
        return updatedItem;
      }
      return i;
    });

    localStorage.setItem(LOCAL_STORAGE_MENU_KEY, JSON.stringify(updated));
    this.emit('menu_updated', updated);
    return updatedItem;
  }

  // --- Tables ---
  async getTables(): Promise<Table[]> {
    try {
      const res = await fetch('/api/tables');
      if (res.ok) {
        const json = await res.json();
        if (json.tables) {
          localStorage.setItem(LOCAL_STORAGE_TABLES_KEY, JSON.stringify(json.tables));
          return json.tables;
        }
      }
    } catch {
      // Fallback
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_TABLES_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return INITIAL_TABLES;
  }

  async updateTable(id: string, updates: Partial<Table>): Promise<Table | null> {
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.tables) {
          localStorage.setItem(LOCAL_STORAGE_TABLES_KEY, JSON.stringify(json.tables));
          this.emit('tables_updated', json.tables);
        }
        return json.table;
      }
    } catch {
      // Fallback
    }

    const current = await this.getTables();
    let updatedTable: Table | null = null;
    const updated = current.map((t) => {
      if (t.id === id) {
        updatedTable = { ...t, ...updates };
        return updatedTable;
      }
      return t;
    });

    localStorage.setItem(LOCAL_STORAGE_TABLES_KEY, JSON.stringify(updated));
    this.emit('tables_updated', updated);
    return updatedTable;
  }

  // --- Settings ---
  async getSettings(): Promise<ShopSettings> {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        if (json.settings) {
          localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(json.settings));
          return json.settings;
        }
      }
    } catch {
      // Fallback
    }

    const cached = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // ignore
      }
    }
    return DEFAULT_SETTINGS;
  }

  async updateSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        const json = await res.json();
        return json.settings;
      }
    } catch {
      // Fallback
    }

    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(updated));
    this.emit('settings_updated', updated);
    return updated;
  }
}

export const api = ApiService.getInstance();
