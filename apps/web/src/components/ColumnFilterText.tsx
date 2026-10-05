import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { SearchInput } from './ui/search-input';

export const FILTER_DEBOUNCE_MS = 300;

export interface ColumnFilterTextProps {
  /** «تصفية حسب {col}». */
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  className?: string | undefined;
}

/**
 * A column's search box: typing reports the trimmed text after 300ms of quiet. A value changed
 * from outside (cleared, back button) replaces the draft; our own echo does not, so a server
 * round trip never eats what was typed meanwhile. Leaving the box sends a pending draft at once,
 * so «عرض النتائج» right after typing keeps it.
 */
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
