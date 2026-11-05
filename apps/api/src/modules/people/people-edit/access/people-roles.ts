import {
  salesGuardianPatchSchema,
  salesStudentPatchSchema,
  type PeopleEditView,
  type PeopleGuardianPatch,
  type PeopleStudentPatch,
} from '@ab/shared';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';

/** The sales base role never reads or writes notes (owner 2026-10-27 whitelist); others do. */
const seesNotes = (user: AuthUser): boolean => user.role !== 'sales';

/**
 * Who edits a family's main number whatever logins hang on it (audited): the holder of the admin's
 * own guardians.write (PATCH /guardians/:id), resolved from the role actually held, never the
 * base-role claim (a custom role on the admin base without it stays bound).
 */
export const isAdmin = (user: AuthUser): boolean =>
  user.permissions?.includes('guardians.write') ?? false;

function withoutNotes(view: PeopleEditView): PeopleEditView {
  // `notes` is dropped by the rest spreads.
  const { notes, ...student } = view.student;
  const { notes: familyNotes, ...guardian } = view.guardian;
  return { student, guardian };
}

/** GET /people/students/:id as this user may read it: no notes for sales. */
export const viewFor = (user: AuthUser, view: PeopleEditView): PeopleEditView =>
  seesNotes(user) ? view : withoutNotes(view);

/** The student PATCH as this user may send it: a `notes` key from sales is a 400. */
export const studentPatchFor = (user: AuthUser, patch: PeopleStudentPatch): PeopleStudentPatch =>
  seesNotes(user) ? patch : parseOrThrow(salesStudentPatchSchema, patch);

/** The family PATCH as this user may send it: a `notes` key from sales is a 400. */
export const guardianPatchFor = (
  user: AuthUser,
  patch: PeopleGuardianPatch,
): PeopleGuardianPatch => (seesNotes(user) ? patch : parseOrThrow(salesGuardianPatchSchema, patch));
