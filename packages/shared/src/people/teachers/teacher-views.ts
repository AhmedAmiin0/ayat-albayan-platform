import type { AvailabilitySlot } from '@ab/schedule';

/** Wall-clock "HH:MM" in `tz`, weekday 0 = Sunday. */
export type AvailabilityRow = AvailabilitySlot & { id: string };

/** GET /teachers/:id/time-off: UTC instants, newest first. */
export interface TimeOff {
  id: string;
  teacher_id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}
