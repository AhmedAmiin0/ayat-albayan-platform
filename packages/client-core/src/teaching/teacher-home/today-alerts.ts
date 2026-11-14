import { isOpenLesson, localDateIn, type LessonView, type NotificationItem, type PushKind } from '@ab/shared';
import { reportStage, teacherCanConfirm, type ReportStage } from '../lessons/index.js';
import type { AlertKind } from './home-prefs.js';
import { lessonChange, type LessonChange } from './lesson-changes.js';

// «تنبيهات اليوم» (owner 2026-11-14): HER actionable items for today, derived from the lessons and
// the bell rows the home already reads. Pure: web and mobile list the same alerts from one clock.

const SOON_MS = 15 * 60_000;

export type TodayAlert =
  | { kind: 'soon'; key: string; lesson: LessonView; minutes: number }
  | { kind: 'confirm'; key: string; lesson: LessonView }
  | { kind: 'changed'; key: string; lesson: LessonView; change: LessonChange }
  | { kind: 'report'; key: string; lesson: LessonView; stage: Exclude<ReportStage, 'done'> }
  | { kind: 'bell'; key: string; item: NotificationItem };

export interface AlertInput {
  /** Her lessons (any window holding today); only today's in `tz` count. */
  lessons: readonly LessonView[];
  /** The bell's newest page; only unread rows from today count. */
  bell: readonly NotificationItem[];
  now: Date;
  tz: string;
  /** The kinds she switched on («تخصيص»). */
  shown: Readonly<Record<AlertKind, boolean>>;
}

/** Bell kinds about money or the inbox never reach this list (privacy; the bell still has them). */
const BELL_SHOWN: Readonly<Record<PushKind, boolean>> = {
  new_lead: false,
  new_message: false,
  reminder_failed: false,
  lesson_needs_confirmation: true,
  report_submitted: true,
  payment_due: false,
  new_student: true,
  meeting_invite: true,
  google_sync_alert: false,
  channel_message: true,
  commission_earned: false,
  lesson_rescheduled: true,
  lesson_cancelled: true,
  course_paused: true,
  course_resumed: true,
  payment_received: false,
};

const until = (l: LessonView, now: Date) => Date.parse(l.starts_at) - now.getTime();
const isSoon = (l: LessonView, now: Date) =>
  isOpenLesson(l.status) && until(l, now) > 0 && until(l, now) <= SOON_MS;

type Make = (l: LessonView, i: AlertInput) => TodayAlert | null;

const confirm: Make = (l, i) =>
  teacherCanConfirm(l, i.now) ? { kind: 'confirm', key: `confirm:${l.id}`, lesson: l } : null;

const LESSON_ALERTS: readonly (readonly [AlertKind, Make])[] = [
  ['soon', (l, i) => (isSoon(l, i.now) ? soon(l, i.now) : null)],
  ['confirm', confirm],
  ['changed', (l, i) => changed(l, i.lessons)],
  ['report', (l, i) => report(l, i.now)],
];

const soon = (l: LessonView, now: Date): TodayAlert => ({
  kind: 'soon',
  key: `soon:${l.id}`,
  lesson: l,
  minutes: Math.ceil(until(l, now) / 60_000),
});

function changed(l: LessonView, all: readonly LessonView[]): TodayAlert | null {
  const change = lessonChange(l, all);
  return change ? { kind: 'changed', key: `changed:${l.id}`, lesson: l, change } : null;
}

function report(l: LessonView, now: Date): TodayAlert | null {
  const stage = reportStage(l, now);
  if (stage === null || stage === 'done') return null;
  return { kind: 'report', key: `report:${l.id}`, lesson: l, stage };
}

const onDay = (iso: string, i: AlertInput, day: string) => localDateIn(new Date(iso), i.tz) === day;

const bellAlerts = (i: AlertInput, day: string): TodayAlert[] =>
  i.bell
    .filter((n) => n.read_at === null && BELL_SHOWN[n.kind] && onDay(n.created_at, i, day))
    .map((item) => ({ kind: 'bell', key: `bell:${item.id}`, item }));

/** Today's alerts kind by kind (soon, confirm, changed, report, bell), each in start order. */
export function todayAlerts(input: AlertInput): TodayAlert[] {
  const day = localDateIn(input.now, input.tz);
  const today = [...input.lessons]
    .filter((l) => onDay(l.starts_at, input, day))
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const lessonAlerts = LESSON_ALERTS.filter(([kind]) => input.shown[kind]).flatMap(([, make]) =>
    today.map((l) => make(l, input)).filter((a): a is TodayAlert => a !== null),
  );
  return input.shown.bell ? [...lessonAlerts, ...bellAlerts(input, day)] : lessonAlerts;
}
