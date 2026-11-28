import { isOpenLesson, type LessonView } from '@ab/schedule';

// docs/46 C5: the teacher's own student reads (self.teacher).

export const teacherLessonPaths = {
  /** GET ?month=YYYY-MM: her own lessons with one of her students (StudentAttendanceTable). */
  attendance: (studentId: string) => `/teachers/me/students/${studentId}/attendance`,
  /** GET: the student file's head (docs/47): name, status, course, the next 14 days. */
  student: (studentId: string) => `/teachers/me/students/${studentId}`,
} as const;

type ActionLesson = Pick<LessonView, 'status' | 'starts_at' | 'teacher_confirmed_at'>;

/** Teacher actions show while the lesson is open and has not started. */
export const teacherCanAct = (lesson: ActionLesson, now: Date): boolean =>
  isOpenLesson(lesson.status) && Date.parse(lesson.starts_at) > now.getTime();

/** Cleared when the lesson is moved. */
export const teacherConfirmed = (lesson: ActionLesson): boolean =>
  (lesson.teacher_confirmed_at ?? null) !== null;

export const teacherCanConfirm = (lesson: ActionLesson, now: Date): boolean =>
  teacherCanAct(lesson, now) && !teacherConfirmed(lesson);

/** Uses the confirm's own answer until the re-read lesson arrives, only for the same start. */
export const confirmedNow = (lesson: ActionLesson, answer: ActionLesson | undefined): boolean =>
  teacherConfirmed(lesson) || (answer?.starts_at === lesson.starts_at && teacherConfirmed(answer));

/** Shown only while she can still act (open and ahead). */
export const confirmedChipShown = (
  lesson: ActionLesson,
  o: { answer: ActionLesson | undefined; now: Date },
): boolean => confirmedNow(lesson, o.answer) && teacherCanAct(lesson, o.now);
