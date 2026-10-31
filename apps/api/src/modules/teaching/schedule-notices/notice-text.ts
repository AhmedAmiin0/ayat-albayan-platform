import { clockOf, joinNames, lessonWhenAt, type OutboundTemplate } from '@ab/shared';
import type { Notice } from './notice.types';

// The four templates' positional params (owner 2026-10-30, exact bodies in the migration):
// {{1}} the recipient's name, {{2}} the student(s), then the time(s) in the RECIPIENT's own zone.

/** Meta rejects a param with a newline, a tab or 4+ spaces in a row: one line, single spaces. */
export const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** «الاثنين 2 نوفمبر، 11:00 ص»: the day, then the 12-hour clock, wall-clock in `tz`. */
export function noticeWhen(at: Date, tz: string): string {
  const opts = { tz, locale: 'ar', cycle: '12' } as const;
  const clock = clockOf(at, opts);
  const full = lessonWhenAt(at, opts);
  const day = full.endsWith(clock) ? full.slice(0, full.length - clock.length).trim() : full;
  return day === full ? full : `${day}، ${clock}`;
}

interface Recipient {
  name: string;
  tz: string;
  /** The students this recipient hears about. */
  names: readonly string[];
  /** The time their own message names (a teacher's own first lesson of a pause). */
  at: Date;
}

/** The template for one recipient, or null when a param would be empty (Meta refuses it). */
export function noticeTemplate(notice: Notice, to: Recipient): OutboundTemplate | null {
  const name = oneLine(to.name);
  const students = oneLine(joinNames(to.names.map(oneLine).filter((n) => n !== '')));
  if (name === '' || students === '') return null;
  const head = { '1': name, '2': students };
  if (notice.key !== 'lesson_rescheduled') {
    return { key: notice.key, params: { ...head, '3': noticeWhen(to.at, to.tz) } };
  }
  const from = noticeWhen(notice.from ?? to.at, to.tz);
  return { key: notice.key, params: { ...head, '3': from, '4': noticeWhen(to.at, to.tz) } };
}
