'use client';

import { ReactNode } from 'react';

interface NumericFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Static text rendered inside the field on the right (e.g. `%`, `BTC`). */
  suffix?: ReactNode;
  /** Muted hint to the right of the label (e.g. `now 0.41%`, `≈ $64,200`). */
  hint?: ReactNode;
  /** Inline error message; also switches the field border to red. */
  error?: string;
  placeholder?: string;
}

/**
 * Labelled numeric text input with an optional right-of-label hint and in-field
 * suffix (ported from the design's field control). The value is a raw string —
 * parsing/validation happens at the form boundary, not here. Shows a red border
 * plus a message when `error` is set.
 */
export function NumericField({
  label,
  value,
  onChange,
  suffix,
  hint,
  error,
  placeholder,
}: NumericFieldProps) {
  return (
    <div>
      <div className="mb-[7px] flex items-baseline justify-between">
        <span className="text-[11px] text-tx2">{label}</span>
        {hint != null && <span className="text-[10.5px] text-tx3">{hint}</span>}
      </div>
      <div
        className={`flex items-center rounded-[9px] border bg-panel2 px-[13px] ${
          error ? 'border-red' : 'border-bd focus-within:border-brand'
        }`}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full flex-1 border-none bg-transparent py-[11px] font-mono text-[15px] text-tx outline-none placeholder:text-tx3"
        />
        {suffix != null && (
          <span className="ml-2 font-mono text-[13px] text-tx3">{suffix}</span>
        )}
      </div>
      {error && <div className="mt-[6px] text-[10.5px] text-red">{error}</div>}
    </div>
  );
}
