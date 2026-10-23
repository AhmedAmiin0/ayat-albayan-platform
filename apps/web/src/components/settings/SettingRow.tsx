import { useId, type ReactNode } from 'react';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { cn } from '@/lib/utils';

/** What the settings page adds to a row: a notes line, a reset button and danger styling. */
export interface RowExtras {
  /** Under the hint: «معدَّل», who changed it last. */
  extra?: ReactNode;
  /** Beside the control: the per-field reset. */
  actions?: ReactNode;
  /** A wrong value reaches families or hides a warning. */
  danger?: boolean;
}

export interface SettingRowProps extends RowExtras {
  label: string;
  hint?: string;
  error?: string;
  /** Renders the control with its id and the hint/error wiring. */
  children: (control: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode;
}

/**
 * One setting as a row (owner, 2026-10-05): the label and a one-line hint at the inline-start, the
 * control at the inline-end; on phones the control drops under the words.
 */
export function SettingRow({ label, hint, error, extra, actions, danger, children }: SettingRowProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div
      data-danger={danger ? 'true' : undefined}
      className={cn(
        'grid gap-x-6 gap-y-2 border-b border-rule py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center',
        danger && 'border-s-[3px] border-s-danger bg-danger-soft ps-3',
      )}
    >
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-3">
            {hint}
          </p>
        )}
        {extra}
        {error && (
          <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
            <NuqtaGlyph shape="struck" />
            <span>{error}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 sm:justify-self-end">
        {actions}
        {children({ id, ...(describedBy ? { 'aria-describedby': describedBy } : {}), ...(error ? { 'aria-invalid': true as const } : {}) })}
      </div>
    </div>
  );
}
