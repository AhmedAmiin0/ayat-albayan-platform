import { DAY_MS } from '@ab/shared';
import type { Conflict, SlotsResponse, SlotView } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { findConflicts } from '@/modules/teaching/scheduling/conflicts/conflicts';
import type { Occurrence } from '@/modules/teaching/scheduling/occurrences/occurrences';
import { freeSlots } from '@/modules/people/teachers/availability/free-slots';
import type { SlotsQuery } from '@/modules/teaching/booking/booking.dto';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { BookingQueries } from '@/modules/teaching/booking/core/booking.queries';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { ConflictContext } from './conflict-context';

const MAX_SLOT_RANGE_DAYS = 14;
/**
 * Default step while settings.teachers_always_available is on: the one window starts at midnight,
 * so stepping by a 45-min lesson would give 15:45, 16:30 and never 16:00. 30 keeps :00 and :30.
 */
export const ALWAYS_STEP_MIN = 30;

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
 * GET /booking/slots (R-SCH-06, R-SCH-04): every start inside the teacher's bookable grid (all day
 * while teachers_always_available is on), stepped by `stepMin`, each with what blocks it
 * (teacher/student lessons, time-off) so the wizard can show blocked starts with their reason
 * instead of hiding them (docs/10 §5 #13).
 */
@Injectable()
export class SlotsService {
  constructor(
    private readonly queries: BookingQueries,
    private readonly context: ConflictContext,
    private readonly settings: BookingSettings,
  ) {}

  async slots(q: SlotsQuery): Promise<SlotsResponse> {
    const [from, to] = [new Date(q.from), new Date(q.to)];
    if (to.getTime() - from.getTime() > MAX_SLOT_RANGE_DAYS * DAY_MS) {
      throw domainError(HttpStatus.BAD_REQUEST, 'range_too_large', { maxDays: MAX_SLOT_RANGE_DAYS });
    }
    const teacher = await this.queries.teacher(q.teacherId);
    if (!teacher) throw domainError(HttpStatus.NOT_FOUND, 'teacher_not_found');
    const studentIds = q.studentIds ?? [];
    const exclude = { excludeLessonId: q.excludeLessonId, excludeCourse: q.excludeCourse };
    const rows = await this.context.load({ teacherId: teacher.id, studentIds, from, to, ...exclude });
    const alwaysOpen = (await this.settings.read()).teachers_always_available;
    const stepMin = q.stepMin ?? (alwaysOpen ? ALWAYS_STEP_MIN : q.durationMin);
    const { durationMin } = q;
    // Candidates ignore time-off and lessons on purpose; findConflicts reports them per slot.
    const grid = freeSlots({ from, to, durationMin, availability: rows.availability, timeOff: [], busy: [], stepMin });
    const proposed = grid.map((s) => ({ starts_at: s.start, ends_at: s.end }));
    const conflicts = findConflicts({ proposed, ...rows });
    return { teacher_tz: teacher.tz, step_min: stepMin, slots: slotViews(proposed, conflicts) };
  }
}
