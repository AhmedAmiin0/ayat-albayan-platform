import type { SlotsResponse, SlotView } from '@ab/shared';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Icon } from '@/components/ui/display/icon';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { useBookingMode } from '@/features/teaching/booking/mode';
import { t } from '@/lib/i18n/i18n';
import { slotsQuery } from '../api';
import { SlotGrid, type SlotGridProps } from '../grid/SlotGrid';
import { bookableWindow, currentWeekStart } from './slots';
import { addDays, dayMonthLabel, weekStart, zonedParts } from '../tz';
import { useViewerTz } from '@/lib/viewer-tz';

export interface SlotPickerProps {
  teacherId: string;
  durationMin: number;
  /** Students whose own lessons count as conflicts (GET /booking/slots `studentIds`). */
  studentIds: readonly string[];
  /** Zone of the small times (the first student's). */
  studentTz: string;
  /** starts_at of the picked slot; also opens the grid on that slot's week. */
  value: string | null;
  /** A package's other picked starts: highlighted as picked too (multi-pick). */
  also?: readonly string[];
  onPick: (slot: SlotView) => void;
  /** With nothing picked yet, open on this instant's week (the lesson being moved). */
  near?: string;
  /** «تغيير أيام الحلقات»: the course (subscription id) whose own lessons are not shown busy. */
  excludeCourse?: string;
  /** «موعد تجريبي جديد»: the trial being moved is not shown busy. */
  excludeLessonId?: string | undefined;
}

const cityOf = (tz: string) => tzCity(tz) ?? tz;

/** The viewer's week to open on: the picked slot's, else `near`'s, never before this week. */
function openingWeek(anchor: string | undefined, week0: { first: string; tz: string }): string {
  const { first, tz } = week0;
  if (!anchor) return first;
  const week = weekStart(zonedParts(new Date(anchor), tz).date);
  return week > first ? week : first;
}

/** Week-by-week picker over GET /booking/slots (R-SCH-06, R-SCH-07): no past weeks, no typing. */
export function SlotPicker(props: SlotPickerProps) {
  const { teacherId, durationMin, studentIds, studentTz, value, also, onPick, near, excludeCourse, excludeLessonId } = props;
  const [now] = useState(() => new Date());
  const tz = useViewerTz();
  const first = currentWeekStart(now, tz);
  const [week, setWeek] = useState(() => openingWeek(value ?? near, { first, tz }));
  const range = bookableWindow(week, now, tz);
  const slots = useQuery({
    ...slotsQuery({ teacherId, durationMin, studentIds, excludeCourse, excludeLessonId, from: range?.from ?? now, to: range?.to ?? now }, useBookingMode()),
    enabled: range !== null,
  });
  const legend =
    studentTz === tz
      ? t.schedule.zoneNote.replace('{city}', cityOf(tz))
      : t.booking.slotLegendViewer.replace('{city}', cityOf(studentTz));

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
      <SlotsBody query={slots} grid={{ week, studentTz, value, also, onPick }} />
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
