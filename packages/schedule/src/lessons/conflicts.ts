// Booking conflicts (R-SCH-04, issue B3). Arabic messages: ar.json `booking.conflict.<kind>`.

export const CONFLICT_KINDS = [
  'teacher_busy',
  'student_busy',
  'outside_availability',
  'time_off',
] as const;
export type ConflictKind = (typeof CONFLICT_KINDS)[number];

/** One clash for one proposed occurrence. Instants are ISO-8601 UTC. */
export interface Conflict {
  kind: ConflictKind;
  startsAt: string;
  endsAt: string;
  /** The lesson already in that slot (teacher_busy / student_busy). */
  lessonId?: string;
  /** The student who is busy (student_busy). */
  studentId?: string;
}

/** 409 body of POST /booking and POST /lessons/:id/reschedule without override. */
export interface ConflictResponse {
  code: 'conflict';
  conflicts: Conflict[];
}
