import type { Conflict } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AvailabilityQueries } from '../teachers/availability/availability.queries';
import { BusyQueries } from './busy.queries';
import { findConflicts } from './conflicts';
import type { Occurrence } from './occurrences';
import { RuleProjectionQueries } from './rule-projection.queries';

export type CheckInput = {
  teacherId: string;
  studentIds: readonly string[];
  proposed: readonly Occurrence[];
  /** Lessons that must not count as busy: the one being moved, or the rows just generated. */
  excludeIds: readonly string[];
  /** Rules whose not-yet-generated occurrences must not count (the rule being replaced). */
  excludeRuleIds?: readonly string[];
};

/**
 * Loads what findConflicts needs for one teacher + students and runs it (R-SCH-04, issue B3).
 * Busy = occupying lessons + the occurrences active rules will still generate (rule-projection),
 * so a clash beyond the horizon (DST) or with a not-yet-generated occurrence is caught too.
 */
@Injectable()
export class ConflictChecker {
  constructor(
    private readonly busy: BusyQueries,
    private readonly availability: AvailabilityQueries,
    private readonly projection: RuleProjectionQueries,
  ) {}

  async check(input: CheckInput): Promise<Conflict[]> {
    if (input.proposed.length === 0) return [];
    const span = {
      from: new Date(Math.min(...input.proposed.map((p) => p.starts_at.getTime()))),
      to: new Date(Math.max(...input.proposed.map((p) => p.ends_at.getTime()))),
    };
    const { teacherId, studentIds } = input;
    const [teacherLessons, studentLessons, availability, timeOff, projected] = await Promise.all([
      this.busy.teacherLessons(teacherId, span),
      this.busy.studentLessons(studentIds, span),
      this.availability.listSlots(teacherId),
      this.availability.listTimeOff(teacherId, span),
      this.projection.busy({ teacherId, studentIds, span, excludeRuleIds: input.excludeRuleIds ?? [] }),
    ]);
    const skip = new Set(input.excludeIds);
    return findConflicts({
      proposed: input.proposed,
      teacherLessons: [...teacherLessons.filter((l) => !skip.has(l.id)), ...projected.teacher],
      studentLessons: [...studentLessons.filter((l) => !skip.has(l.id)), ...projected.students],
      availability,
      timeOff: timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
    });
  }
}
