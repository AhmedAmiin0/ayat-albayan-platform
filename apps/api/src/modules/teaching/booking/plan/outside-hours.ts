import type { BookingRequest, Conflict } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { domainError } from '@/modules/teaching/booking/booking.errors';

// The flag skips only the hours check; clashes and the past still refuse it.

type OutsideFlag = Pick<BookingRequest, 'outsideHours' | 'startsAt'>;

const isHours = (c: Conflict): boolean => c.kind === 'outside_availability';

/** The clashes that refuse this booking: all of them, minus the hours one when the flag is set. */
export function bookableConflicts(conflicts: Conflict[], req: OutsideFlag): Conflict[] {
  return req.outsideHours === true ? conflicts.filter((c) => !isHours(c)) : conflicts;
}

/** 400 date_in_past: an outside-hours start already gone by the server's `now`. */
export function assertNotPast(req: OutsideFlag, now: Date): void {
  const past =
    req.outsideHours === true && !!req.startsAt && Date.parse(req.startsAt) < now.getTime();
  if (past) throw domainError(HttpStatus.BAD_REQUEST, 'date_in_past');
}
