import type { LessonRoomState, RoomPresence, RoomPresenceRole } from '@ab/shared';
import type { PresenceRow } from './room-inside.repo';

// Presence rows → the `room` of a lesson payload (lessonRoomStateSchema). Pure.

/** A staff login is named by what it is to the family: the teacher, or the academy's staff. */
const STAFF_ROLE: Readonly<Record<string, RoomPresenceRole>> = {
  teacher: 'teacher',
  admin: 'staff',
  assistant: 'staff',
  sales: 'staff',
};

/** A guest by a student's link (the family app, the student's link) is the student's side. */
const guestRole = (row: PresenceRow): RoomPresenceRole =>
  row.link?.student_id ? 'student' : 'guest';

export const presenceRole = (row: PresenceRow): RoomPresenceRole =>
  STAFF_ROLE[row.role] ?? guestRole(row);

/** One entry per person shown (two windows of one link are one person). */
function people(rows: readonly PresenceRow[]): RoomPresence[] {
  const seen = new Map<string, RoomPresence>();
  for (const row of rows) {
    const person = { name: row.name, role: presenceRole(row) };
    seen.set(`${person.role}:${person.name}`, person);
  }
  return [...seen.values()];
}

const earliest = (rows: readonly PresenceRow[]): string | null =>
  rows.flatMap((r) => (r.entered_at ? [r.entered_at] : [])).sort()[0] ?? null;

/**
 * Ended for everyone: nobody inside any more. Not ended and nobody inside: null (no live state).
 * Else live since the earliest arrival of those inside now.
 */
export function roomStateOf(input: {
  endedAt: string | null;
  inside: readonly PresenceRow[];
}): LessonRoomState | null {
  const inside = input.endedAt === null ? input.inside : [];
  if (input.endedAt === null && inside.length === 0) return null;
  return { liveSince: earliest(inside), endedAt: input.endedAt, inRoom: people(inside) };
}
