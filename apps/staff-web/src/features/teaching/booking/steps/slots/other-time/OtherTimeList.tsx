import { RadioChips, useClock, t } from '@ab/web-kit';
import type { OtherTimeProps } from './OtherTime';
import { OtherTimeStatus } from './OtherTimeStatus';
import { dayOptions, timeOptions } from './other-time-options';
import { useOtherTime } from './use-other-time';

/** The server's list: a day (the viewer's), then its times; picked, never typed (rule 6). */
export function OtherTimeList({ draft, onPick }: OtherTimeProps) {
  const clock = useClock();
  const { viewer, read, days, shown, slots, setDay } = useOtherTime(draft);
  if (read.isError || shown === null)
    return <OtherTimeStatus isError={read.isError} isPending={read.isPending} />;
  const byStart = new Map(slots.map((s) => [s.starts_at, s]));
  const pick = (startsAt: string) => {
    const slot = byStart.get(startsAt);
    if (slot) onPick(slot);
  };
  return (
    <div className="grid gap-3">
      <p className="text-xs text-ink-3">{t.booking.otherTimeHint}</p>
      <RadioChips
        name="other-day"
        legend={t.booking.otherTimeDay}
        options={dayOptions(days, viewer)}
        value={shown}
        onChange={setDay}
        scroll
      />
      <RadioChips
        name="other-time"
        legend={t.booking.pickTime}
        options={timeOptions(slots, { viewer, family: draft.tz }, clock)}
        value={draft.startsAt}
        onChange={pick}
      />
    </div>
  );
}
