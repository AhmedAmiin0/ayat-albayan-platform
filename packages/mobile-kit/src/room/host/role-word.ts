import type { RoomPresence } from '@ab/schedule';
import type { RoomTile } from '../model/room-types';
import { t } from '../../lib/i18n/i18n';

type FamilyRole = Extract<RoomPresence['role'], 'student' | 'guardian'>;

const FAMILY: Record<FamilyRole, string> = {
  student: t.studentChannel.roles.student,
  guardian: t.studentChannel.roles.guardian,
};

const familyRole = (role: RoomPresence['role']): role is FamilyRole =>
  role === 'student' || role === 'guardian';

/** A guest the lesson's presence knows is named student or guardian, not guest; null if unknown. */
export function roleWord(person: RoomTile, presence: readonly RoomPresence[]): string | null {
  const known = presence.find((p) => p.name === person.name)?.role;
  if (known && familyRole(known) && person.role !== 'teacher') return FAMILY[known];
  return person.role ? t.classroom.roles[person.role] : null;
}
