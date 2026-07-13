'use client';

import { ReactNode, useMemo, useState } from 'react';
import Fuse from 'fuse.js';

interface DropdownProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  /** Small slot rendered before the value in the trigger (e.g. a BUY/SELL tag). */
  prefix?: ReactNode;
  /** Render the value and options in the mono font (used for symbols). */
  mono?: boolean;
  /** Show a fuzzy-search filter input at the top of the menu. */
  searchable?: boolean;
  /** Stretch the trigger and menu to the container width (rail); otherwise compact. */
  fullWidth?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Placeholder shown in the search input. */
  searchPlaceholder?: string;
}

const CHEVRON = (
  <svg width="10" height="10" viewBox="0 0 10 6" fill="none" aria-hidden>
    <path d="M1 1l4 4 4-4" stroke="#969cab" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * Shared select dropdown ported from the design's `Select` control. A trigger
 * button opens a floating menu of options; the active option shows a brand dot.
 * When `searchable`, a Fuse.js fuzzy filter narrows the options client-side.
 */
export function Dropdown({
  value,
  options,
  onChange,
  prefix,
  mono = false,
  searchable = false,
  fullWidth = false,
  placeholder = '—',
  disabled = false,
  searchPlaceholder = 'Search…',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const fuse = useMemo(
    () => new Fuse(options, { threshold: 0.3, ignoreLocation: true }),
    [options],
  );
  const shown = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    return fuse.search(q).map((r) => r.item);
  }, [query, options, fuse]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const select = (option: string) => {
    onChange(option);
    close();
  };

  const valueFont = mono ? 'font-mono' : '';

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className={`flex items-center gap-2 rounded-lg border border-bd bg-panel2 text-tx transition-colors hover:border-brand/60 disabled:cursor-not-allowed disabled:opacity-50 ${
          fullWidth ? 'w-full justify-between px-[13px] py-[11px]' : 'px-[11px] py-[7px]'
        }`}
      >
        {prefix}
        <span
          className={`${valueFont} font-semibold ${fullWidth ? 'text-[14px]' : 'text-[12.5px]'} ${
            value ? 'text-tx' : 'text-tx3'
          }`}
        >
          {value || placeholder}
        </span>
        {CHEVRON}
      </button>

      {open && (
        <>
          {/* click-outside overlay */}
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className={`absolute top-[calc(100%+6px)] z-50 rounded-[10px] border border-bd bg-elev p-[5px] shadow-[0_14px_40px_rgba(0,0,0,.55)] ${
              fullWidth ? 'left-0 right-0' : 'left-0 w-40'
            }`}
          >
            {searchable && (
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="mb-[5px] w-full rounded-[7px] border border-bd bg-panel2 px-[10px] py-[7px] font-mono text-[12.5px] text-tx outline-none placeholder:text-tx3 focus:border-brand"
              />
            )}
            <div className="max-h-64 overflow-auto">
              {shown.length === 0 ? (
                <div className="px-[10px] py-2 text-[12.5px] text-tx3">No matches</div>
              ) : (
                shown.map((option) => {
                  const active = option === value;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => select(option)}
                      className={`flex w-full items-center justify-between rounded-[7px] px-[10px] py-2 text-left text-[12.5px] transition-colors hover:bg-panel2 ${
                        active ? 'text-tx' : 'text-tx2'
                      }`}
                    >
                      <span className={mono ? 'font-mono' : ''}>{option}</span>
                      <span className={`text-[8px] text-brand ${active ? 'opacity-100' : 'opacity-0'}`}>
                        ●
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
