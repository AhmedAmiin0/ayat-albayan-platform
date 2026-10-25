import type { GoogleFound, GoogleTeacherMapRow } from '@ab/shared';
import { useId } from 'react';
import { Select } from '@/components/ui/form/select';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { fill } from './google-format';
import { NO_CALENDAR } from './google-input';

const s = t.googleSync.teachers;

/** The teacher's name, then the confirmed calendar as a chip, or the discovery's suggestion. */
export function TeacherState({ row }: { row: GoogleTeacherMapRow }) {
  return (
    <div className="grid min-w-0 gap-1">
      <p className="text-sm font-semibold break-words">{row.name}</p>
      {row.confirmed_at ? (
        <StatusChip size="sm" tone="ok" glyph="fill" label={row.calendar_name ?? s.none} className="justify-self-start" />
      ) : (
        row.suggestion && <p className="text-xs text-ink-3 break-words">{fill(s.suggested, { name: row.suggestion.name })}</p>
      )}
    </div>
  );
}

interface SelectProps {
  row: GoogleTeacherMapRow;
  calendars: readonly GoogleFound[];
  value: string;
  onChange: (value: string) => void;
}

/** The discovered calendars + «بدون تقويم»; a confirmed calendar no longer discovered stays listed. */
export function CalendarSelect({ row, calendars, value, onChange }: SelectProps) {
  const id = useId();
  const stale = row.calendar_id !== null && !calendars.some((c) => c.id === row.calendar_id);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="sr-only">
        {`${s.calendar}: ${row.name}`}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          {s.pick}
        </option>
        <option value={NO_CALENDAR}>{s.none}</option>
        {stale && row.calendar_id && <option value={row.calendar_id}>{row.calendar_name ?? row.calendar_id}</option>}
        {calendars.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
