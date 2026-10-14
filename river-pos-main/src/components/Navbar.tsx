import React from 'react';
import { ActiveScreen, ShopSettings, UserAccount } from '../types';
import { Volume2, VolumeX, ShieldCheck, UserCheck, Lock } from 'lucide-react';

interface NavbarProps {
  currentScreen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  cartCount: number;
  openOrdersCount: number;
  settings: ShopSettings;
  currentAccount: UserAccount | null;
  onToggleSound: () => void;
  onOpenMobileCart?: () => void;
  onOpenLogin: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  onNavigate,
  cartCount,
  openOrdersCount,
  settings,
  currentAccount,
  onToggleSound,
  onOpenMobileCart,
  onOpenLogin,
  onLogout,
}) => {
  const isBoss = currentAccount?.role === 'boss';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 md:gap-6 px-3 md:px-6 py-2.5 border-b bg-white border-neutral-200 text-neutral-900 transition-colors">
      {/* Zone 1: Brand Wordmark (Only River) */}
      <div
        onClick={() => onNavigate('tables')}
        className="flex items-center cursor-pointer select-none shrink-0"
      >
        <span className="text-base md:text-lg font-extrabold tracking-tight whitespace-nowrap font-sans">
          River
        </span>
      </div>

      {/* Zone 2: Single-line Clean Nav Links */}
      <nav className="flex items-center gap-1 sm:gap-2 md:gap-4 text-xs md:text-sm font-medium overflow-x-auto no-scrollbar">
        {/* Waiter & Boss: Floor Tables (FIRST) */}
        <button
          onClick={() => onNavigate('tables')}
          className={`py-1.5 px-2 md:px-3 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentScreen === 'tables'
              ? 'bg-neutral-900 text-white font-semibold'
              : 'text-neutral-600 hover:text-neutral-900 font-medium'
          }`}
        >
          <span>Floor Tables</span>
        </button>

        {/* Waiter & Boss: Take Away (Only for Takeaway) */}
        <button
          onClick={() => onNavigate('pos')}
          className={`py-1.5 px-2 md:px-3 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            currentScreen === 'pos'
              ? 'bg-neutral-900 text-white font-semibold'
              : 'text-neutral-600 hover:text-neutral-900 font-medium'
          }`}
        >
          <span>Take Away</span>
          {cartCount > 0 && (
            <span className="text-xs opacity-90 tabular-nums font-bold">
              ({cartCount})
            </span>
          )}
        </button>

        {/* Server / KDS (Boss or Waiter PIN prompt) */}
        {isBoss ? (
          <button
            onClick={() => onNavigate('kds')}
            className={`py-1.5 px-2 md:px-3 rounded transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentScreen === 'kds'
                ? 'bg-neutral-900 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <span>Server / Bar</span>
            {openOrdersCount > 0 && (
              <span
                className={`text-[11px] font-bold px-1.5 py-0.2 rounded tabular-nums ${
                  currentScreen === 'kds'
                    ? 'bg-white text-neutral-900'
                    : 'bg-neutral-900 text-white'
                }`}
              >
                {openOrdersCount}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={() => onNavigate('kds')}
            title="Boss PIN Required"
            className="inline-flex items-center gap-1 py-1.5 px-2 md:px-2.5 rounded text-neutral-400 hover:text-neutral-700 transition-colors whitespace-nowrap shrink-0 text-xs"
          >
            <Lock size={12} />
            <span>Bar (Boss)</span>
          </button>
        )}

        {/* Catalog & Settings (Boss or Waiter PIN prompt) */}
        {isBoss ? (
          <button
            onClick={() => onNavigate('settings')}
            className={`py-1.5 px-2 md:px-3 rounded transition-colors whitespace-nowrap shrink-0 ${
              currentScreen === 'settings'
                ? 'bg-neutral-900 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Catalog
          </button>
        ) : (
          <button
            onClick={() => onNavigate('settings')}
            title="Boss PIN Required"
            className="inline-flex items-center gap-1 py-1.5 px-2 md:px-2.5 rounded text-neutral-400 hover:text-neutral-700 transition-colors whitespace-nowrap shrink-0 text-xs"
          >
            <Lock size={12} />
            <span>Catalog (Boss)</span>
          </button>
        )}

        {/* Order History */}
        {isBoss && (
          <button
            onClick={() => onNavigate('history')}
            className={`py-1.5 px-2 md:px-3 rounded transition-colors whitespace-nowrap shrink-0 ${
              currentScreen === 'history'
                ? 'bg-neutral-900 text-white font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            History
          </button>
        )}
      </nav>

      {/* Zone 3: Role Switcher & Quick Utilities */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Active Staff Account Switcher & Lock Button */}
        {currentAccount ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenLogin}
              title="Click to Switch Account (Waiter / Boss)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs font-bold transition-all ${
                isBoss
                  ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                  : 'bg-neutral-50 text-neutral-800 border-neutral-300 hover:border-neutral-500'
              }`}
            >
              {isBoss ? (
                <ShieldCheck size={14} className="text-amber-400" />
              ) : (
                <UserCheck size={14} className="text-neutral-700" />
              )}
              <span>{isBoss ? 'Boss' : 'Waiter'}</span>
              <span className="text-[10px] opacity-75 font-normal hidden sm:inline">
                (Switch)
              </span>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Lock POS Terminal / Log Out"
                aria-label="Lock Terminal"
                className="p-1.5 rounded border border-neutral-300 hover:border-neutral-500 hover:bg-neutral-100 text-neutral-600 transition-colors"
              >
                <Lock size={14} />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            title="Log in with PIN code"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-900 text-white text-xs font-bold shadow-2xs hover:bg-neutral-800 transition-all"
          >
            <Lock size={14} />
            <span>Log In</span>
          </button>
        )}

        {/* Sound Chime Toggle */}
        <button
          onClick={onToggleSound}
          title={settings.soundAlerts ? 'Mute Order Chime' : 'Enable Order Chime'}
          aria-label={settings.soundAlerts ? 'Mute Sound' : 'Enable Sound'}
          className="p-2 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
        >
          {settings.soundAlerts ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Mobile Cart Trigger */}
        {cartCount > 0 && onOpenMobileCart && (
          <button
            onClick={onOpenMobileCart}
            className="lg:hidden flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded text-white bg-neutral-900"
          >
            <span>Ticket</span>
            <span className="tabular-nums font-bold">({cartCount})</span>
          </button>
        )}
      </div>
    </header>
  );
};
