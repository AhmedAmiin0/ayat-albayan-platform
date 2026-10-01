import { Injectable } from '@nestjs/common';
import { AvailabilityQueries } from './availability.queries';
import { freeSlots, type TimeRange } from './free-slots';
import { DAY } from './zoned-time';

export type FreeSlotsQuery = {
  teacherId: string;
  from: Date;
  to: Date;
  durationMin: number;
  /** Booked lessons (UTC). TODO(Phase 2): load from `lessons` here once the table exists. */
  busy?: readonly TimeRange[];
  stepMin?: number;
};

/** Free UTC slots for one teacher — consumed by the booking wizard / follow-ups. R-TCH-02. */
@Injectable()
export class AvailabilityQuery {
  constructor(private readonly availability: AvailabilityQueries) {}

  async freeSlots(q: FreeSlotsQuery): Promise<TimeRange[]> {
    // Time-off just outside [from, to] can still split a window that reaches into it, which shifts
    // where slots start; load a 2-day margin so results don't depend on the query window.
    const margin = { from: new Date(q.from.getTime() - 2 * DAY), to: new Date(q.to.getTime() + 2 * DAY) };
    const [availability, timeOff] = await Promise.all([
      this.availability.listSlots(q.teacherId),
      this.availability.listTimeOff(q.teacherId, margin),
    ]);
    return freeSlots({
      ...q,
      availability,
      timeOff: timeOff.map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
      busy: q.busy ?? [],
    });
  }
}
