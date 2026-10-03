import {
  allowedLessonEvents,
  CONFLICT_KINDS,
  isOpenLesson,
  type Conflict,
  type LessonEvent,
  type LessonProposalView,
  type LessonStudentView,
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
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return {
    id: row.id,
    rule_id: row.rule_id,
    rule_byday: row.rule?.byday ?? null,
    trial: row.rule?.package === 'trial',
    makeup: (row.makeup_of_id ?? null) !== null,
    teacher: row.teacher ?? { id: row.teacher_id, display_name_ar: '', tz: '' },
    starts_at: iso(row.starts_at),
    ends_at: iso(row.ends_at),
    status: row.status,
    meeting_link: row.meeting_link,
    cancel_reason: row.cancel_reason,
    override_reason: row.override_reason,
    confirmed_at: row.confirmed_at === null ? null : iso(row.confirmed_at),
    rescheduled_from_id: row.rescheduled_from_id,
    students,
    allowed_events: eventsFor(row, ctx.role),
    conflicts: storedConflicts(row.conflicts),
    // A proposal on a lesson that was cancelled / held meanwhile is moot (approving would 409).
    pending_proposal: isOpenLesson(row.status) ? pendingProposal(row.proposals) : null,
  };
}

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
