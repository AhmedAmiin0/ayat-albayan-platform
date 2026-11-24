import type { CourseChangeView } from '@ab/shared';
import { counted } from '@ab/core';
import { pickProgress, togglePick } from '@ab/schedule';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { SlotPicker } from '@/features/teaching/schedule/reschedule/SlotPicker';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { DayTimesList } from '@/features/teaching/booking/steps/slots/DayTimesList';
import { dayPicks, withPicks } from '@/features/teaching/booking/draft/draft.days';
import { picksReady } from './change-body';
import { currentDaysText } from './change-text';
import { useClock } from '@ab/web-kit/lib/clock';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

export interface ChangePickerProps {
  view: CourseChangeView;
  picks: readonly string[];
  onPicks: (picks: string[]) => void;
  onNext: () => void;
  /** Back to the caller's screen; absent means none. */
  onBack?: (() => void) | undefined;
}

/** Unchanged days are refused by the server (400 no_change), which alone knows pending rules. */
export function ChangePicker({ view, picks, onPicks, onNext, onBack }: ChangePickerProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const { course, student } = view;
  const zoned = { ...withPicks(picks), kind: 'package' as const, tz: course.tz };
  const listed = dayPicks(zoned);
  const note = course.perWeek === null ? null : pickProgress(t.booking, picks.length, course.perWeek);
  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">
        {currentDaysText(course.days, course.tz, clock)}
      </p>
      <p className="text-xs text-ink-2">{t.booking.courseChange.changeHint}</p>
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">{t.booking.courseChange.pickNew}</h3>
        <p className="text-xs text-ink-2">
          {course.perWeek === null ? t.booking.pickDayTimes : counted(t.booking.pickNDays, course.perWeek)}
        </p>
        <SlotPicker
          teacherId={course.teacherId}
          durationMin={course.durationMin}
          studentIds={[student.id]}
          studentTz={course.tz}
          value={picks[0] ?? null}
          also={picks.slice(1)}
          excludeCourse={course.subscriptionId}
          onPick={(slot) => onPicks(togglePick({ picks: [...picks], slot: slot.starts_at, tz: course.tz }))}
        />
      </section>
      <DayTimesList picks={listed} tz={course.tz} onRemove={(at) => onPicks(picks.filter((p) => p !== at))} />
      {note && <p className="text-xs text-ink-2">{note}</p>}
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-rule pt-4">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            {t.booking.back}
          </Button>
        )}
        <Button type="button" disabled={!picksReady(course, picks)} onClick={onNext}>
          {t.booking.next}
        </Button>
      </div>
    </div>
  );
}
