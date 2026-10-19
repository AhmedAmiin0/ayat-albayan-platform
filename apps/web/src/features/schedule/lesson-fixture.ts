import { allowedLessonEvents, type LessonStatus, type LessonView } from '@ab/shared';
import type { EditableLesson, TimeEditInfo, TimeEditMode } from './edit-time.contract';

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
  /** The lesson's own teacher holds it in the platform classroom; left out = the fixed link. */
  platform_classroom?: boolean | undefined;
  /** R-SCH-11: what the admin may do to the time (the API sends it for admins only). */
  time_edit_mode?: TimeEditMode | null;
  time_edit?: TimeEditInfo | null;
}

export function lesson(o: LessonOverrides = {}): LessonView {
  const edit: Pick<EditableLesson, 'time_edit_mode' | 'time_edit'> = {
    ...(o.time_edit_mode !== undefined && { time_edit_mode: o.time_edit_mode }),
    ...(o.time_edit !== undefined && { time_edit: o.time_edit }),
  };
  const room = o.platform_classroom === undefined ? {} : { platform_classroom: o.platform_classroom };
  return { ...core(o), ...edit, ...room, conflicts: o.conflicts ?? [], pending_proposal: o.pending_proposal ?? null };
}

function core(o: LessonOverrides): Omit<LessonView, 'conflicts' | 'pending_proposal'> {
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
