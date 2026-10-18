import {
  allowedLessonEvents,
  CONFLICT_KINDS,
  isOpenLesson,
  type Conflict,
  type LessonEvent,
  type LessonProposalView,
  timeEditMode,
  type LessonStudentView,
  type LessonTimeEditView,
  type LessonView,
} from '@ab/shared';
import { z } from 'zod';
import type { Role } from '../../common/auth/verify-token';
import type { LessonRow } from './lesson-row';
import type { SeqMap } from './lessons.queries';

/** What a teacher may do to their own lesson (docs/10 §3 Guards); the rest is admin-only. */
const TEACHER_EVENTS: ReadonlySet<LessonEvent> = new Set([
  'confirm',
  'complete',
  'mark_late',
  'mark_no_show',
  'excuse',
]);

export type ViewContext = { role: Role | null; seq: SeqMap };

/** Event list for the caller's role (LessonView.allowed_events). */
export function eventsFor(row: Pick<LessonRow, 'status'>, role: Role | null): LessonEvent[] {
  const all = allowedLessonEvents(row.status);
  return role === 'admin' ? all : all.filter((e) => TEACHER_EVENTS.has(e));
}

/** DB row → API view (snake_case, instants ISO UTC). R-LES-01, R-LES-03, R-SCH-03. */
export function toLessonView(row: LessonRow, ctx: ViewContext): LessonView {
  const students: LessonStudentView[] = row.lesson_students
    .map((s) => ({
      id: s.student_id,
      code: s.student?.code ?? '',
      name: s.student?.name ?? '',
      tz: s.student?.tz ?? '',
      attendance: s.attendance,
      chargeable: s.chargeable,
      seq: ctx.seq.get(`${row.id}:${s.student_id}`) ?? null,
      makeup: activeMakeup(row, s.student_id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return {
    id: row.id,
    rule_id: row.rule_id,
    rule_byday: row.rule?.byday ?? null,
    trial: row.rule?.package === 'trial',
    course_subscription_id: row.rule?.subscription_id ?? null,
    makeup: (row.makeup_of_id ?? null) !== null,
    makeup_of: row.original ? { id: row.original.id, starts_at: iso(row.original.starts_at) } : null,
    teacher: row.teacher ?? { id: row.teacher_id, display_name_ar: '', tz: '' },
    starts_at: iso(row.starts_at),
    ends_at: iso(row.ends_at),
    status: row.status,
    meeting_link: row.meeting_link,
    cancel_reason: row.cancel_reason,
    override_reason: row.override_reason,
    confirmed_at: row.confirmed_at === null ? null : iso(row.confirmed_at),
    rescheduled_from_id: row.rescheduled_from_id,
    ...roomFields(row),
    students,
    allowed_events: eventsFor(row, ctx.role),
    conflicts: storedConflicts(row.conflicts),
    // A proposal on a lesson that was cancelled / held meanwhile is moot (approving would 409).
    pending_proposal: isOpenLesson(row.status) ? pendingProposal(row.proposals) : null,
    // R-SCH-11: only an admin edits a time in place; a teacher proposes (R-SCH-08) or notes it in the report.
    time_edit_mode: ctx.role === 'admin' ? timeEditMode(row.status) : null,
    time_edit: timeEdit(row, ctx.role),
  };
}

/** Migration 190: «افتح الحلقة الآن» and «حلقة فورية». */
const roomFields = (row: LessonRow): Pick<LessonView, 'room_opened_at' | 'instant'> => ({
  room_opened_at: row.room_opened_at ? iso(row.room_opened_at) : null,
  instant: row.instant ?? false,
});

const wasTimes = z.object({ starts_at: z.string(), ends_at: z.string() });

/** lessons.time_edit_* → LessonView.time_edit (null when never edited or unreadable); the admin's reason stays with admins. */
function timeEdit(row: LessonRow, role: ViewContext['role']): LessonTimeEditView | null {
  const was = wasTimes.safeParse(row.time_edit_was);
  if (!row.time_edited_at || !was.success) return null;
  const { starts_at, ends_at } = was.data;
  return { at: iso(row.time_edited_at), reason: role === 'admin' ? (row.time_edit_reason ?? null) : null, was: { starts_at: iso(starts_at), ends_at: iso(ends_at) } };
}

/** The makeup booked for this student's miss: not cancelled, not moved (lessons_makeup_of_key). */
function activeMakeup(row: LessonRow, studentId: string): LessonStudentView['makeup'] {
  const m = row.makeups?.find((x) => x.makeup_student_id === studentId && !INACTIVE.has(x.status));
  return m ? { lesson_id: m.id, starts_at: iso(m.starts_at) } : null;
}
const INACTIVE: ReadonlySet<string> = new Set(['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled']);

const conflictList = z.array(
  z.object({
    kind: z.enum(CONFLICT_KINDS),
    startsAt: z.string(),
    endsAt: z.string(),
    lessonId: z.string().optional(),
    studentId: z.string().optional(),
  }),
);

/** lessons.conflicts jsonb → Conflict[] ([] when none or unreadable). */
export function storedConflicts(value: unknown): Conflict[] {
  const parsed = conflictList.safeParse(value);
  return parsed.success ? parsed.data : [];
}

function pendingProposal(rows: LessonRow['proposals'] | undefined): LessonProposalView | null {
  const p = rows?.find((r) => r.status === 'pending');
  return p ? { id: p.id, proposed_starts_at: iso(p.proposed_starts_at), note: p.note, created_at: iso(p.created_at) } : null;
}

/** Postgres "2026-10-04 14:00:00+00" / "+00:00" → "2026-10-04T14:00:00.000Z". */
const iso = (value: string): string => new Date(value).toISOString();
