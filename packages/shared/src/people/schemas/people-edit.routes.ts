import { blanksToNull, defineRoute, phoneE164 } from '@ab/core';
import { z } from 'zod';
import {
  contactSelfSchema,
  familyMoveSchema,
  familySearchSchema,
  peopleGuardianPatchSchema,
  peopleIdSchema,
  peopleStudentPatchSchema,
} from './people-edit';
import {
  contactSelfReplySchema,
  convertedStudentSchema,
  familyMoveReplySchema,
  familyOptionsSchema,
  familyReplySchema,
  peopleEditReplySchema,
  peopleEditViewSchema,
} from './people-edit-view';

const byId = z.object({ id: peopleIdSchema });

/**
 * The assistant's and the admin's people edits (R-STU-02, R-STU-04), written once for the api and
 * its clients. Notes in a body are refused for any role but admin by the api, not here.
 */
export const peopleEditRoutes = {
  view: defineRoute({
    method: 'GET',
    path: '/people/students/:id',
    params: byId,
    response: peopleEditViewSchema,
  }),
  editStudent: defineRoute({
    method: 'PATCH',
    path: '/people/students/:id',
    params: byId,
    body: blanksToNull(peopleStudentPatchSchema),
    response: peopleEditReplySchema,
  }),
  editGuardian: defineRoute({
    method: 'PATCH',
    path: '/people/guardians/:id',
    params: byId,
    body: blanksToNull(peopleGuardianPatchSchema),
    response: peopleEditReplySchema,
  }),
  /** The family's second number only; 404 phone_not_found for the main one. */
  removePhone: defineRoute({
    method: 'DELETE',
    path: '/people/guardians/:id/phones/:phone',
    params: byId.extend({ phone: phoneE164 }),
    response: 'empty',
  }),
  families: defineRoute({
    method: 'GET',
    path: '/people/guardians',
    query: familySearchSchema,
    response: familyOptionsSchema,
  }),
  /** 409 same_guardian. */
  move: defineRoute({
    method: 'POST',
    path: '/people/students/:id/guardian',
    params: byId,
    body: blanksToNull(familyMoveSchema),
    response: familyMoveReplySchema,
  }),
  /** 409 family_has_self. */
  contactSelf: defineRoute({
    method: 'PATCH',
    path: '/people/students/:id/contact-self',
    params: byId,
    body: contactSelfSchema,
    response: contactSelfReplySchema,
  }),
  /** 409 guardian_has_self or duplicate_student. */
  toStudent: defineRoute({
    method: 'POST',
    path: '/people/guardians/:id/to-student',
    params: byId,
    response: convertedStudentSchema,
  }),
  /** 409 student_has_login or student_has_records. */
  toGuardian: defineRoute({
    method: 'POST',
    path: '/people/students/:id/to-guardian',
    params: byId,
    response: familyReplySchema,
  }),
};
