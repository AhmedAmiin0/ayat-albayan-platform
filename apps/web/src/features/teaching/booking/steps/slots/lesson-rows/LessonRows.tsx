import { patchRow, rowsFromPicks, type LessonRow } from '@ab/client-core';
import type { SlotsResponse } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { draftPicks, withPicks, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { t } from '@/lib/i18n/i18n';
import { LessonRow as RowView, type RowsCtx } from './LessonRow';
import { rowErrors, rowPicks } from './row-state';
import { rowBounds, rowsOpen, slotsWindow } from './row-window';
import { useRowSlots } from './use-row-slots';

export interface LessonRowsProps {
  draft: BookingDraft;
  onChange: (patch: Pick<BookingDraft, 'startsAt' | 'extra'>) => void;
}

const EMPTY: LessonRow = { date: '', time: '' };
/** The admin adds at most a day per weekday. */
const MAX_DAYS = 7;

/** The first rows: the draft's picks, padded to the course's days a week (else one row). */
function firstRows(draft: BookingDraft): LessonRow[] {
  const picks = draftPicks(draft);
  return rowsFromPicks(picks, draft.tz, draft.course?.perWeek ?? Math.max(picks.length, 1));
}

interface At {
  rows: readonly LessonRow[];
  opens: string;
  now: Date;
}

/** The teacher's zone: the slot data's, else the picked teacher's. */
const teacherZone = (data: SlotsResponse | undefined, teacher: BookingDraft['teacher']): string | null =>
  data?.teacher_tz ?? teacher?.tz ?? null;

/** The rows' slot data (the teacher's grid over their week) and what every row shares. */
function useRowsCtx(draft: BookingDraft, at: At) {
  const { rows, opens, now } = at;
  const { tz, teacher } = draft;
  const window = slotsWindow(rows, { opens, tz, now });
  const slots = useRowSlots({
    teacherId: teacher?.id ?? '',
    durationMin: draft.durationMin,
    studentIds: draft.students.map((s) => s.id),
    excludeLessonId: draft.trialDate?.upcomingId ?? undefined,
    window,
  });
  const ctx: RowsCtx = {
    tz,
    durationMin: draft.durationMin,
    now,
    data: slots.data,
    teacherTz: teacherZone(slots.data, teacher),
    bounds: rowBounds(opens),
    until: window.to.toISOString(),
  };
  return { ctx, failed: slots.isError };
}

/**
 * A package's lesson days (owner 2026-11-07: «date input and a time input»): per day a date and a
 * time in the family's zone. A course has exactly its days a week; the admin adds and removes
 * days. Each time is read against the slot grid's data (free, busy, outside the availability,
 * past) with the nearest free times to take; the series check below decides (SeriesCheck).
 */
export function LessonRows({ draft, onChange }: LessonRowsProps) {
  const [now] = useState(() => new Date());
  const { tz, course } = draft;
  const [rows, setRows] = useState(() => firstRows(draft));
  const opens = rowsOpen(course?.startsOn ?? null, tz, now);
  const { ctx, failed } = useRowsCtx(draft, { rows, opens, now });
  const update = (next: LessonRow[]) => {
    setRows(next);
    onChange(withPicks(rowPicks(next, { tz, now })));
  };
  const removable = course === null && rows.length > 1;
  const errors = rowErrors(rows, { tz, now });
  return (
    <div className="grid gap-3">
      <p className="text-xs text-ink-2">{t.lessonTimes.intro.replace('{city}', tzCity(tz) ?? tz)}</p>
      {failed && <FormAlert>{t.booking.slotsError}</FormAlert>}
      {rows.map((row, i) => (
        <RowView
          key={i}
          at={{ index: i, row, error: errors.get(i) }}
          ctx={ctx}
          on={{
            change: (p) => update(patchRow(rows, i, p)),
            remove: removable ? () => update(rows.filter((_, j) => j !== i)) : undefined,
          }}
        />
      ))}
      {course === null && rows.length < MAX_DAYS && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="justify-self-start"
          onClick={() => update([...rows, { ...EMPTY }])}
        >
          {t.lessonTimes.addDay}
        </Button>
      )}
    </div>
  );
}
