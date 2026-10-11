import type { AssistantLessonView, SalesStudentView, SalesTeacherView } from '@ab/shared';
import type { SalesLiveRow, SalesStudentRow, SalesTeacherRow } from './sales-academy.queries';
import type { TeacherDayFacts } from './sales-schedule.mapper';

/** What the schedule adds to a teacher row: today's facts by teacher id, the next lesson by student id. */
export interface TeacherContext {
  facts: ReadonlyMap<string, TeacherDayFacts>;
  next: ReadonlyMap<string, string>;
}

const NO_CONTEXT: TeacherContext = { facts: new Map(), next: new Map() };

// Whitelists, not omit-lists (docs/16): a column added to teachers or students later never reaches sales.

/**
 * An active teacher with today's lesson count, whether one is running now, and the students they teach
 * now (a churned student is no longer theirs) by name, each with program, status and next lesson.
 */
export function toSalesTeacher(row: SalesTeacherRow, ctx: TeacherContext = NO_CONTEXT): SalesTeacherView {
  const today = ctx.facts.get(row.id);
  return {
    id: row.id,
    name: row.display_name_ar,
    name_en: row.display_name_en,
    gender: row.gender,
    programs: row.programs,
    lessons_today: today?.lessons_today ?? 0,
    live_now: today?.live_now ?? false,
    students: row.students
      .filter((s) => s.status !== 'churned')
      .map((s) => ({ id: s.id, code: s.code ?? '', name: s.name, program: s.program, status: s.status, next_lesson_at: ctx.next.get(s.id) ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
  };
}

export function toSalesStudent(row: SalesStudentRow): SalesStudentView {
  return {
    id: row.id,
    code: row.code ?? '',
    name: row.name,
    status: row.status,
    program: row.program,
    teacher_name: row.teacher?.display_name_ar ?? null,
    guardian_name: row.guardian?.name ?? '',
  };
}

/** The assistant's session row (AssistantHome's shape), so the web reuses its row and «ادخل الحلقة». */
export function toSalesLive(row: SalesLiveRow): AssistantLessonView {
  return {
    lesson_id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    teacher_name: row.teacher?.display_name_ar ?? '',
    student_names: row.lesson_students.flatMap((s) => (s.student ? [s.student.name] : [])),
  };
}
