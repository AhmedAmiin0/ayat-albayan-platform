import { zonedPartsIn } from '@ab/time';
import { Field, Input, Select, tzCity, t, ClockOptions, clockDir, useClock } from '@ab/web-kit';
import { dateLabel } from '@/features/teaching/schedule';
import { DURATION_OPTIONS, quarterTimes, type ScheduleValue } from './schedule-form';

const L = t.meetingInvites;

interface Props {
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
  /** The viewer's zone: the date and the time are picked on their own clock. */
  tz: string;
}

/** Date, a 15-minute time select (never free text, rule 6) and the duration (15–240 min). */
export function ScheduleFields({ value, onChange, tz }: Props) {
  const clock = useClock();
  const today = zonedPartsIn(new Date(), tz).date;
  const set = (patch: Partial<ScheduleValue>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={L.date} hint={dateLabel(value.date)}>
          {(p) => <Input {...p} type="date" dir="ltr" min={today} value={value.date} onChange={(e) => set({ date: e.target.value })} />}
        </Field>
        <Field label={L.time}>
          {(p) => (
            <Select {...p} dir={clockDir(clock)} value={value.time} onChange={(e) => set({ time: e.target.value })}>
              <ClockOptions times={quarterTimes(value.time)} />
            </Select>
          )}
        </Field>
      </div>
      <Field label={L.duration}>
        {(p) => (
          <Select {...p} value={String(value.durationMin)} onChange={(e) => set({ durationMin: Number(e.target.value) })}>
            {DURATION_OPTIONS.map((n) => (
              <option key={n} value={n}>{L.minutes.replace('{n}', String(n))}</option>
            ))}
          </Select>
        )}
      </Field>
      <p className="text-xs text-ink-3">{L.tzNote.replace('{tz}', tzCity(tz) ?? tz)}</p>
    </div>
  );
}
