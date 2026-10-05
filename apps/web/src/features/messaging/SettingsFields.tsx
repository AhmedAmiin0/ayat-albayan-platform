import { useId, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';

export interface SettingRowProps {
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
export function SettingRow({ label, hint, error, children }: SettingRowProps) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className="grid gap-x-6 gap-y-2 border-b border-rule py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-ink-3">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-danger">
            <NuqtaGlyph shape="struck" />
            <span>{error}</span>
          </p>
        )}
      </div>
      <div className="sm:justify-self-end">
        {children({ id, ...(describedBy ? { 'aria-describedby': describedBy } : {}), ...(error ? { 'aria-invalid': true as const } : {}) })}
      </div>
    </div>
  );
}

export interface NumberFieldProps {
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
export function NumberField({ label, value, onChange, hint, error, list, disabled }: NumberFieldProps) {
  return (
    <SettingRow label={label} hint={hint} error={error}>
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

export interface CheckFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

/** An on/off setting: a checkbox drawn as a switch (still a checkbox to assistive tech and tests). */
export function CheckField({ label, checked, onChange, hint }: CheckFieldProps) {
  return (
    <SettingRow label={label} hint={hint}>
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
