import { useId, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
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

export interface NumberFieldProps extends RowExtras {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** A list of numbers («24، 72») instead of one. */
  list?: boolean;
  disabled?: boolean;
}

/** A count (hours, weeks, lessons, minutes): LTR digits, never a time of day (rule 6). */
export function NumberField({ label, value, onChange, hint, error, list, disabled, ...row }: NumberFieldProps) {
  return (
    <SettingRow label={label} hint={hint} error={error} {...row}>
      {(p) => (
        <Input
          {...p}
          type={list ? 'text' : 'number'}
          inputMode="numeric"
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[140px] tabular-nums"
        />
      )}
    </SettingRow>
  );
}

export interface CheckFieldProps extends RowExtras {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

/** An on/off setting: a checkbox drawn as a switch (still a checkbox to assistive tech and tests). */
export function CheckField({ label, checked, onChange, hint, ...row }: CheckFieldProps) {
  return (
    <SettingRow label={label} hint={hint} {...row}>
      {(p) => (
        // A real checkbox (role, name, keyboard) laid invisibly over a drawn track and knob.
        <span className="relative inline-flex">
          <input
            {...p}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0"
          />
          <span
            aria-hidden="true"
            className="block h-6 w-11 rounded-full border border-rule-input bg-sunk transition-colors duration-150 peer-checked:border-lapis-fill peer-checked:bg-lapis-fill peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lapis"
          />
          {/* The knob starts at the inline-start (right in RTL) and slides to the end when ON. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute start-[3px] top-[3px] size-[18px] rounded-full bg-ink-3 transition-transform duration-150 peer-checked:bg-white rtl:peer-checked:-translate-x-5 ltr:peer-checked:translate-x-5"
          />
        </span>
      )}
    </SettingRow>
  );
}
