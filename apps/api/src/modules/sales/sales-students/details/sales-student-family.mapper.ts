import type { FamilySibling, SalesStudentFamily } from '@ab/shared';
import type { DetailsStudentRow, FamilyStudentRow } from './sales-student.repo';

const NO_GUARDIAN = { name: null, students: [] };

const sibling = (s: FamilyStudentRow): FamilySibling => ({
  id: s.id,
  code: s.code,
  name: s.name,
  status: s.status,
});

/** The guardian's name only for viewers who see the family phone (inbox.read). */
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
