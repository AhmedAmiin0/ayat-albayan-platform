import { Injectable } from '@nestjs/common';
import type { ConflictInput } from '../scheduling/conflicts';
import { AvailabilityQueries } from '../teachers/availability/availability.queries';
import { BookingQueries, type Range } from './booking.queries';

export type ContextQuery = Range & { teacherId: string; studentIds: readonly string[] };
export type ConflictContextRows = Omit<ConflictInput, 'proposed'>;

/**
 * Loads what findConflicts checks against (R-SCH-04, issue B3): the teacher's weekly grid and
 * time-off, and the occupying lessons of the teacher and of the students overlapping `range`.
 */
@Injectable()
export class ConflictContext {
  constructor(
    private readonly availability: AvailabilityQueries,
    private readonly queries: BookingQueries,
  ) {}

  async load(q: ContextQuery): Promise<ConflictContextRows> {
    const range = { from: q.from, to: q.to };
    const [availability, timeOff, teacherLessons, studentLessons] = await Promise.all([
      this.availability.listSlots(q.teacherId),
      this.availability.listTimeOff(q.teacherId, range),
      this.availability.listBusyLessons(q.teacherId, range),
      q.studentIds.length > 0 ? this.queries.studentBusyLessons(q.studentIds, range) : [],
    ]);
    return {
      availability,
      timeOff: timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
      teacherLessons,
      studentLessons,
    };
  }
}
