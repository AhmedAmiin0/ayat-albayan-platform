import { firstName, joinWindow, studentLinkViewSchema, type StudentLinkView } from '@ab/schedule';
import type { JoinWindowConfig } from '@ab/schedule';
import { asResponse } from '@/common/http/returns';
import type { StudentLesson } from './student-link.repo';

interface StudentPage {
  name: string;
  lesson: StudentLesson | null;
  win: JoinWindowConfig;
  now: Date;
}

/** The student's page: their first name and the lesson their link opens now, if any. */
export function toStudentLinkView({ name, lesson, win, now }: StudentPage): StudentLinkView {
  const view = lesson && {
    id: lesson.id,
    starts_at: lesson.starts_at,
    ends_at: lesson.ends_at,
    teacher_name: lesson.teacher_name,
    window: joinWindow(lesson, now, win),
  };
  return asResponse(studentLinkViewSchema, { first_name: firstName(name), lesson: view });
}
