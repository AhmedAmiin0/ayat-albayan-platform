import type { ApiClient } from '../../../core/http';
import { peopleEditCalls } from './people-edit-api';
import type { PeopleEditWrites } from './people-edit-writes.types';

/** One set of people writes for web and phone, so their mutations never drift. */
export function peopleEditWrites(client: ApiClient): PeopleEditWrites {
  const people = peopleEditCalls(client);
  return {
    saveStudent: ({ id, patch }) => people.editStudent(id, patch),
    saveFamily: ({ id, patch }) => people.editGuardian(id, patch),
    removeSecondPhone: ({ guardianId, phone }) => people.removePhone({ id: guardianId, phone }),
    moveFamily: ({ studentId, body }) => people.move(studentId, body),
    setContactSelf: ({ studentId, value }) =>
      people.contactSelf(studentId, { contact_is_self: value }),
    guardianToStudent: (guardianId) => people.toStudent(guardianId),
    studentToGuardian: (studentId) => people.toGuardian(studentId),
  };
}
