import { Injectable } from '@nestjs/common';
import { AvailabilityQueries } from './availability.queries';
import { freeSlots, type TimeRange } from './free-slots';
import { DAY } from './zoned-time';

export type FreeSlotsQuery = {
  teacherId: string;
  from: Date;
  to: Date;
  durationMin: number;
  stepMin?: number;
};

/**
 * Free UTC slots for one teacher: weekly grid − time-off − the teacher's occupying lessons
 * (R-TCH-02, R-SCH-04). The booking wizard's /booking/slots uses the pure parts directly instead,
 * so blocked starts still show with their conflict reasons.
 */
@Injectable()
export class AvailabilityQuery {
  constructor(private readonly availability: AvailabilityQueries) {}

  async freeSlots(q: FreeSlotsQuery): Promise<TimeRange[]> {
    // Time-off or a lesson just outside [from, to] can still split a window that reaches into it,
    // which shifts where slots start; load a 2-day margin so results don't depend on the window.
    const margin = { from: new Date(q.from.getTime() - 2 * DAY), to: new Date(q.to.getTime() + 2 * DAY) };
    const [availability, timeOff, lessons] = await Promise.all([
      this.availability.listSlots(q.teacherId),
      this.availability.listTimeOff(q.teacherId, margin),
      this.availability.listBusyLessons(q.teacherId, margin),
    ]);
    return freeSlots({
      ...q,
      availability,
      timeOff: timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
      busy: lessons.map((l) => ({ start: l.starts_at, end: l.ends_at })),
    });
  }
}
