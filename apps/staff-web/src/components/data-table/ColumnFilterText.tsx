import { useEffect, useRef, useState } from 'react';
import { t, SearchInput } from '@ab/web-kit';

export const FILTER_DEBOUNCE_MS = 300;

export interface ColumnFilterTextProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  className?: string | undefined;
}

/** Debounced 300ms; our own echo never replaces the draft, and blur sends a pending draft. */
export function ColumnFilterText({ ariaLabel, value, onChange, placeholder, className }: ColumnFilterTextProps) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const [sent, setSent] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (value !== sent) {
      setSent(value);
      setDraft(value);
    }
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (next: string) => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setSent(next.trim());
    onChange(next.trim());
  };
  const change = (next: string) => {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(next), FILTER_DEBOUNCE_MS);
  };

  return (
    <SearchInput
      aria-label={ariaLabel}
      placeholder={placeholder ?? t.table.searchPlaceholder}
      enterKeyHint="search"
      value={draft}
      onChange={(e) => change(e.target.value)}
      onBlur={() => timer.current !== undefined && send(draft)}
      // Enter applies a pending draft at once (the same box on every list; no form around it).
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (draft.trim() !== sent) send(draft);
      }}
      className={className}
    />
  );
}
