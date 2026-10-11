import type { AssistantLessonView, SalesStudentView, SalesTeacherView } from '@ab/shared';
import type { SalesLiveRow, SalesStudentRow, SalesTeacherRow } from './sales-academy.queries';

// Whitelists, not omit-lists (docs/16): a column added to teachers or students later never reaches sales.

/** An active teacher with the students they teach now (a churned student is no longer theirs), by name. */
export function toSalesTeacher(row: SalesTeacherRow): SalesTeacherView {
  return {
    id: row.id,
    name: row.display_name_ar,
    name_en: row.display_name_en,
    gender: row.gender,
    programs: row.programs,
    students: row.students
      .filter((s) => s.status !== 'churned')
      .map((s) => ({ id: s.id, code: s.code ?? '', name: s.name }))
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
