import type { StudentStatus } from '@ab/catalog';
import { isNotSubscribed } from '../../people/students/status-flow.js';

// Trial students (owner, 2026-10-11): a teacher and a trial family do not chat directly; sales
// or the system manages between them. The API scope (migration 20261007000001) enforces it; the
// teacher screens use this to swap any family chat / contact entry for a short note.

/**
 * true when the family of a student with this status is reached through sales, not the teacher: not
 * subscribed yet (new, trial, pending_subscription; owner 2026-10-15).
 */
export function familyChatViaSales(status: StudentStatus | null | undefined): boolean {
  return isNotSubscribed(status);
}
