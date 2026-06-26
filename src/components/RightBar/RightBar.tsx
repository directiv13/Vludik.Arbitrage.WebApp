'use client';

import { useState } from 'react';
import { useSubscriptionStore } from '@/store/subscriptionStore';

export function RightBar() {
  const setSymbol = useSubscriptionStore((s) => s.setSymbol);
  const setExchanges = useSubscriptionStore((s) => s.setExchanges);

  const [symbolInput, setSymbolInput] = useState('BTCUSDT');
  const [buyInput, setBuyInput] = useState('Binance');
  const [sellInput, setSellInput] = useState('Aster');

  const canSubscribe =
    symbolInput.trim() !== '' && buyInput.trim() !== '' && sellInput.trim() !== '';

  const handleSubscribe = () => {
    if (!canSubscribe) return;
    // Set exchanges first, then symbol: the hook subscribes once the symbol is non-empty.
    setExchanges(buyInput.trim(), sellInput.trim());
    setSymbol(symbolInput.trim().toUpperCase());
  };

  return (
    <aside className="flex w-[336px] flex-none flex-col overflow-hidden rounded-xl border border-bd bg-panel">
      <div className="flex flex-1 flex-col gap-[15px] overflow-auto p-[15px]">
        <Field
          label="Symbol"
          value={symbolInput}
          onChange={setSymbolInput}
          placeholder="BTCUSDT"
        />
        <Field
          label="Buy exchange"
          value={buyInput}
          onChange={setBuyInput}
          placeholder="Binance"
        />
        <Field
          label="Sell exchange"
          value={sellInput}
          onChange={setSellInput}
          placeholder="Aster"
        />
      </div>

      <div className="flex-none border-t border-bd2 p-[13px]">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={!canSubscribe}
          className="w-full rounded-[10px] bg-brand py-[13px] text-sm font-bold tracking-[0.01em] text-white shadow-[0_4px_18px_rgba(123,97,255,.32)] transition-all duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          Subscribe
        </button>
      </div>
    </aside>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function Field({ label, value, onChange, placeholder }: FieldProps) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[11px] text-tx2">{label}</span>
      <div className="flex items-center rounded-[9px] border border-bd bg-panel2 px-[13px] transition-colors focus-within:border-brand">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full flex-1 bg-transparent py-[11px] font-mono text-[15px] text-tx outline-none placeholder:text-tx3"
        />
      </div>
    </label>
  );
}
