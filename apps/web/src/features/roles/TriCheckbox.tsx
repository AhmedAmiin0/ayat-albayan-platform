import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { CheckState } from './matrix';

export interface TriCheckboxProps {
  state: CheckState;
  /** The accessible name (there is no visible text beside the box). */
  label: string;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** A native checkbox (Space toggles, Tab reaches it) with an indeterminate «some» state. */
export function TriCheckbox({ state, label, onChange, disabled, className }: TriCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === 'some';
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      aria-checked={state === 'some' ? 'mixed' : state === 'all'}
      checked={state === 'all'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked || state === 'some')}
      className={cn('size-[18px] cursor-pointer accent-[var(--lapis)] disabled:cursor-not-allowed disabled:opacity-60', className)}
    />
  );
}
