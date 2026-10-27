import {
  attendanceStyle,
  counted,
  leadStatusStyle,
  lessonStatusStyle,
  lessonWhenText,
  RIYADH_TZ,
  warnsTrialDate,
  type StatusStyle,
  type TrialDateRow,
  type TrialHistory,
  type ClockCycle,
  type TrialOutcome,
} from '@ab/shared';
import { whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { isolate } from '@/core/ui/primitives/Ltr';

/** The admin's and the salesperson's clock (as useViewerTz outside the teacher tree): the academy's. */
const VIEWER_TZ = RIYADH_TZ;

/** Each outcome in the existing status grammar (docs/07 §6): saffron only where a report is due. */
export const trialOutcomeStyle: Record<TrialOutcome, StatusStyle> = {
  upcoming: leadStatusStyle.trial_booked,
  awaiting: lessonStatusStyle.scheduled,
  attended: attendanceStyle.on_time,
  absent: lessonStatusStyle.no_show,
  cancelled: lessonStatusStyle.cancelled_by_admin,
  moved: lessonStatusStyle.rescheduled,
};

interface WhenLines {
  /** In the viewer's zone. */
  when: string;
  /** «بتوقيت الأسرة: …» when the family's zone differs; else null. */
  family: string | null;
}

/** An instant in the viewer's zone, and in the family's when it differs (rule 6). */
export function whenLines(startsAt: string, familyTz: string, cycle: ClockCycle): WhenLines {
  const at = new Date(startsAt);
  // Every time says its zone (docs/07 principle 7): the viewer reads the academy's clock.
  const when = `${whenIn(at, VIEWER_TZ, cycle)} ${t.schedule.riyadhTime}`;
  const familyAt = whenIn(at, familyTz, cycle);
  // Another zone name on the same clock (Asia/Kuwait vs Riyadh) adds nothing.
  if (lessonWhenText(at, familyTz, locale) === lessonWhenText(at, VIEWER_TZ, locale)) return { when, family: null };
  return { when, family: t.trialDate.familyTime.replace('{time}', familyAt) };
}

/** «فاطمة، الأحد 4 أكتوبر 17:00»: who picked it and when; «غير معروف» for an imported row. */
export function pickedLine(row: TrialDateRow, cycle: ClockCycle): string {
  return t.trialDate.pickedAt
    .replace('{name}', row.picked_by ? isolate(row.picked_by) : t.trialDate.unknownPicker)
    .replace('{when}', whenIn(new Date(row.picked_at), VIEWER_TZ, cycle));
}

/** «موعدان» … the history header's count. */
export const countText = (count: number): string => counted(t.trialDate.count, count);

/** From the 3rd date on: «سيكون هذا الموعد التجريبي رقم {n}…» (a warning, never a block). */
export function warnLine(count: number): string | null {
  return warnsTrialDate(count) ? t.trialDate.warn.replace('{n}', String(count + 1)) : null;
}

/** What the new date does: moves the upcoming trial (its time), or books a new trial lesson. */
export function effectLine(history: TrialHistory, cycle: ClockCycle): string {
  const upcoming = history.upcoming_id ? history.items.find((r) => r.lesson_id === history.upcoming_id) : undefined;
  if (!history.upcoming_id) return t.trialDate.newLesson;
  const when = upcoming ? whenLines(upcoming.starts_at, history.family_tz, cycle).when : '';
  return t.trialDate.moves.replace('{when}', when);
}
