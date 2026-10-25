import type { LessonStatus } from '@ab/shared';
import { ar } from '../../../../common/i18n/server-text';
import type { GoogleEventBody } from '../../google-client.port';
import { EVENT, isJitsi, PLATFORM_SOURCE, POPUP_MINUTES, TZ } from '../../google-format';

/** Which copy: the teacher's calendar (no family phone) or the academy's main calendar (with it). */
export type EventCopy = 'teacher' | 'main';
export type LessonKind = keyof typeof EVENT.kinds;

/** Everything one lesson's event needs, read by GoogleSyncSource. */
export interface EventLesson {
  id: string;
  startsAt: string;
  endsAt: string;
  status: LessonStatus;
  teacherName: string;
  students: { name: string; phone: string | null }[];
  /** The lesson's own join URL (classroom page or the teacher's fixed link), already chosen. */
  link: string | null;
  kind: LessonKind;
  /** The weekly rule's days (0 = Sunday) for «التكرار», null for a one-off lesson. */
  byday: readonly number[] | null;
}

/** Cancelled or moved lessons have no event (the script deletes both copies for any other status). */
const ABSENT: ReadonlySet<LessonStatus> = new Set(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled']);
export const eventWanted = (status: LessonStatus): boolean => !ABSENT.has(status);

const names = (l: EventLesson): string => l.students.map((s) => s.name.trim()).filter(Boolean).join('، ') || EVENT.newStudent;

/** «حلقة — <name> · المنصة» (+ « (يحتاج تأكيد)» while nobody confirmed it). */
export function eventTitle(l: EventLesson): string {
  const confirm = l.status === 'scheduled' ? EVENT.needsConfirmation : '';
  return `${EVENT.titlePrefix}${names(l)}${EVENT.platformMarker}${confirm}`;
}

/** Never a meet.jit.si link (§2.3). */
export const safeLink = (link: string | null): string | null => (link && !isJitsi(link) ? link : null);

const repeatOf = (byday: readonly number[]): string =>
  byday.map((d) => ar.enums.weekday[String(d) as keyof typeof ar.enums.weekday]).join('/');

/** The script's description lines, top to bottom; the main copy adds the family lines under the link. */
export function eventDescription(l: EventLesson, copy: EventCopy): string {
  const link = safeLink(l.link);
  const phones = l.students.map((s) => s.phone).filter((p): p is string => !!p);
  const lines = [
    ...(link ? [`${EVENT.link}${link}`] : []),
    ...(copy === 'main' ? [`${EVENT.student}${names(l)}`, ...(phones.length ? [`${EVENT.studentPhone}${phones.join('، ')}`] : [])] : []),
    ...(l.kind === 'trial' ? [EVENT.trial] : []),
    `${EVENT.teacher}${l.teacherName}`,
    ...(l.byday?.length && l.kind !== 'trial' ? [`${EVENT.repeat}${repeatOf(l.byday)}`] : []),
    `${EVENT.kind}${EVENT.kinds[l.kind]}`,
    `${EVENT.status}${ar.enums.lessonStatus[l.status]}`,
    '',
    EVENT.footer,
  ];
  return lines.join('\n');
}

/** One single event per lesson (no series), tz Asia/Riyadh, 30-minute popup, tagged as ours. */
export function eventBody(l: EventLesson, copy: EventCopy): GoogleEventBody {
  return {
    summary: eventTitle(l),
    description: eventDescription(l, copy),
    location: safeLink(l.link) ?? EVENT.onlineFallback,
    start: { dateTime: new Date(l.startsAt).toISOString(), timeZone: TZ },
    end: { dateTime: new Date(l.endsAt).toISOString(), timeZone: TZ },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: POPUP_MINUTES }] },
    extendedProperties: { private: { ab_source: PLATFORM_SOURCE, ab_lesson_id: l.id } },
  };
}

/** Is this event one the platform made for this lesson? Nothing else is ever updated or deleted. */
export const isOurEvent = (e: { extendedProperties?: { private?: Record<string, string> } }, lessonId: string): boolean =>
  e.extendedProperties?.private?.['ab_source'] === PLATFORM_SOURCE && e.extendedProperties.private['ab_lesson_id'] === lessonId;
