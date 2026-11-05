import type { FamilySibling, SalesStudentFamily } from '@ab/shared';
import type { DetailsStudentRow, FamilyStudentRow } from './sales-student.repo';

const NO_GUARDIAN = { name: null, students: [] };

const sibling = (s: FamilyStudentRow): FamilySibling => ({
  id: s.id,
  code: s.code,
  name: s.name,
  status: s.status,
});

/**
 * «العائلة» of «تفاصيل الطالب» (owner 2026-11-02): the guardian's name only for a viewer who
 * sees the family's phone (`showsGuardian`: inbox.read, as chatPhone), whether the student is
 * their own contact, and the guardian's other students (name, code, status), as stored.
 */
export function toStudentFamily(
  row: DetailsStudentRow,
  showsGuardian: boolean,
): SalesStudentFamily {
  const { name = null, students = [] } = row.guardian ?? NO_GUARDIAN;
  return {
    guardian_name: showsGuardian ? name : null,
    contact_is_self: row.contact_is_self === true,
    siblings: students.filter((s) => s.id !== row.id).map(sibling),
  };
}
