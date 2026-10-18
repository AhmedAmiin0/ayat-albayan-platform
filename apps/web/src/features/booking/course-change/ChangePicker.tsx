import { counted, pickProgress, samePicks, togglePick, type CourseChangeView } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { SlotPicker } from '@/features/schedule/SlotPicker';
import { t } from '@/lib/i18n';
import { DayTimesList } from '../DayTimesList';
import { dayPicks, withPicks } from '../draft.days';
import { picksReady } from './change-body';
import { currentDaysText } from './change-text';

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
 * (tapping another slot that day replaces it), exactly the plan's days a week. «التالي» waits until
 * a day or a time differs from the current ones («لم تغيّر أي موعد بعد», the API's no_change).
 */
export function ChangePicker({ view, picks, onPicks, onNext, onBack }: ChangePickerProps) {
  const { course, student } = view;
  const zoned = { ...withPicks(picks), kind: 'package' as const, tz: course.tz };
  const listed = dayPicks(zoned);
  const unchanged = samePicks(picks, course.tz, course.days);
  const note = course.perWeek === null ? null : pickProgress(t.booking, picks.length, course.perWeek);
  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">
        {currentDaysText(course.days, course.tz)}
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
      {unchanged && <p className="text-xs text-ink-2">{t.booking.courseChange.noChange}</p>}
      <div className="flex flex-wrap justify-end gap-2.5 border-t border-rule pt-4">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            {t.booking.back}
          </Button>
        )}
        <Button type="button" disabled={!picksReady(course, picks) || unchanged} onClick={onNext}>
          {t.booking.next}
        </Button>
      </div>
    </div>
  );
}
