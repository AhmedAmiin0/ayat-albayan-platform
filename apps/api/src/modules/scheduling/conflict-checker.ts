import type { Conflict } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AvailabilityQueries } from '../teachers/availability/availability.queries';
import { BusyQueries } from './busy.queries';
import { findConflicts } from './conflicts';
import type { Occurrence } from './occurrences';

export type CheckInput = {
  teacherId: string;
  studentIds: readonly string[];
  proposed: readonly Occurrence[];
  /** Lessons that must not count as busy: the one being moved, or the rows just generated. */
  excludeIds: readonly string[];
};

/** Loads what findConflicts needs for one teacher + students and runs it (R-SCH-04, issue B3). */
@Injectable()
export class ConflictChecker {
  constructor(
    private readonly busy: BusyQueries,
    private readonly availability: AvailabilityQueries,
  ) {}

  async check(input: CheckInput): Promise<Conflict[]> {
    if (input.proposed.length === 0) return [];
    const span = {
      from: new Date(Math.min(...input.proposed.map((p) => p.starts_at.getTime()))),
      to: new Date(Math.max(...input.proposed.map((p) => p.ends_at.getTime()))),
    };
    const [teacherLessons, studentLessons, availability, timeOff] = await Promise.all([
      this.busy.teacherLessons(input.teacherId, span),
      this.busy.studentLessons(input.studentIds, span),
      this.availability.listSlots(input.teacherId),
      this.availability.listTimeOff(input.teacherId, span),
    ]);
    const skip = new Set(input.excludeIds);
    return findConflicts({
      proposed: input.proposed,
      teacherLessons: teacherLessons.filter((l) => !skip.has(l.id)),
      studentLessons: studentLessons.filter((l) => !skip.has(l.id)),
      availability,
      timeOff: timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
    });
  }
}
