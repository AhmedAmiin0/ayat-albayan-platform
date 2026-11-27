import { outsideSlotsResponseSchema } from '@ab/shared';
import { findConflicts, freeSlots } from '@ab/schedule';
import { DAY_MS } from '@ab/time';
import type { OutsideSlotsResponse } from '@ab/shared';
import type { Conflict, Occurrence, SlotsResponse, SlotView } from '@ab/schedule';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { OutsideSlotsQuery, SlotsQuery } from '@ab/schedule';
import { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { ConflictContext } from './conflict-context';
import { outsideGrid } from './outside-slots';
import { httpError } from '@/common/http/errors';

const MAX_SLOT_RANGE_DAYS = 14;
const OUTSIDE_DAYS = 14;
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
    private readonly queries: BookingRepo,
    private readonly context: ConflictContext,
    private readonly settings: BookingSettings,
  ) {}

  async slots(q: SlotsQuery): Promise<SlotsResponse> {
    const [from, to] = [new Date(q.from), new Date(q.to)];
    if (to.getTime() - from.getTime() > MAX_SLOT_RANGE_DAYS * DAY_MS) {
      throw httpError(HttpStatus.BAD_REQUEST, 'range_too_large', { maxDays: MAX_SLOT_RANGE_DAYS });
    }
    const teacher = await this.queries.teacher(q.teacherId);
    if (!teacher) throw httpError(HttpStatus.NOT_FOUND, 'teacher_not_found');
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
  /** Decided on the server clock, returned as `server_now`; the client only formats the starts. */
  async outside(q: OutsideSlotsQuery): Promise<OutsideSlotsResponse> {
    const now = new Date();
    const range = { from: now, to: new Date(now.getTime() + OUTSIDE_DAYS * DAY_MS) };
    const teacher = await this.queries.teacher(q.teacherId);
    if (!teacher) throw httpError(HttpStatus.NOT_FOUND, 'teacher_not_found');
    const exclude = { excludeLessonId: q.excludeLessonId, excludeCourse: q.excludeCourse };
    const studentIds = q.studentIds ?? [];
    const who = { teacherId: teacher.id, studentIds };
    const rows = await this.context.load({ ...who, ...range, ...exclude });
    const stepMin = q.stepMin ?? ALWAYS_STEP_MIN;
    const { durationMin } = q;
    const slots = outsideGrid({ ...range, durationMin, stepMin, teacherTz: teacher.tz, rows });
    const server_now = now.toISOString();
    const body = { server_now, teacher_tz: teacher.tz, step_min: stepMin, slots };
    return outsideSlotsResponseSchema.parse(body);
  }
}
