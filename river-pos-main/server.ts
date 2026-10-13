import express, { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Order, MenuItem, Table, ShopSettings } from './src/types';
import { INITIAL_MENU_ITEMS, INITIAL_TABLES, DEFAULT_SETTINGS } from './src/data/menuData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------- Persistent storage (JSON file on disk) ----------
// Everything is kept in memory for speed AND saved to disk after every change,
// so a restart or crash does not lose orders, menu changes or settings.
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

interface DbShape {
  orders: Order[];
  menuItems: MenuItem[];
  tables: Table[];
  settings: ShopSettings;
}

function loadDb(): Partial<DbShape> | null {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      // File exists but is unreadable/corrupt: keep a copy so nothing is lost, then start fresh
      try {
        fs.copyFileSync(DB_FILE, `${DB_FILE}.corrupt-${Date.now()}`);
      } catch {
        // ignore
      }
      console.error('db.json could not be read, starting fresh (backup kept):', err);
    }
    return null;
  }
}

// A clean table has no demo order attached
const freshTables = (): Table[] =>
  INITIAL_TABLES.map((t): Table => ({
    id: t.id,
    name: t.name,
    area: t.area,
    seats: t.seats,
    status: 'free',
  }));

const saved = loadDb();
// First run: no demo orders, all tables free. Menu and settings start from defaults.
let orders: Order[] = saved?.orders ?? [];
let menuItems: MenuItem[] = saved?.menuItems ?? [...INITIAL_MENU_ITEMS];
let tables: Table[] = saved?.tables ?? freshTables();
let settings: ShopSettings = { ...DEFAULT_SETTINGS, ...(saved?.settings ?? {}) };

function writeDbNow() {
  const data: DbShape = { orders, menuItems, tables, settings };
  const tmp = `${DB_FILE}.tmp`;
  // Write to a temp file then rename, so a power cut can never leave a half-written db.json
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, DB_FILE);
}

let saveTimer: NodeJS.Timeout | null = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      writeDbNow();
    } catch (err) {
      console.error('FAILED to save db.json:', err);
    }
  }, 200);
}

// Daily backup copy (keeps the last 14 days)
function dailyBackup() {
  try {
    if (!fs.existsSync(DB_FILE)) return;
    const dir = path.join(DATA_DIR, 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(dir, `db-${day}.json`);
    if (!fs.existsSync(target)) fs.copyFileSync(DB_FILE, target);
    const files = fs.readdirSync(dir).filter((f) => f.startsWith('db-')).sort();
    files.slice(0, Math.max(0, files.length - 14)).forEach((f) => fs.unlinkSync(path.join(dir, f)));
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

function shutdown() {
  try {
    writeDbNow();
  } catch {
    // ignore
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Connected SSE clients for instant live push
interface Client {
  id: number;
  res: Response;
}
let sseClients: Client[] = [];

const broadcastEvent = (eventType: string, data: unknown) => {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
};

// SSE endpoint for live order updates
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = Date.now();
  sseClients.push({ id: clientId, res });

  // Send current snapshot immediately
  res.write(`event: init\ndata: ${JSON.stringify({ orders, tables, settings })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Orders API
app.get('/api/orders', (_req: Request, res: Response) => {
  res.json({ success: true, orders });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const newOrder: Order = req.body;
  if (!newOrder || !newOrder.items) {
    res.status(400).json({ error: 'Invalid order data' });
    return;
  }

  // Ensure unique id and sequential order number
  // The server always assigns the number so two phones can never get the same one
  const orderNumber = orders.length > 0 ? Math.max(...orders.map((o) => o.orderNumber)) + 1 : 101;
  const orderToSave: Order = {
    ...newOrder,
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    orderNumber,
    createdAt: newOrder.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  orders.unshift(orderToSave);

  // If order has a designated table, update table status & cumulative total
  if (orderToSave.tableId) {
    tables = tables.map((t): Table => {
      if (t.id === orderToSave.tableId) {
        const prevTotal = (t.status === 'occupied' || t.status === 'bill_requested') && t.currentTotal ? t.currentTotal : 0;
        return {
          ...t,
          status: 'occupied',
          activeOrderId: orderToSave.id,
          currentTotal: Math.round((prevTotal + orderToSave.total) * 100) / 100,
          seatedAt: t.seatedAt || new Date().toISOString(),
        };
      }
      return t;
    });
    broadcastEvent('tables_updated', tables);
  }

  persist();
  broadcastEvent('order_created', orderToSave);
  res.status(201).json({ success: true, order: orderToSave, tables });
});

app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  let updatedOrder: Order | null = null;
  orders = orders.map((o): Order => {
    if (o.id === id) {
      const updated: Order = { ...o, ...updates, updatedAt: new Date().toISOString() };
      updatedOrder = updated;
      return updated;
    }
    return o;
  });

  if (!updatedOrder) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Only if status marked cancelled, free up the table if dine-in
  if (updates.status === 'cancelled' && (updatedOrder as Order).tableId) {
    const tableId = (updatedOrder as Order).tableId;
    tables = tables.map((t): Table => {
      if (t.id === tableId && t.activeOrderId === id) {
        return { ...t, status: 'free', activeOrderId: undefined, currentTotal: undefined, seatedAt: undefined };
      }
      return t;
    });
    broadcastEvent('tables_updated', tables);
  }

  persist();
  broadcastEvent('order_updated', updatedOrder);
  res.json({ success: true, order: updatedOrder, tables });
});

app.delete('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  orders = orders.filter((o) => o.id !== id);
  persist();
  broadcastEvent('order_deleted', { id });
  res.json({ success: true });
});

// Menu API
app.get('/api/menu', (_req: Request, res: Response) => {
  res.json({ success: true, items: menuItems });
});

app.post('/api/menu', (req: Request, res: Response) => {
  const newItem: MenuItem = req.body;
  if (!newItem || !newItem.name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  const itemToSave = { ...newItem, id: newItem.id || `item-${Date.now()}` };
  menuItems.push(itemToSave);
  persist();
  broadcastEvent('menu_updated', menuItems);
  res.status(201).json({ success: true, item: itemToSave });
});

app.patch('/api/menu/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  let updatedItem: MenuItem | null = null;
  menuItems = menuItems.map((item): MenuItem => {
    if (item.id === id) {
      const updated: MenuItem = { ...item, ...updates };
      updatedItem = updated;
      return updated;
    }
    return item;
  });
  if (!updatedItem) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  persist();
  broadcastEvent('menu_updated', menuItems);
  res.json({ success: true, item: updatedItem });
});

// Tables API
app.get('/api/tables', (_req: Request, res: Response) => {
  res.json({ success: true, tables });
});

app.patch('/api/tables/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  let updatedTable: Table | null = null;
  tables = tables.map((t): Table => {
    if (t.id === id) {
      const updated: Table = { ...t, ...updates };
      if (updates.status === 'free') {
        updated.activeOrderId = undefined;
        updated.currentTotal = undefined;
        updated.seatedAt = undefined;
      }
      updatedTable = updated;
      return updated;
    }
    return t;
  });
  if (!updatedTable) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  persist();
  broadcastEvent('tables_updated', tables);
  res.json({ success: true, table: updatedTable, tables });
});

// Settings API
app.get('/api/settings', (_req: Request, res: Response) => {
  res.json({ success: true, settings });
});

app.patch('/api/settings', (req: Request, res: Response) => {
  settings = { ...settings, ...req.body };
  persist();
  broadcastEvent('settings_updated', settings);
  res.json({ success: true, settings });
});

// Health check (useful to test from a phone: http://SERVER:3000/api/health)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, orders: orders.length, time: new Date().toISOString() });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  dailyBackup();
  setInterval(dailyBackup, 6 * 60 * 60 * 1000);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\nRiver POS server running (${isProd ? 'production' : 'development'})`);
    console.log(`  On this computer:  http://localhost:${PORT}`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const n of list ?? []) {
        if (n.family === 'IPv4' && !n.internal) {
          console.log(`  From phones (same Wi-Fi):  http://${n.address}:${PORT}`);
        }
      }
    }
    console.log(`  Data file: ${DB_FILE}\n`);
  });
}

startServer();
