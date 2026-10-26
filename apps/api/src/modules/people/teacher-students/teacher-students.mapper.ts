import type { TeacherStudentView } from '@ab/shared';
import type { TeacherLessonRow, TeacherStudentRow } from './teacher-students.queries';

const UPCOMING = new Set(['scheduled', 'confirmed']);

/** Every student id on any of the lessons. */
export function studentIdsOf(lessons: readonly TeacherLessonRow[]): Set<string> {
  return new Set(lessons.flatMap((l) => l.lesson_students.map((s) => s.student_id)));
}

/** Earliest scheduled / confirmed lesson at or after `now`, per student (ISO UTC). */
export function nextLessonByStudent(lessons: readonly TeacherLessonRow[], now: Date): Map<string, string> {
  const next = new Map<string, number>();
  for (const l of lessons) {
    const at = Date.parse(l.starts_at);
    if (!UPCOMING.has(l.status) || Number.isNaN(at) || at < now.getTime()) continue;
    for (const { student_id } of l.lesson_students) {
      const seen = next.get(student_id);
      if (seen === undefined || at < seen) next.set(student_id, at);
    }
  }
  return new Map([...next].map(([id, at]) => [id, new Date(at).toISOString()]));
}

/** Union of the two sources by id, as the whitelisted view, sorted by name (Arabic collation). */
export function toStudentViews(rows: readonly TeacherStudentRow[], next: ReadonlyMap<string, string>): TeacherStudentView[] {
  const byId = new Map<string, TeacherStudentRow>();
  for (const r of rows) byId.set(r.id, r);
  return [...byId.values()]
    .map((r) => ({
      id: r.id,
      code: r.code ?? '',
      name: r.name,
      status: r.status,
      program: r.program,
      level: r.level,
      age: r.age,
      next_lesson_at: next.get(r.id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}
