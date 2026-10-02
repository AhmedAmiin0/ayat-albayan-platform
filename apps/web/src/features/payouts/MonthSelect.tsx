import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

const LABEL = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** `YYYY-MM` → «أكتوبر 2026». */
export function monthLabel(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  return LABEL.format(Date.UTC(y, m - 1, 1));
}

/** The last `count` months up to `latest`, newest first (`value` kept even when older). */
export function monthOptions(latest: string, opts: { count: number; value: string }): string[] {
  const [y = 0, m = 1] = latest.split('-').map(Number);
  const months = Array.from({ length: opts.count }, (_, i) =>
    new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7),
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
