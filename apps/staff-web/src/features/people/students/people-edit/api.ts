import {
  familySearchKey,
  type MoveBody,
  peopleEditCalls,
  peopleEditErrorText,
  peopleEditKey,
} from '@ab/client-core';
import type { PeopleGuardianPatch, PeopleStudentPatch } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { meQuery } from '@/features/people/auth';
import { apiFetch, apiSend, t } from '@ab/web-kit';

// Needs people.edit, students.attach_guardian or people.switch_role.

const people = peopleEditCalls({ apiFetch, apiSend });

export const peopleEditQuery = (studentId: string) =>
  queryOptions({
    queryKey: peopleEditKey(studentId),
    queryFn: () => people.view(studentId),
  });

export const familySearchQuery = (search: string) =>
  queryOptions({
    queryKey: familySearchKey(search),
    queryFn: () => people.families(search),
    enabled: search.length >= 2,
  });

export const saveStudent = (input: { id: string; patch: PeopleStudentPatch }) =>
  people.editStudent(input.id, input.patch);

export const saveFamily = (input: { id: string; patch: PeopleGuardianPatch }) =>
  people.editGuardian(input.id, input.patch);

export const removeSecondPhone = (input: { guardianId: string; phone: string }) =>
  people.removePhone({ id: input.guardianId, phone: input.phone });

export const moveFamily = (input: { studentId: string; body: MoveBody }) =>
  people.move(input.studentId, input.body);

export const setContactSelf = (input: { studentId: string; value: boolean }) =>
  people.contactSelf(input.studentId, { contact_is_self: input.value });

export const guardianToStudent = (guardianId: string) => people.toStudent(guardianId);

export const studentToGuardian = (studentId: string) => people.toGuardian(studentId);

const ME = JSON.stringify(meQuery.queryKey);

/** A people write changes lists, profiles, chats and money reads: refetch all but the session. */
export const refreshPeople = (client: QueryClient): Promise<void> =>
  client.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey) !== ME });

/** The API's refusal in MSA (t.peopleEdit.errors), the generic sentence for anything else. */
export const peopleErrorText = (e: unknown): string => peopleEditErrorText(e, t.peopleEdit.errors);
