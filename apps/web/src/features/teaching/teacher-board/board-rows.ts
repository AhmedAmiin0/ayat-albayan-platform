import {
  attendanceRate,
  boardStudents,
  studentLessons,
  type LessonView,
  type StudentLessons,
  type StudentListKind,
  type TeacherMe,
} from '@ab/shared';

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

/** Her current students of `kind` (boardStudents), each with the window's summary. */
export function boardRows(students: readonly BoardStudent[], o: BoardInput): BoardRow[] {
  return boardStudents(students, o.kind).map((student) => {
    const summary = studentLessons(o.lessons, { studentId: student.id, now: o.now });
    return { student, summary, rate: attendanceRate(summary.counts) };
  });
}
