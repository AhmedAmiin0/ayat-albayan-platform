import { addCalendarMonths, dateText } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { locale } from '@/lib/i18n/locale';


/** `YYYY-MM` → «أكتوبر 2026». */
export function monthLabel(month: string): string {
  const first = new Date(`${addCalendarMonths(month, 0)}T00:00:00Z`);
  return dateText(first, { tz: 'UTC', locale }, { month: 'long', year: 'numeric' });
}

/** The last `count` months up to `latest`, newest first (`value` kept even when older). */
export function monthOptions(latest: string, opts: { count: number; value: string }): string[] {
  const months = Array.from({ length: opts.count }, (_, i) =>
    addCalendarMonths(latest, -i).slice(0, 7),
  );
  return months.includes(opts.value) ? months : [...months, opts.value];
}

type Props = { label: string; value: string; latest: string; onChange: (month: string) => void };

/** A month picker as a select (rule 6: no free-text dates; Safari has no `type=month`). */
export function MonthSelect({ label, value, latest, onChange }: Props) {
  return (
    <Field label={label}>
      {(p) => (
        <Select {...p} className="w-auto" value={value} onChange={(e) => onChange(e.target.value)}>
          {monthOptions(latest, { count: 24, value }).map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
