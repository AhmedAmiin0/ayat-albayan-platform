// A schedule change families and teachers hear about (owner 2026-10-30: «if there is a reschedule,
// cancel or pause, continue event please notify both teacher and student»). The lesson writers
// announce it through LessonEvents after their transaction commits; ScheduleNotices
// (modules/teaching/schedule-notices) listens, so neither side imports the other.

/** Who made the change (their profile): they get no push about it. null = a job. */
interface Actor {
  actorId: string | null;
}
interface Moved {
  kind: 'lesson_rescheduled';
  lessonId: string;
  fromStartsAt: string;
  familyNotice?: boolean;
}
interface Pause {
  pauseId: string;
  studentId: string;
}

export type ScheduleChange =
  /**
   * The lesson now at the new time (a moved row's new lesson, or the same row retimed).
   * familyNotice: the family hears it by lesson_rescheduled, as FamilyMoveNotice chose before the
   * write (which then queued no booking confirmation); absent or false: the confirmation went.
   */
  | (Actor & Moved)
  | (Actor & { kind: 'lesson_cancelled'; lessonId: string })
  /** The student's lessons the pause took (cancelled, or left in a group). */
  | (Actor & Pause & { kind: 'course_paused'; lessonIds: readonly string[] })
  | (Actor & Pause & { kind: 'course_resumed' });

export type ScheduleChangeListener = (change: ScheduleChange) => Promise<void>;
