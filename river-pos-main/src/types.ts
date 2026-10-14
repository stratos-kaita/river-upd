export type OrderType = 'dine_in' | 'takeaway';

export type SugarOption = 'sketos' | 'metrios' | 'glykos' | 'brown' | 'stevia';
export type MilkOption = 'none' | 'whole' | 'oat' | 'almond' | 'cold_foam' | 'evaporated';
export type SizeOption = 'single' | 'double' | 'regular' | 'large';
export type IceOption = 'normal' | 'extra' | 'light' | 'no_ice';

export interface ModifierSelection {
  size: SizeOption;
  sugar: SugarOption;
  sugarSpoons?: number;
  milk: MilkOption;
  ice: IceOption;
  extraShots: number;
  decaf: boolean;
  syrup?: 'none' | 'vanilla' | 'caramel' | 'hazelnut';
  whippedCream?: boolean;
  notes?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  greekName?: string;
  category: 'coffee' | 'beer' | 'tea' | 'food' | 'espresso' | 'iced' | 'hot' | 'tea_beverage' | 'bakery' | 'snacks';
  basePrice: number;
  description: string;
  available: boolean;
  popular?: boolean;
  defaultModifiers?: Partial<ModifierSelection>;
  allowedSizes?: SizeOption[];
  hasMilkOption?: boolean;
  hasSugarOption?: boolean;
  hasIceOption?: boolean;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  greekName?: string;
  unitPrice: number;
  quantity: number;
  modifiers: ModifierSelection;
  totalPrice: number;
  paid?: boolean;
}

export type OrderStatus = 'incoming' | 'brewing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'split';
export type PaymentStatus = 'pending' | 'paid';

export interface Order {
  id: string;
  orderNumber: number;
  type: OrderType;
  tableId?: string;
  tableName?: string;
  customerName?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  createdAt: string; // ISO string
  updatedAt: string;
  notes?: string;
  tenderedCash?: number;
  changeDue?: number;
}

export type TableArea = 'indoor' | 'patio' | 'bar';
export type TableStatus = 'free' | 'occupied' | 'bill_requested';

export interface Table {
  id: string;
  name: string;
  area: TableArea;
  seats: number;
  status: TableStatus;
  activeOrderId?: string;
  currentTotal?: number;
  seatedAt?: string;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  currency: string;
  taxRate: number; // e.g. 0.13 for 13%
  theme: 'monochrome';
  soundAlerts: boolean;
  kdsAutoScroll: boolean;
  defaultOrderType: OrderType;
}

export type ActiveScreen = 'pos' | 'kds' | 'tables' | 'history' | 'settings';

export type UserRole = 'waiter' | 'boss';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}
