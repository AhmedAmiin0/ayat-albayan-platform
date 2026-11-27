import type { Conflict } from './conflicts.schemas';

/** 409 body of POST /booking and POST /lessons/:id/reschedule without override. */
export interface ConflictResponse {
  code: 'conflict';
  conflicts: Conflict[];
}
