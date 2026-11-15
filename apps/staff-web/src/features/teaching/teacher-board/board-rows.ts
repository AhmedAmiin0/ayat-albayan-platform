import {
  attendanceRate,
  boardStudents,
  matchesQuery,
  studentLessons,
  type LessonView,
  type StudentLessons,
  type StudentListKind,
  type TeacherMe,
} from '@ab/shared';
import { compareValues } from '@/components/data-table/client-sort';
import type { FactsById } from './student-facts';

export type BoardStudent = TeacherMe['students'][number];

/** One row of «طلابي»: the student and her lessons in the window. */
export interface BoardRow {
  student: BoardStudent;
  summary: StudentLessons;
  /** attendanceRate of the window's counts (null: nothing marked yet). */
  rate: number | null;
}

export interface BoardInput {
  lessons: readonly LessonView[];
  kind: StudentListKind;
  now: Date;
}

/** Soonest next lesson first, no next lesson last, ties by the Arabic name (docs/48). */
const byNextThenName = (a: BoardRow, b: BoardRow): number =>
  compareValues(a.summary.next?.starts_at, b.summary.next?.starts_at) ||
  compareValues(a.student.name, b.student.name);

/** Her current students of `kind` (boardStudents), each with the window's summary, sorted. */
export function boardRows(students: readonly BoardStudent[], o: BoardInput): BoardRow[] {
  const rows = boardStudents(students, o.kind).map((student) => {
    const summary = studentLessons(o.lessons, { studentId: student.id, now: o.now });
    return { student, summary, rate: attendanceRate(summary.counts) };
  });
  return rows.sort(byNextThenName);
}

export interface SearchInput {
  /** The search box text (trimmed); '' keeps every row. */
  q: string;
  facts: FactsById;
}

/** The fields one search box matches: name, code (any case) and the facts line («تجويد»). */
const fieldsOf = (row: BoardRow, facts: FactsById): string[] =>
  [row.student.name, row.student.code, facts.get(row.student.id) ?? ''];

/** The rows whose name, code or facts contain `q` (Arabic-normalised, case-insensitive). */
export function searchRows(rows: readonly BoardRow[], { q, facts }: SearchInput): BoardRow[] {
  return rows.filter((row) => matchesQuery(fieldsOf(row, facts), q));
}
