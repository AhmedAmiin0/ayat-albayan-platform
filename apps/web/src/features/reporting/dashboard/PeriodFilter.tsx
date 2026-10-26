import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Input } from '@/components/ui/form/input';
import { Label } from '@/components/ui/form/label';
import { dateLabel } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { rangeError } from './search';
import type { DayRange } from './types';

export interface PeriodFilterProps {
  value: DayRange;
  onChange: (next: DayRange) => void;
}

/**
 * The one filter row above everything it scopes (dataviz): «الفترة» من / إلى, Riyadh days. A range
 * the API would refuse is caught here with the API's own wording (dashboard.error.*).
 */
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<keyof typeof t.dashboard.error | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = rangeError(draft);
    setError(code);
    if (!code) onChange(draft);
  };
  const field = (key: keyof DayRange, label: string) => (
    <div className="grid gap-1">
      <span className="flex items-baseline gap-2">
        <Label htmlFor={`dash-${key}`} className="text-xs text-ink-2">
          {label}
        </Label>
        <span id={`dash-${key}-label`} className="text-xs text-ink-3">
          {dateLabel(draft[key])}
        </span>
      </span>
      <Input
        id={`dash-${key}`}
        type="date"
        dir="ltr"
        value={draft[key]}
        aria-invalid={error ? true : undefined}
        aria-describedby={[`dash-${key}-label`, error && 'dash-range-error'].filter(Boolean).join(' ')}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        className="w-40 tabular-nums sm:min-h-8"
      />
    </div>
  );
  return (
    <form onSubmit={submit} aria-label={t.dashboard.range} className="flex flex-wrap items-end gap-3">
      {field('from', t.dashboard.from)}
      {field('to', t.dashboard.to)}
      <Button type="submit" variant="secondary" size="sm">
        {t.common.search}
      </Button>
      {error && (
        <p id="dash-range-error" role="alert" className="basis-full text-xs text-danger">
          {t.dashboard.error[error]}
        </p>
      )}
    </form>
  );
}
