import type { FamilyStudent } from '@/common/push/family-readers';
import type { FamilyLesson, SentReport } from './family-push.plan';

// The sweep's rows (FamilyPushRepo's selects) → the plan's shapes.

type StudentRow = FamilyStudent | null;

interface LessonRow {
  id: string;
  starts_at: string;
  ends_at: string;
  room_opened_at: string | null;
  lesson_students: { student: StudentRow }[];
}

interface ReportRow {
  id: string;
  lesson_id: string;
  link: { lesson: { starts_at: string } | null; student: StudentRow } | null;
}

const present = (s: { student: StudentRow }): FamilyStudent[] => (s.student ? [s.student] : []);

export function lessonOf(row: LessonRow): FamilyLesson {
  const { lesson_students: links, ...lesson } = row;
  return { ...lesson, students: links.flatMap(present) };
}

/** A report whose lesson or student is gone reads as nothing to tell. */
export function reportOf(row: ReportRow): SentReport[] {
  const student = row.link?.student;
  const lesson = row.link?.lesson;
  if (!student || !lesson) return [];
  return [{ id: row.id, lesson_id: row.lesson_id, starts_at: lesson.starts_at, student }];
}
