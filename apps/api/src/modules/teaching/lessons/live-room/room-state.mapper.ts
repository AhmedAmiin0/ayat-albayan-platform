import {
  roomPresenceRoleSchema,
  type LessonRoomState,
  type RoomPresence,
  type RoomPresenceRole,
} from '@ab/schedule';
import { z } from 'zod';
import { own } from '@/common/infra/own-value';
import type { PresenceRow } from './room-inside.repo';

// Presence rows → the `room` of a lesson payload (lessonRoomStateSchema). Pure.

/** A staff login is named by what it is to the family: the teacher, or the academy's staff. */
const STAFF_ROLE = z.record(z.string(), roomPresenceRoleSchema).readonly().decode({
  teacher: 'teacher',
  admin: 'staff',
  assistant: 'staff',
  sales: 'staff',
});

/** A guest by a student's link (the family app, the student's link) is the student's side. */
const guestRole = (row: PresenceRow): RoomPresenceRole =>
  row.link?.student_id ? 'student' : 'guest';

export const presenceRole = (row: PresenceRow): RoomPresenceRole =>
  own(STAFF_ROLE, row.role) ?? guestRole(row);

/** Who may be named to the viewer; staff see everyone's name. */
export type Named = (row: PresenceRow) => boolean;
const EVERYONE: Named = () => true;

/** The family's view (review): the teacher and the family's own students only. */
export const familyNamed =
  (studentIds: readonly string[]): Named =>
  (row) =>
    row.role === 'teacher' || studentIds.includes(row.link?.student_id ?? '');

const personOf = (row: PresenceRow, named: Named): RoomPresence =>
  named(row) ? { name: row.name, role: presenceRole(row) } : { role: presenceRole(row) };

/** One entry per person shown (two windows of one link are one person; the unnamed by role). */
function people(rows: readonly PresenceRow[], named: Named): RoomPresence[] {
  const seen = new Map<string, RoomPresence>();
  for (const row of rows) {
    const person = personOf(row, named);
    seen.set(`${person.role}:${person.name ?? ''}`, person);
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
  named?: Named;
}): LessonRoomState | null {
  const inside = input.endedAt === null ? input.inside : [];
  if (input.endedAt === null && inside.length === 0) return null;
  const inRoom = people(inside, input.named ?? EVERYONE);
  return { liveSince: earliest(inside), endedAt: input.endedAt, inRoom };
}
