import { DAY_MS, outsideSlotsResponseSchema, type OutsideSlotsResponse } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { OutsideSlotsQuery } from '@/modules/teaching/booking/booking.dto';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';
import { ConflictContext } from './conflict-context';
import { outsideGrid } from './outside-slots';
import { ALWAYS_STEP_MIN } from './slots.service';

/** How far «وقت آخر» looks ahead of the server's now. */
const OUTSIDE_DAYS = 14;

/**
 * GET /booking/outside-slots («وقت آخر», owner 2026-11-21): every start of the teacher's whole day
 * over the next 14 days from the SERVER clock, minus the past and any clash (lessons, time off),
 * each with inside_hours; `server_now` is the clock it used. The client only formats them.
 */
@Injectable()
export class OutsideSlotsService {
  constructor(
    private readonly queries: BookingRepo,
    private readonly context: ConflictContext,
  ) {}

  async slots(q: OutsideSlotsQuery): Promise<OutsideSlotsResponse> {
    const now = new Date();
    const to = new Date(now.getTime() + OUTSIDE_DAYS * DAY_MS);
    const teacher = await this.queries.teacher(q.teacherId);
    if (!teacher) throw domainError(HttpStatus.NOT_FOUND, 'teacher_not_found');
    const exclude = { excludeLessonId: q.excludeLessonId, excludeCourse: q.excludeCourse };
    const range = { from: now, to };
    const rows = await this.context.load({
      teacherId: teacher.id,
      studentIds: q.studentIds ?? [],
      ...range,
      ...exclude,
    });
    const stepMin = q.stepMin ?? ALWAYS_STEP_MIN;
    const slots = outsideGrid({
      ...range,
      durationMin: q.durationMin,
      stepMin,
      teacherTz: teacher.tz,
      rows,
    });
    const body = {
      server_now: now.toISOString(),
      teacher_tz: teacher.tz,
      step_min: stepMin,
      slots,
    };
    return outsideSlotsResponseSchema.parse(body);
  }
}
