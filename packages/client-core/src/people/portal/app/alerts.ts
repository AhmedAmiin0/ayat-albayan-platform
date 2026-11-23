import {
  calendarDaysBetween,
  localDateIn,
  notificationKind,
  type AnyPushKind,
  type NotificationItem,
} from '@ab/shared';
import { z } from 'zod';

// «الإشعارات» of the family app (canvas Alerts): where a bell row opens (its report, the child's
// lessons, the package, the teacher chat or the week) and the rows under «اليوم» / «أمس» / «هذا
// الأسبوع» / «أقدم». A row's `data` is untrusted (NotificationItem): every id is parsed before it
// becomes a target.

export type AlertTarget =
  | { screen: 'report'; studentId: string; reportId: string }
  | { screen: 'child'; studentId: string }
  | { screen: 'package'; studentId: string }
  | { screen: 'chat'; studentId: string }
  | { screen: 'live'; studentId: string; lessonId: string }
  | { screen: 'schedule' };

type Data = NotificationItem['data'];
type Reader = (data: Data) => AlertTarget | null;

const reportData = z.object({ studentId: z.uuid(), reportId: z.uuid() });
const studentData = z.object({ studentId: z.uuid() });
const liveData = z.object({ studentId: z.uuid(), lessonId: z.uuid() });

const toReport: Reader = (data) => {
  const parsed = reportData.safeParse(data);
  return parsed.success ? { screen: 'report', ...parsed.data } : null;
};

/** The child's own screen (or the package, or the chat), else the week when no child is named. */
const toStudent =
  (screen: 'child' | 'package' | 'chat'): Reader =>
  (data) => {
    const parsed = studentData.safeParse(data);
    return parsed.success ? { screen, studentId: parsed.data.studentId } : { screen: 'schedule' };
  };

/** «بدأت الحلقة»: that lesson's way in; without a lesson id, the child's page. */
const toLive: Reader = (data) => {
  const parsed = liveData.safeParse(data);
  return parsed.success ? { screen: 'live', ...parsed.data } : toStudent('child')(data);
};

/** The kinds a family's bell receives (family pushes, schedule notices, the chat); others: none. */
const TARGETS: Partial<Record<AnyPushKind, Reader>> = {
  report_sent: toReport,
  lesson_starting: toStudent('child'),
  // The teacher is in; the tap goes straight to the lesson.
  lesson_live: toLive,
  lesson_request_declined: toStudent('child'),
  lesson_rescheduled: toStudent('child'),
  lesson_cancelled: toStudent('child'),
  course_paused: toStudent('child'),
  course_resumed: toStudent('child'),
  payment_received: toStudent('package'),
  // A message in the child's chat with the teacher opens that chat.
  channel_message: toStudent('chat'),
};

/** Where tapping the row goes; null = it only marks the row read. */
export const alertTarget = (item: Pick<NotificationItem, 'kind' | 'data'>): AlertTarget | null =>
  TARGETS[item.kind]?.(item.data) ?? null;

const pushData = z.record(z.string(), z.string());

/** A tapped push (its `data` as the native module hands it over): the same target as its row. */
export function pushTarget(data: unknown): AlertTarget | null {
  const parsed = pushData.safeParse(data);
  if (!parsed.success) return null;
  const kind = notificationKind(parsed.data);
  return kind ? alertTarget({ kind, data: parsed.data }) : null;
}

export const ALERT_GROUPS = ['today', 'yesterday', 'week', 'older'] as const;
export type AlertGroup = (typeof ALERT_GROUPS)[number];

/** Days back (on the viewer's calendar) → its group; the first whose limit holds. */
const GROUP_LIMITS: readonly (readonly [number, AlertGroup])[] = [
  [0, 'today'],
  [1, 'yesterday'],
  [6, 'week'],
];

const groupOf = (days: number): AlertGroup =>
  GROUP_LIMITS.find(([limit]) => days <= limit)?.[1] ?? 'older';

export interface AlertSection {
  group: AlertGroup;
  items: NotificationItem[];
}

/** The rows (newest first) under their group, empty groups left out. */
export function alertSections(
  items: readonly NotificationItem[],
  now: Date,
  tz: string,
): AlertSection[] {
  const today = localDateIn(now, tz);
  const back = (item: NotificationItem): number =>
    calendarDaysBetween(localDateIn(new Date(item.created_at), tz), today);
  return ALERT_GROUPS.map((group) => ({
    group,
    items: items.filter((item) => groupOf(back(item)) === group),
  })).filter((section) => section.items.length > 0);
}
