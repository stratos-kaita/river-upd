import React, { useState } from 'react';
import { UserAccount, UserRole } from '../types';
import { ShieldCheck, UserCheck, Lock, Delete, ArrowRight, X } from 'lucide-react';
import { sounds } from '../utils/sound';

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  { id: 'waiter-1', name: 'Waiter Staff', role: 'waiter', pin: '1234' },
  { id: 'boss-1', name: 'Boss Account', role: 'boss', pin: '9999' },
];

interface LoginModalProps {
  currentAccount: UserAccount | null;
  targetRole?: UserRole; // if prompted specifically to unlock boss features
  isOpen: boolean;
  onClose: () => void;
  onLogin: (account: UserAccount) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  currentAccount,
  targetRole,
  isOpen,
  onClose,
  onLogin,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(targetRole || 'waiter');
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      if (targetRole) {
        setSelectedRole(targetRole);
      }
      setPin('');
      setErrorMessage('');
    }
  }, [isOpen, targetRole]);

  if (!isOpen) return null;

  const targetAccount = DEFAULT_ACCOUNTS.find((acc) => acc.role === selectedRole)!;

  const handleKeyPress = (num: string) => {
    sounds.playTap();
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMessage('');

      // Auto-validate on 4 digits
      if (nextPin.length === 4) {
        validatePin(nextPin, selectedRole);
      }
    }
  };

  const handleBackspace = () => {
    sounds.playTap();
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    sounds.playTap();
    setPin('');
    setErrorMessage('');
  };

  const validatePin = (inputPin: string, roleToTest: UserRole) => {
    const acc = DEFAULT_ACCOUNTS.find((a) => a.role === roleToTest);
    if (acc && inputPin === acc.pin) {
      sounds.playReadyChime();
      onLogin(acc);
      setPin('');
      setErrorMessage('');
      onClose();
    } else {
      setErrorMessage('Incorrect PIN. Please try again.');
      setPin('');
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    sounds.playReadyChime();
    const acc = DEFAULT_ACCOUNTS.find((a) => a.role === role)!;
    onLogin(acc);
    setPin('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-xl bg-white border border-neutral-300 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2">
            <Lock size={18} className="text-neutral-800" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Staff Authorization & Login
            </h2>
          </div>
          {currentAccount && (
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-neutral-800 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Role Selector Tabs */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('waiter');
                setPin('');
                setErrorMessage('');
              }}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                selectedRole === 'waiter'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'
              }`}
            >
              <UserCheck size={20} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Waiter</div>
                <div className="text-[10px] opacity-75 mt-0.5">Orders & Tables</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedRole('boss');
                setPin('');
                setErrorMessage('');
              }}
              className={`p-3 rounded-lg border-2 flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                selectedRole === 'boss'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'
              }`}
            >
              <ShieldCheck size={20} />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">Boss</div>
                <div className="text-[10px] opacity-75 mt-0.5">KDS & Catalog</div>
              </div>
            </button>
          </div>

          {/* Account Explanation */}
          <div className="text-center">
            <p className="text-xs font-semibold text-neutral-800">
              {selectedRole === 'waiter'
                ? 'Waiter Account (Access: Take Orders + Floor Tables)'
                : 'Boss Account (Access: Live Server / KDS + Catalog Management)'}
            </p>
            <p
              style={{ display: 'none' }}
              className="hidden text-[11px] text-neutral-500 mt-0.5 font-mono"
            >
              Default PIN: <strong className="text-neutral-900">{targetAccount.pin}</strong>
            </p>
          </div>

          {/* PIN Input Display */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="flex items-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    idx < pin.length
                      ? 'bg-neutral-900 border-neutral-900 scale-110'
                      : 'border-neutral-300 bg-white'
                  }`}
                />
              ))}
            </div>
            {errorMessage ? (
              <p className="text-[11px] font-bold text-red-600 mt-2">{errorMessage}</p>
            ) : (
              <p className="text-[10px] text-neutral-400 mt-2">Enter 4-digit security PIN</p>
            )}
          </div>

          {/* POS Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-12 rounded-lg bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 font-mono font-bold text-lg text-neutral-900 flex items-center justify-center transition-colors border border-neutral-200"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-12 rounded-lg bg-neutral-50 hover:bg-neutral-100 font-bold text-xs uppercase tracking-wider text-neutral-600 flex items-center justify-center border border-neutral-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-12 rounded-lg bg-neutral-100 hover:bg-neutral-200 font-mono font-bold text-lg text-neutral-900 flex items-center justify-center border border-neutral-200"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-12 rounded-lg bg-neutral-50 hover:bg-neutral-100 text-neutral-700 flex items-center justify-center border border-neutral-200"
              aria-label="Backspace"
            >
              <Delete size={18} />
            </button>
          </div>

          {/* Fast Switch / Bypass Button */}
          {/*<div className="pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => handleQuickLogin(selectedRole)}
              className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Instant Switch to {selectedRole === 'waiter' ? 'Waiter' : 'Boss'}</span>
              <ArrowRight size={14} />
            </button>
          </div>*/}
        </div>
      </div>
    </div>
  );
};
