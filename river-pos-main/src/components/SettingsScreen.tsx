import React, { useState } from 'react';
import { ShopSettings, MenuItem } from '../types';
import { Save, Plus, Edit2, Check, Store, Coffee, Volume2, Sparkles, Sliders, ShieldCheck } from 'lucide-react';
import { sounds } from '../utils/sound';

const LICENSE_CODES = [
  { code: 'RIVER-2026-A', label: 'Phase 1' },
  { code: 'RIVER-2026-B', label: 'Phase 2' },
  { code: 'RIVER-2026-C', label: 'Phase 3' },
] as const;

const getCurrentLicense = () => {
  const month = new Date().getMonth();
  const phaseIndex = Math.floor(month / 4) % LICENSE_CODES.length;
  return LICENSE_CODES[phaseIndex];
};

interface SettingsScreenProps {
  settings: ShopSettings;
  menuItems: MenuItem[];
  onUpdateSettings: (settings: Partial<ShopSettings>) => void;
  onAddMenuItem: (item: MenuItem) => void;
  onUpdateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  menuItems,
  onUpdateSettings,
  onAddMenuItem,
  onUpdateMenuItem,
}) => {
  const [shopName, setShopName] = useState(settings.shopName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [currency, setCurrency] = useState(settings.currency);
  const [soundAlerts, setSoundAlerts] = useState(settings.soundAlerts);

  // New Menu Item form
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemGreekName, setNewItemGreekName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'coffee' | 'beer' | 'tea' | 'food' | 'espresso' | 'iced' | 'hot' | 'tea_beverage' | 'bakery' | 'snacks'>('coffee');
  const [newItemPrice, setNewItemPrice] = useState('3.00');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Editing price state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<string>('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<'active' | 'inactive'>('inactive');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('river_pos_license_code');
      if (saved) {
        setLicenseStatus(saved.trim().toUpperCase() === getCurrentLicense().code.toUpperCase() ? 'active' : 'inactive');
      }
    }
  }, []);

  const currentLicense = getCurrentLicense();

  const handleLicenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = licenseInput.trim().toUpperCase();

    if (!normalized) {
      setLicenseError('Enter the current license code.');
      return;
    }

    if (normalized === currentLicense.code.toUpperCase()) {
      setLicenseStatus('active');
      setLicenseError('');
      if (typeof window !== 'undefined') {
        localStorage.setItem('river_pos_license_code', normalized);
      }
      return;
    }

    setLicenseStatus('inactive');
    setLicenseError(`Invalid code. Use the current active code: ${currentLicense.code}`);
  };

  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      shopName,
      tagline,
      address,
      phone,
      currency,
      theme: 'monochrome',
      soundAlerts,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCreateMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const price = parseFloat(newItemPrice) || 2.50;
    const newItem: MenuItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      greekName: newItemGreekName.trim() || undefined,
      category: newItemCategory,
      basePrice: price,
      description: newItemDesc.trim() || 'Freshly crafted specialty coffee item.',
      available: true,
      hasSugarOption: newItemCategory === 'espresso' || newItemCategory === 'iced' || newItemCategory === 'hot',
      hasMilkOption: newItemCategory === 'espresso' || newItemCategory === 'hot' || newItemCategory === 'iced',
      hasIceOption: newItemCategory === 'iced' || newItemCategory === 'espresso',
      allowedSizes: ['regular'],
    };

    onAddMenuItem(newItem);
    setIsAddingItem(false);
    setNewItemName('');
    setNewItemGreekName('');
    setNewItemPrice('3.00');
    setNewItemDesc('');
  };

  const handleSavePrice = (id: string) => {
    const parsed = parseFloat(editPriceVal);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateMenuItem(id, { basePrice: parsed });
    }
    setEditingItemId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-neutral-100 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded border border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-900">
              TERMINAL CONFIGURATION & MENU MANAGEMENT
            </h1>
            <p className="text-xs text-neutral-500">
              Customize shop identity, pricing, sound notifications, and design theme
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12">
          <div className="bg-white p-5 rounded border border-neutral-200">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-neutral-700" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-900">
                  License Control
                </h2>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  licenseStatus === 'active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {licenseStatus === 'active' ? 'Active' : 'Needs Activation'}
              </span>
            </div>

            <div className="mt-4">
              <form onSubmit={handleLicenseSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={licenseInput}
                    onChange={(e) => {
                      setLicenseInput(e.target.value);
                      if (licenseError) setLicenseError('');
                    }}
                    placeholder="Enter current code"
                    className="flex-1 text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800"
                  >
                    Save
                  </button>
                </div>
                {licenseError && <p className="text-[11px] font-medium text-red-600">{licenseError}</p>}
              </form>
            </div>
          </div>
        </div>

        {/* Left Column: General Shop Settings */}
        <div className="lg:col-span-5 space-y-6">
          <form
            onSubmit={handleSaveShopSettings}
            className="bg-white p-5 rounded border border-neutral-200 space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
              <Store size={18} className="text-neutral-700" />
              <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                Coffee Shop Profile
              </h2>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Shop Name / Επωνυμία
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Tagline / Υπότιτλος
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 border border-neutral-300 rounded focus:border-neutral-900 focus:outline-none"
              />
            </div>

            {/* Sound Effects */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded border border-neutral-200">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-neutral-700" />
                <span className="text-xs font-semibold">Kitchen Barista Sound Chimes</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => sounds.playOrderChime()}
                  className="px-2 py-1 text-[11px] font-semibold border border-neutral-300 rounded hover:bg-neutral-100"
                >
                  Test Bell
                </button>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="w-4 h-4 accent-neutral-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded bg-neutral-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-800"
            >
              <Save size={14} />
              <span>{savedSuccess ? 'Settings Saved Successfully!' : 'Save Shop Settings'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Menu Item Management & Pricing */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-5 rounded border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Coffee size={18} className="text-neutral-700" />
                <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wide">
                  Menu Catalog & Live Pricing ({menuItems.length} items)
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingItem(!isAddingItem)}
                className="py-1.5 px-3 bg-neutral-900 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-neutral-800"
              >
                <Plus size={14} />
                <span>{isAddingItem ? 'Cancel' : 'Add New Item'}</span>
              </button>
            </div>

            {/* New Item Form */}
            {isAddingItem && (
              <form
                onSubmit={handleCreateMenuItem}
                className="p-4 bg-neutral-50 rounded border border-neutral-300 space-y-3 text-xs"
              >
                <div className="font-bold text-xs uppercase text-neutral-700">
                  Add New Product to Menu
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Item Name (English)</label>
                    <input
                      type="text"
                      placeholder="e.g. Iced Match Latte"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      required
                      className="w-full p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Greek Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Άις Μάτσα Λάτε"
                      value={newItemGreekName}
                      onChange={(e) => setNewItemGreekName(e.target.value)}
                      className="w-full p-2 border border-neutral-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value as any)}
                      className="w-full p-2 border border-neutral-300 rounded bg-white"
                    >
                      <option value="coffee">Coffee</option>
                      <option value="beer">Beer</option>
                      <option value="tea">Tea</option>
                      <option value="food">Food</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Base Price ({currency})</label>
                    <input
                      type="number"
                      step="0.10"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      required
                      className="w-full p-2 border border-neutral-300 rounded bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of the drink or snack..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="w-full p-2 border border-neutral-300 rounded bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingItem(false)}
                    className="py-1.5 px-3 border border-neutral-300 rounded font-semibold hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-1.5 px-4 bg-neutral-900 text-white rounded font-bold hover:bg-neutral-800"
                  >
                    Save to Menu
                  </button>
                </div>
              </form>
            )}

            {/* Menu List */}
            <div className="divide-y divide-neutral-200 max-h-[500px] overflow-y-auto">
              {menuItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 truncate">{item.name}</span>
                      {item.greekName && (
                        <span className="text-neutral-500 text-[11px] truncate">
                          ({item.greekName})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 capitalize">
                      Category: {item.category.replace('_', ' ')}
                    </div>
                  </div>

                  {/* Price Edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.10"
                          value={editPriceVal}
                          onChange={(e) => setEditPriceVal(e.target.value)}
                          className="w-16 p-1 border border-neutral-400 rounded font-mono font-bold text-right"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSavePrice(item.id)}
                          className="p-1 bg-neutral-900 text-white rounded"
                        >
                          <Check size={12} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditPriceVal(item.basePrice.toFixed(2));
                        }}
                        className="font-mono font-bold tabular-nums cursor-pointer hover:bg-neutral-100 px-2 py-1 rounded border border-transparent hover:border-neutral-300 flex items-center gap-1"
                        title="Click to edit price"
                      >
                        <span>{item.basePrice.toFixed(2)} {currency}</span>
                        <Edit2 size={11} className="text-neutral-400" />
                      </div>
                    )}

                    {/* Available toggle */}
                    <button
                      type="button"
                      onClick={() => onUpdateMenuItem(item.id, { available: !item.available })}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                        item.available
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-red-50 text-red-800 border-red-300'
                      }`}
                    >
                      {item.available ? 'In Stock' : '86’d'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
