import type { RoomPresence } from '@ab/shared';
import type { RoomTile } from '@/classroom/room/model/room-types';
import { t } from '@ab/mobile-kit';

type FamilyRole = Extract<RoomPresence['role'], 'student' | 'guardian'>;

const FAMILY: Record<FamilyRole, string> = {
  student: t.studentChannel.roles.student,
  guardian: t.studentChannel.roles.guardian,
};

const familyRole = (role: RoomPresence['role']): role is FamilyRole =>
  role === 'student' || role === 'guardian';

/**
 * A person's role in words: the token's role («معلم/ة», «مساعد حلقة»), except a guest the lesson's
 * presence knows (the family's link): «الطالب» / «ولي الأمر» instead of «ضيف». null: unknown.
 */
export function roleWord(person: RoomTile, presence: readonly RoomPresence[]): string | null {
  const known = presence.find((p) => p.name === person.name)?.role;
  if (known && familyRole(known) && person.role !== 'teacher') return FAMILY[known];
  return person.role ? t.classroom.roles[person.role] : null;
}
