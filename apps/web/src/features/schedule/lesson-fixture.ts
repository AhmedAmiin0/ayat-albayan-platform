import { allowedLessonEvents, type LessonStatus, type LessonView } from '@ab/shared';
import type { BoardLesson } from './overview-types';

// Test data only (imported by *.test.tsx): LessonView rows shaped like GET /lessons responses.

export const ABRAR = { id: 't-abrar', display_name_ar: 'أبرار', tz: 'Africa/Cairo' };
export const FATMA = { id: 't-fatma', display_name_ar: 'فاطمة الزهراء', tz: 'Africa/Cairo' };

export const SUHAILA = {
  id: 's-1',
  code: 'AB-0183',
  name: 'سهيلة',
  tz: 'Africa/Cairo',
  attendance: null,
  chargeable: true,
  seq: null,
};
export const JOUD = { ...SUHAILA, id: 's-2', code: 'AB-0184', name: 'جود', tz: 'Asia/Riyadh' };

export interface LessonOverrides {
  id?: string;
  starts_at?: string;
  minutes?: number;
  status?: LessonStatus;
  teacher?: LessonView['teacher'];
  students?: LessonView['students'];
  meeting_link?: string | null;
  rule_id?: string | null;
  conflicts?: LessonView['conflicts'];
  pending_proposal?: LessonView['pending_proposal'];
  trial?: boolean;
}

export function lesson(o: LessonOverrides = {}): BoardLesson {
  return { ...core(o), conflicts: o.conflicts ?? [], pending_proposal: o.pending_proposal ?? null };
}

function core(o: LessonOverrides): Omit<BoardLesson, 'conflicts' | 'pending_proposal'> {
  const startsAt = o.starts_at ?? '2026-10-04T14:00:00.000Z';
  const status = o.status ?? 'scheduled';
  return {
    id: o.id ?? 'l-1',
    rule_id: o.rule_id === undefined ? 'r-1' : o.rule_id,
    teacher: o.teacher ?? ABRAR,
    starts_at: startsAt,
    ends_at: new Date(Date.parse(startsAt) + (o.minutes ?? 45) * 60_000).toISOString(),
    status,
    meeting_link: o.meeting_link === undefined ? 'https://meet.jit.si/ayat-abrar' : o.meeting_link,
    cancel_reason: null,
    override_reason: null,
    confirmed_at: null,
    rescheduled_from_id: null,
    students: o.students ?? [SUHAILA],
    allowed_events: allowedLessonEvents(status),
    trial: o.trial ?? false,
  };
}
