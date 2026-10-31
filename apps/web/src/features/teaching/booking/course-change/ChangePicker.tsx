import { counted, pickProgress, togglePick, type CourseChangeView } from '@ab/shared';
import { Button } from '@/components/ui/form/button';
import { SlotPicker } from '@/features/teaching/schedule/reschedule/SlotPicker';
import { t } from '@/lib/i18n/i18n';
import { DayTimesList } from '../steps/slots/DayTimesList';
import { dayPicks, withPicks } from '../draft/draft.days';
import { picksReady } from './change-body';
import { currentDaysText } from './change-text';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface ChangePickerProps {
  view: CourseChangeView;
  picks: readonly string[];
  onPicks: (picks: string[]) => void;
  /** «التالي»: on to the check and the review. */
  onNext: () => void;
  /** «رجوع» to the caller's screen (the drawer's lesson); absent = none. */
  onBack?: (() => void) | undefined;
}

/**
 * «تغيير أيام الحلقات», step 1 (owner 2026-10-18): the current days prefilled on the teacher's slot
 * grid (the course's own lessons not busy: excludeCourse); one slot per weekday, each at its own time
 * (tapping another slot that day replaces it), exactly the plan's days a week. Unchanged days are
 * refused by the series check (400 no_change, shown with its text): only the server knows the active
 * rules a pending change keeps. The grid opens on the first prefilled pick's week (changePicks: never
 * before startsOn); «الأسبوع الماضي» pages back to the current week, so a pending change's old days
 * before its startsOn stay reachable.
 */
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
