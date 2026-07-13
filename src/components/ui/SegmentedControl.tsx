'use client';

import { ReactNode } from 'react';

export interface SegmentedOption<T extends string> {
  label: ReactNode;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
}

const SEG_BASE =
  'flex-1 whitespace-nowrap rounded-[7px] px-2 py-[7px] text-xs font-semibold transition-all duration-150';
const SEG_ON = 'bg-brand text-white shadow-[0_2px_10px_rgba(123,97,255,.35)]';
const SEG_OFF = 'bg-transparent text-tx2 hover:text-tx';

/**
 * Shared pill segmented control (ported from the design's segmented buttons and
 * matching the Header's strategy-mode toggle). Generic over its value union so
 * the active pill is always a valid option.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-1 rounded-[9px] border border-bd bg-panel2 p-[3px]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`${SEG_BASE} ${active ? SEG_ON : SEG_OFF}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
