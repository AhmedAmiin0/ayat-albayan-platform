import {
  attendanceStyle,
  counted,
  leadStatusStyle,
  lessonStatusStyle,
  lessonWhenText,
  warnsTrialDate,
  type StatusStyle,
  type TrialDateRow,
  type TrialHistory,
  type TrialOutcome,
} from '@ab/shared';
import { whenIn, type ViewerClock } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { isolate } from '@/core/ui/primitives/Ltr';

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
export function whenLines(startsAt: string, familyTz: string, viewer: ViewerClock): WhenLines {
  const at = new Date(startsAt);
  // Every time says its zone (docs/07 principle 7): the viewer's own (docs/34).
  const when = `${whenIn(at, viewer.tz, viewer.cycle)} ${t.schedule.viewerTime}`;
  const familyAt = whenIn(at, familyTz, viewer.cycle);
  // Another zone name on the same clock (Asia/Kuwait vs Riyadh) adds nothing.
  const same = lessonWhenText(at, familyTz, locale) === lessonWhenText(at, viewer.tz, locale);
  if (same) return { when, family: null };
  return { when, family: t.trialDate.familyTime.replace('{time}', familyAt) };
}

/** «فاطمة، الأحد 4 أكتوبر 17:00»: who picked it and when; «غير معروف» for an imported row. */
export function pickedLine(row: TrialDateRow, viewer: ViewerClock): string {
  return t.trialDate.pickedAt
    .replace('{name}', row.picked_by ? isolate(row.picked_by) : t.trialDate.unknownPicker)
    .replace('{when}', whenIn(new Date(row.picked_at), viewer.tz, viewer.cycle));
}

/** «موعدان» … the history header's count. */
export const countText = (count: number): string => counted(t.trialDate.count, count);

/** From the 3rd date on: «سيكون هذا الموعد التجريبي رقم {n}…» (a warning, never a block). */
export function warnLine(count: number): string | null {
  return warnsTrialDate(count) ? t.trialDate.warn.replace('{n}', String(count + 1)) : null;
}

/** What the new date does: moves the upcoming trial (its time), or books a new trial lesson. */
export function effectLine(history: TrialHistory, viewer: ViewerClock): string {
  const upcoming = history.upcoming_id ? history.items.find((r) => r.lesson_id === history.upcoming_id) : undefined;
  if (!history.upcoming_id) return t.trialDate.newLesson;
  const when = upcoming ? whenLines(upcoming.starts_at, history.family_tz, viewer).when : '';
  return t.trialDate.moves.replace('{when}', when);
}
