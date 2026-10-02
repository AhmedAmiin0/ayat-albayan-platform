import type { SlotsResponse, SlotView } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { Icon } from '@/components/ui/icon';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
import { slotsQuery } from './api';
import { SlotGrid, type SlotGridProps } from './SlotGrid';
import { bookableWindow, currentWeekStart } from './slots';
import { addDays, dayMonthLabel, RIYADH_TZ, weekStart, zonedParts } from './tz';

export interface SlotPickerProps {
  teacherId: string;
  durationMin: number;
  /** Students whose own lessons count as conflicts (GET /booking/slots `studentIds`). */
  studentIds: readonly string[];
  /** Zone of the small times (the first student's). */
  studentTz: string;
  /** starts_at of the picked slot; also opens the grid on that slot's week. */
  value: string | null;
  onPick: (slot: SlotView) => void;
}

const cityOf = (tz: string) => tzCity(tz) ?? tz;

/** Week-by-week picker over GET /booking/slots (R-SCH-06, R-SCH-07): no past weeks, no typing. */
export function SlotPicker({ teacherId, durationMin, studentIds, studentTz, value, onPick }: SlotPickerProps) {
  const [now] = useState(() => new Date());
  const first = currentWeekStart(now);
  const [week, setWeek] = useState(() => (value ? weekStart(zonedParts(new Date(value), RIYADH_TZ).date) : first));
  const range = bookableWindow(week, now);
  const slots = useQuery({
    ...slotsQuery({ teacherId, durationMin, studentIds, from: range?.from ?? now, to: range?.to ?? now }),
    enabled: range !== null,
  });
  const legend =
    studentTz === RIYADH_TZ
      ? t.booking.tzNote.replace('{city}', cityOf(RIYADH_TZ))
      : t.booking.slotLegend.replace('{city}', cityOf(studentTz));

  return (
    <div className="grid gap-3">
      <div role="group" aria-label={t.booking.weekNav} className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={week <= first} onClick={() => setWeek(addDays(week, -7))}>
          <Icon name="chevron-right" />
          {t.schedule.prevWeek}
        </Button>
        <span className="px-1 text-sm font-semibold tabular-nums">
          {t.schedule.weekOf.replace('{date}', dayMonthLabel(week))}
        </span>
        <Button type="button" variant="secondary" size="sm" onClick={() => setWeek(addDays(week, 7))}>
          {t.schedule.nextWeek}
          <Icon name="chevron-left" />
        </Button>
      </div>
      <p className="text-xs text-ink-3">{legend}</p>
      <SlotsBody query={slots} grid={{ week, studentTz, value, onPick }} />
    </div>
  );
}

interface SlotsBodyProps {
  query: UseQueryResult<SlotsResponse>;
  grid: Omit<SlotGridProps, 'slots'>;
}

function SlotsBody({ query, grid }: SlotsBodyProps) {
  if (query.isError) return <FormAlert>{t.booking.slotsError}</FormAlert>;
  if (!query.data) return <p className="py-4 text-sm text-ink-3">{t.common.loading}</p>;
  if (query.data.slots.length === 0) return <p className="py-4 text-sm text-ink-2">{t.booking.noSlots}</p>;
  return (
    <div aria-busy={query.isPlaceholderData || undefined} className={query.isPlaceholderData ? 'opacity-60' : undefined}>
      <SlotGrid {...grid} slots={query.data.slots} />
    </div>
  );
}
