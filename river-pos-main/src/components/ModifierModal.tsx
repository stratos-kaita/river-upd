import React, { useState } from 'react';
import { MenuItem, ModifierSelection, SugarOption, MilkOption, SizeOption, IceOption } from '../types';
import { X, Plus, Minus, Check } from 'lucide-react';

interface ModifierModalProps {
  item: MenuItem;
  currency: string;
  isMonochrome: boolean;
  onClose: () => void;
  onAddToCart: (item: MenuItem, modifiers: ModifierSelection, quantity: number, totalUnitPrice: number) => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  item,
  currency,
  isMonochrome,
  onClose,
  onAddToCart,
}) => {
  const [size, setSize] = useState<SizeOption>(item.defaultModifiers?.size || 'regular');
  const [sugar, setSugar] = useState<SugarOption>(item.defaultModifiers?.sugar || 'sketos');
  const [milk, setMilk] = useState<MilkOption>(item.defaultModifiers?.milk || 'none');
  const [ice, setIce] = useState<IceOption>(item.defaultModifiers?.ice || 'normal');
  const [extraShots, setExtraShots] = useState<number>(item.defaultModifiers?.extraShots || 0);
  const [decaf, setDecaf] = useState<boolean>(item.defaultModifiers?.decaf || false);
  const [syrup, setSyrup] = useState<'none' | 'vanilla' | 'caramel' | 'hazelnut'>(
    item.defaultModifiers?.syrup || 'none'
  );
  const [whippedCream, setWhippedCream] = useState<boolean>(item.defaultModifiers?.whippedCream || false);
  const [notes, setNotes] = useState<string>(item.defaultModifiers?.notes || '');
  const [quantity, setQuantity] = useState<number>(1);

  // Price calculations
  let calculatedUnitPrice = item.basePrice;

  // Size adjustments
  if (size === 'double' && item.category === 'espresso') {
    calculatedUnitPrice += 0.60;
  } else if (size === 'large') {
    calculatedUnitPrice += 0.80;
  }

  // Milk adjustment (Oat/Almond specialty milk +0.40)
  if (milk === 'oat' || milk === 'almond') {
    calculatedUnitPrice += 0.40;
  }

  // Extra shots (+0.60 per shot)
  calculatedUnitPrice += extraShots * 0.60;

  // Syrups (+0.40)
  if (syrup !== 'none') {
    calculatedUnitPrice += 0.40;
  }

  // Whipped cream (+0.50)
  if (whippedCream) {
    calculatedUnitPrice += 0.50;
  }

  const totalPrice = calculatedUnitPrice * quantity;

  const handleAdd = () => {
    onAddToCart(
      item,
      {
        size,
        sugar,
        milk,
        ice,
        extraShots,
        decaf,
        syrup,
        whippedCream,
        notes: notes.trim() || undefined,
      },
      quantity,
      calculatedUnitPrice
    );
    onClose();
  };

  const allowedSizes: SizeOption[] = item.allowedSizes || ['regular'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg shadow-2xl overflow-hidden border ${
          isMonochrome
            ? 'bg-white border-neutral-900 text-neutral-900'
            : 'bg-[#fff8f5] border-[#4A2C1D] text-[#1f1b18]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{item.name}</h2>
            {item.greekName && (
              <p className="text-xs text-neutral-500 font-medium">{item.greekName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Modifier Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          {/* Size Selection */}
          {allowedSizes.length > 1 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Size / Μέγεθος
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {allowedSizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`py-2 px-3 border rounded text-xs font-semibold capitalize transition-all ${
                      size === s
                        ? isMonochrome
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    {s === 'single' && 'Single / Μονός'}
                    {s === 'double' && 'Double / Διπλός (+0.60€)'}
                    {s === 'regular' && 'Regular / Κανονικό'}
                    {s === 'large' && 'Large / Μεγάλο (+0.80€)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sugar / Sweetness Level (Critical for Greek & Specialty Coffee) */}
          {item.hasSugarOption && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Sweetness / Ζάχαρη
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {[
                  { key: 'sketos', label: 'Σκέτος', sub: 'Zero' },
                  { key: 'metrios', label: 'Μέτριος', sub: 'Medium' },
                  { key: 'glykos', label: 'Γλυκός', sub: 'Sweet' },
                  { key: 'brown', label: 'Καστανή', sub: 'Brown' },
                  { key: 'stevia', label: 'Stevia', sub: 'Diet' },
                ].map(({ key, label, sub }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSugar(key as SugarOption)}
                    className={`py-2 px-2 border rounded text-center transition-all ${
                      sugar === key
                        ? isMonochrome
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">{label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{sub}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Milk Choice */}
          {item.hasMilkOption && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Milk Choice / Γάλα
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { key: 'none', label: 'Χωρίς Γάλα (Black)', price: '' },
                  { key: 'whole', label: 'Κανονικό (Whole)', price: '' },
                  { key: 'cold_foam', label: 'Αφρόγαλα Κρύο (Crema)', price: '' },
                  { key: 'oat', label: 'Βρώμης (Oat Milk)', price: '+0.40€' },
                  { key: 'almond', label: 'Αμυγδάλου (Almond)', price: '+0.40€' },
                  { key: 'evaporated', label: 'Εβαπορέ (Evaporated)', price: '' },
                ].map(({ key, label, price }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMilk(key as MilkOption)}
                    className={`py-2 px-2.5 border rounded text-left transition-all ${
                      milk === key
                        ? isMonochrome
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-semibold leading-tight">{label}</div>
                    {price && <div className="text-[10px] opacity-80">{price}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ice Level */}
          {item.hasIceOption && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Ice Level / Πάγος
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'normal', label: 'Κανονικός' },
                  { key: 'extra', label: 'Πολύς' },
                  { key: 'light', label: 'Λίγος' },
                  { key: 'no_ice', label: 'Χωρίς' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIce(key as IceOption)}
                    className={`py-1.5 px-2 border rounded text-center text-xs font-medium transition-all ${
                      ice === key
                        ? isMonochrome
                          ? 'bg-neutral-900 text-white border-neutral-900 font-bold'
                          : 'bg-[#4A2C1D] text-white border-[#4A2C1D] font-bold'
                        : 'border-neutral-200 bg-white hover:border-neutral-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extras / Upgrades (Only for coffee & specialty drinks) */}
          {(item.hasSugarOption || item.hasMilkOption || item.category === 'espresso' || item.category === 'coffee') && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                Extras & Roast
              </label>
            <div className="space-y-2">
              {/* Extra Shots */}
              <div className="flex items-center justify-between p-2.5 border border-neutral-200 rounded bg-white">
                <div>
                  <div className="font-semibold text-xs">Extra Espresso Shot (+0.60€)</div>
                  <div className="text-[11px] text-neutral-500">Add an extra kick of espresso</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtraShots(Math.max(0, extraShots - 1))}
                    disabled={extraShots <= 0}
                    className="w-8 h-8 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="font-bold tabular-nums text-sm w-4 text-center">
                    {extraShots}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraShots(extraShots + 1)}
                    className="w-8 h-8 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Decaf Toggle */}
              <button
                type="button"
                onClick={() => setDecaf(!decaf)}
                className={`w-full flex items-center justify-between p-2.5 border rounded text-left transition-all ${
                  decaf
                    ? isMonochrome
                      ? 'border-neutral-900 bg-neutral-100 font-semibold'
                      : 'border-[#4A2C1D] bg-[#f6ece7] font-semibold'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Decaf Blend (Χωρίς Καφεΐνη)</div>
                  <div className="text-[11px] text-neutral-500">Swiss Water processed arabica</div>
                </div>
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border ${
                    decaf
                      ? isMonochrome
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  {decaf && <Check size={12} />}
                </div>
              </button>

              {/* Syrups */}
              <div className="flex items-center justify-between p-2.5 border border-neutral-200 rounded bg-white">
                <div>
                  <div className="text-xs font-semibold">Syrup Flavor (+0.40€)</div>
                </div>
                <select
                  value={syrup}
                  onChange={(e) => setSyrup(e.target.value as 'none' | 'vanilla' | 'caramel' | 'hazelnut')}
                  className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white"
                >
                  <option value="none">None</option>
                  <option value="caramel">Caramel</option>
                  <option value="vanilla">Vanilla</option>
                  <option value="hazelnut">Hazelnut</option>
                </select>
              </div>

              {/* Whipped Cream */}
              <button
                type="button"
                onClick={() => setWhippedCream(!whippedCream)}
                className={`w-full flex items-center justify-between p-2.5 border rounded text-left transition-all ${
                  whippedCream
                    ? isMonochrome
                      ? 'border-neutral-900 bg-neutral-100 font-semibold'
                      : 'border-[#4A2C1D] bg-[#f6ece7] font-semibold'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">Whipped Cream / Σαντιγί (+0.50€)</div>
                </div>
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border ${
                    whippedCream
                      ? isMonochrome
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-[#4A2C1D] text-white border-[#4A2C1D]'
                      : 'border-neutral-300 bg-white'
                  }`}
                >
                  {whippedCream && <Check size={12} />}
                </div>
              </button>
            </div>
          </div>
          )}

          {/* Custom Barista Instruction */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
              Barista Note / Σχόλιο Barista
            </label>
            <input
              type="text"
              placeholder="e.g. Extra cold glass, brown sugar on side..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 border border-neutral-300 rounded bg-white focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Footer: Quantity & Add Button */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 border border-neutral-300 rounded bg-white p-1">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-9 h-9 rounded flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="font-bold tabular-nums text-base w-6 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-9 h-9 rounded flex items-center justify-center hover:bg-neutral-100"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add to Ticket Button */}
          <button
            type="button"
            onClick={handleAdd}
            className={`flex-1 h-11 px-4 rounded font-bold text-sm text-white flex items-center justify-between transition-transform active:scale-[0.98] ${
              isMonochrome
                ? 'bg-neutral-900 hover:bg-neutral-800'
                : 'bg-[#4A2C1D] hover:bg-[#382014]'
            }`}
          >
            <span>Add to Order</span>
            <span className="tabular-nums font-mono text-base">
              {totalPrice.toFixed(2)} {currency}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
