import {
  counted,
  ESSENTIAL_OFF_TEXT,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationEntryView,
  type NotificationKey,
  type NotificationsOverview,
} from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { hhmmText } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';
import { blockerText } from '@/features/messaging/notification-catalogue/catalogue-text';
import type { RuleFailure } from './rules-api';

// The words of «الإشعارات» rows: timings as text, channels, approval, reach and save errors.

const r = () => t.notificationRules;
const fill = (text: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text);
const field = (timing: unknown, name: string): unknown =>
  timing && typeof timing === 'object' ? (timing as Record<string, unknown>)[name] : undefined;

type TimingWords = (timing: unknown, clock: Clock) => string | null;

const minutesText =
  (sameAs: string | null): TimingWords =>
  (timing) => {
    const minutes = field(timing, 'minutes_before');
    return typeof minutes === 'number' ? fill(r().timing.minutesText, { n: minutes }) : sameAs;
  };

const dayBeforeText: TimingWords = (timing, clock) => {
  const at = field(timing, 'send_at_local');
  const tm = r().timing;
  return typeof at === 'string'
    ? fill(tm.dayBeforeText, { time: hhmmText(at, clock) })
    : tm.dayBeforeSame;
};

const followUpText: TimingWords = (timing) => {
  const hours = field(timing, 'hours');
  if (!Array.isArray(hours)) return null;
  const tm = r().timing;
  const first = fill(tm.followUpText, { hours: hours.join(t.common.listSeparator) });
  const from = String(field(timing, 'slots_from_hours'));
  const slots = fill(tm.slotsText, { from, to: String(field(timing, 'slots_to_days')) });
  return `${first} · ${slots}`;
};

/** The rows with their own timing words; every other row has none (docs/36 f5). */
const TIMING_TEXT: Readonly<Record<string, TimingWords>> = {
  lesson_reminder: minutesText(null),
  teacher_lesson_reminder: (timing, clock) => minutesText(r().timing.sameAsFamily)(timing, clock),
  lesson_reminder_24h: dayBeforeText,
  follow_up_slots: followUpText,
} satisfies Partial<Record<NotificationKey, TimingWords>>;

/** A stored timing in words («قبل الحلقة بـ60 دقيقة»), clocks in the viewer's cycle (useClock); null without its own timing. */
export function timingText(key: string, timing: unknown, clock: Clock): string | null {
  const words = Object.hasOwn(TIMING_TEXT, key) ? TIMING_TEXT[key] : undefined;
  return words ? words(timing, clock) : null;
}

/** The channels a row can use, in catalogue order: its defaults, its current ones and the optional ones. */
export function availableChannels(entry: NotificationEntryView): NotificationChannel[] {
  const all = new Set<NotificationChannel>([
    ...entry.channels,
    ...(entry.rule?.channels ?? []),
    ...(entry.rule?.optional_channels ?? []),
  ]);
  return NOTIFICATION_CHANNELS.filter((ch) => all.has(ch));
}

/** Channels in words: «واتساب، جرس المنصة». */
export const channelWords = (channels: readonly NotificationChannel[]): string =>
  NOTIFICATION_CHANNELS.filter((ch) => channels.includes(ch))
    .map((ch) => t.notificationCatalogue.channels[ch])
    .join(t.common.listSeparator);

/** The template status of a row: «معتمد», «معتمد جزئيًا», «غير معتمد», «دون قالب». */
export function approvalWord(entry: Pick<NotificationEntryView, 'approval' | 'templates'>): {
  word: string;
  partly: boolean;
} {
  const a = r().approval;
  if (entry.approval === 'some') return { word: a.some, partly: true };
  if (entry.approval === 'all') return { word: a.all, partly: false };
  if (entry.approval === 'none') return { word: a.none, partly: false };
  if (entry.approval === undefined && entry.templates.length > 0) {
    const all = entry.templates.every((x) => x.status === 'approved');
    return { word: all ? a.all : a.none, partly: false };
  }
  return { word: a.noTemplate, partly: false };
}

/** The first blocker in words, including the v2 «classroom_off». */
export const reasonText = (entry: Pick<NotificationEntryView, 'blocker'>): string | null =>
  blockerText(entry);

/** The phone row's short reason («الإرسال متوقف»); the sheet keeps the long one. */
export const shortReasonText = (entry: Pick<NotificationEntryView, 'blocker'>): string | null =>
  entry.blocker ? r().shortBlockers[entry.blocker] : null;

/** Does switching this row ON reach families (guardians or leads)? */
export const isFamilyFacing = (entry: Pick<NotificationEntryView, 'audience'>): boolean =>
  entry.audience === 'guardian' || entry.audience === 'lead';

/** «سيصل إلى N ولي أمر» / «… عميلًا», from the overview's reach counts. */
export function reachText(
  entry: Pick<NotificationEntryView, 'audience'>,
  reach: NotificationsOverview['reach'],
): string {
  const f = r().familyOn;
  const lead = entry.audience === 'lead';
  if (!reach) return lead ? f.leadAll : f.guardianAll;
  const n = lead ? reach.lead : reach.guardian;
  if (n === 0) return f.nobody;
  return counted(lead ? f.lead : f.guardian, n);
}

/** A failed save in words (428 / 422 / 403 / anything else). */
export function failureText(failure: RuleFailure): string {
  return fill(r().errors[failure], { word: ESSENTIAL_OFF_TEXT });
}

/** «حفظ: تذكير الحلقة» (the button's accessible name names its row). */
export const actionName = (action: string, name: string): string =>
  fill(r().actionName, { action, name });

/** Fills `{name}` and the like in a notificationRules string. */
export const fillText = fill;
