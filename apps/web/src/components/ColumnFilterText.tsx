import { useEffect, useRef, useState } from 'react';
import { t } from '@/lib/i18n';
import { Input } from './ui/input';

export const FILTER_DEBOUNCE_MS = 300;

export interface ColumnFilterTextProps {
  /** «تصفية حسب {col}». */
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * A column's search box: typing reports the trimmed text after 300ms of quiet. A value changed
 * from outside (cleared, back button) replaces the draft; our own echo does not, so a server
 * round trip never eats what was typed meanwhile.
 */
export function ColumnFilterText({ ariaLabel, value, onChange }: ColumnFilterTextProps) {
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

  const change = (next: string) => {
    setDraft(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSent(next.trim());
      onChange(next.trim());
    }, FILTER_DEBOUNCE_MS);
  };

  return (
    <Input
      type="search"
      aria-label={ariaLabel}
      placeholder={t.table.searchPlaceholder}
      value={draft}
      onChange={(e) => change(e.target.value)}
      className="min-h-10 w-40 sm:min-h-9 sm:w-44"
    />
  );
}
