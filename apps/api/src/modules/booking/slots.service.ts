import type { Conflict, SlotsResponse, SlotView } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { findConflicts } from '../scheduling/conflicts';
import type { Occurrence } from '../scheduling/occurrences';
import { freeSlots } from '../teachers/availability/free-slots';
import { DAY } from '../teachers/availability/zoned-time';
import type { SlotsQuery } from './booking.dto';
import { domainError } from './booking.errors';
import { BookingQueries } from './booking.queries';
import { ConflictContext } from './conflict-context';

export const MAX_SLOT_RANGE_DAYS = 14;

/** Pairs every candidate with its conflicts ([] = free). Pure. */
export function slotViews(candidates: readonly Occurrence[], conflicts: readonly Conflict[]): SlotView[] {
  const byStart = new Map<string, Conflict[]>();
  for (const c of conflicts) byStart.set(c.startsAt, [...(byStart.get(c.startsAt) ?? []), c]);
  return candidates.map((c) => {
    const starts_at = c.starts_at.toISOString();
    return { starts_at, ends_at: c.ends_at.toISOString(), conflicts: byStart.get(starts_at) ?? [] };
  });
}

/**
 * GET /booking/slots (R-SCH-06, R-SCH-04): every start inside the teacher's weekly grid, stepped by
 * `stepMin`, each with what blocks it (teacher/student lessons, time-off) so the wizard can show
 * blocked starts with their reason instead of hiding them (docs/10 §5 #13).
 */
@Injectable()
export class SlotsService {
  constructor(
    private readonly queries: BookingQueries,
    private readonly context: ConflictContext,
  ) {}

  async slots(q: SlotsQuery): Promise<SlotsResponse> {
    const [from, to] = [new Date(q.from), new Date(q.to)];
    if (to.getTime() - from.getTime() > MAX_SLOT_RANGE_DAYS * DAY) {
      throw domainError(HttpStatus.BAD_REQUEST, 'range_too_large', { maxDays: MAX_SLOT_RANGE_DAYS });
    }
    const teacher = await this.queries.teacher(q.teacherId);
    if (!teacher) throw domainError(HttpStatus.NOT_FOUND, 'teacher_not_found');
    const studentIds = q.studentIds ?? [];
    const rows = await this.context.load({ teacherId: teacher.id, studentIds, from, to, excludeLessonId: q.excludeLessonId });
    const stepMin = q.stepMin ?? q.durationMin;
    const { durationMin } = q;
    // Candidates ignore time-off and lessons on purpose; findConflicts reports them per slot.
    const grid = freeSlots({ from, to, durationMin, availability: rows.availability, timeOff: [], busy: [], stepMin });
    const proposed = grid.map((s) => ({ starts_at: s.start, ends_at: s.end }));
    const conflicts = findConflicts({ proposed, ...rows });
    return { teacher_tz: teacher.tz, step_min: stepMin, slots: slotViews(proposed, conflicts) };
  }
}
