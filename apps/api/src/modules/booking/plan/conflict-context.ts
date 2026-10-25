import { Injectable } from '@nestjs/common';
import type { ConflictInput } from '../../scheduling/conflicts';
import { BusyQueries } from '../../scheduling/busy.queries';
import { AvailabilityQueries } from '../../teachers/availability/availability.queries';
import type { Range } from '../core/booking.queries';

export type ContextQuery = Range & {
  teacherId: string;
  studentIds: readonly string[];
  /** A lesson being edited in place (R-SCH-11): it must not count as busy against itself. */
  excludeLessonId?: string | undefined;
  /** «تغيير أيام الحلقات»: the lessons of this course (of these students) move, so they are not busy. */
  excludeCourse?: string | undefined;
};
export type ConflictContextRows = Omit<ConflictInput, 'proposed'>;

/**
 * Loads what findConflicts checks against (R-SCH-04, issue B3): the teacher's bookable grid and
 * time-off, and the occupying lessons of the teacher and of the students overlapping `range`
 * (read page by page, never cut at PostgREST's max_rows). Used by the slot grid.
 */
@Injectable()
export class ConflictContext {
  constructor(
    private readonly availability: AvailabilityQueries,
    private readonly busy: BusyQueries,
  ) {}

  async load(q: ContextQuery): Promise<ConflictContextRows> {
    const range = { from: q.from, to: q.to };
    const [availability, timeOff, teacherLessons, studentLessons, course] = await Promise.all([
      this.availability.bookableSlots(q.teacherId),
      this.availability.listTimeOff(q.teacherId, range),
      this.availability.listBusyLessons(q.teacherId, range),
      this.busy.studentLessons(q.studentIds, range),
      q.excludeCourse ? this.busy.courseLessonIds({ subscriptionId: q.excludeCourse, studentIds: q.studentIds, span: range }) : [],
    ]);
    const skip = new Set([...course, ...(q.excludeLessonId ? [q.excludeLessonId] : [])]);
    const others = <T extends { id: string }>(lessons: T[]): T[] => lessons.filter((l) => !skip.has(l.id));
    return {
      availability,
      timeOff: timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
      teacherLessons: others(teacherLessons),
      studentLessons: others(studentLessons),
    };
  }
}
