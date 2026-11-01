import type {
  FeedbackFormView,
  FeedbackRating,
  FeedbackRowView,
  FeedbackSubmit,
  TeacherFeedbackRowView,
  TeacherFeedbackSummary,
} from '@ab/shared';
import type { Answer, PublicContext } from './feedback.repo';
import type { AverageRow, FeedbackListRow } from './read/feedback.read.repo';

export type People = {
  students: ReadonlyMap<string, { id: string; code: string | null; name: string }>;
  teachers: ReadonlyMap<string, string>;
};

/** The page's lookups, keyed by id (a page is at most 100 rows). */
export function peopleOf(
  students: Iterable<{ id: string; code: string | null; name: string }>,
  teachers: Iterable<{ id: string; display_name_ar: string }>,
): People {
  return {
    students: new Map([...students].map((s) => [s.id, s])),
    teachers: new Map([...teachers].map((t) => [t.id, t.display_name_ar])),
  };
}

/** rating is 1..5 by the table's check; the generated type is plain number. */
const rating = (n: number | null): FeedbackRating | null => (n === null ? null : (n as FeedbackRating));

function common(row: FeedbackListRow, people: People): TeacherFeedbackRowView {
  const student = people.students.get(row.student_id);
  return {
    id: row.id,
    lesson_id: row.lesson_id,
    student: { id: row.student_id, code: student?.code ?? '', name: student?.name ?? '' },
    kind: row.kind,
    requested_at: row.requested_at,
    expires_at: row.expires_at,
    rating: rating(row.rating),
    recommend: row.recommend,
    note: row.note,
    submitted_at: row.submitted_at,
    quick_rating: row.quick_rating,
    quick_rated_at: row.quick_rated_at,
  };
}

/** Admin row: everything, including the teacher and the family's contact number. */
export function toRowView(row: FeedbackListRow, people: People): FeedbackRowView {
  return {
    ...common(row, people),
    teacher: { id: row.teacher_id, name: people.teachers.get(row.teacher_id) ?? '' },
    contact_phone: row.contact_phone,
  };
}

/** A teacher keeps the student's name; the family's phone and the teacher block are never built. */
export const toTeacherRowView = common;

export function toSummary(avg: AverageRow, people: People): TeacherFeedbackSummary {
  return {
    teacher: { id: avg.teacher_id, name: people.teachers.get(avg.teacher_id) ?? '' },
    avg_rating: avg.avg_rating,
    n: avg.n,
    recommend_yes_pct: avg.recommend_yes_pct,
  };
}

/** GET /public/feedback/:token: the teacher, the kind and the prefilled phone, nothing else. */
export function toFormView(ctx: PublicContext): FeedbackFormView {
  return {
    teacherName: ctx.teacherName,
    kind: ctx.row.kind,
    contactPhone: ctx.row.contact_phone ?? ctx.guardianPhone,
    alreadySubmitted: ctx.row.submitted_at !== null,
  };
}

/** The answer's columns; a family that leaves the phone alone keeps the number the link went to. */
export function answerOf(input: FeedbackSubmit, ctx: PublicContext, now: Date): Answer {
  return {
    rating: input.rating,
    recommend: input.recommend,
    note: input.note ?? null,
    contact_phone: input.contactPhone ?? ctx.guardianPhone,
    submitted_at: now.toISOString(),
  };
}
