import {
  familySearchKey,
  type MoveBody,
  peopleEditCalls,
  peopleEditErrorText,
  peopleEditKey,
} from '@ab/client-core';
import type { PeopleGuardianPatch, PeopleStudentPatch } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, t, pathKey } from '@ab/mobile-kit';

// The /people endpoints for the assistant and the admin; shared via @ab/client-core.

const people = peopleEditCalls({ apiFetch, apiSend });

/** GET /people/students/:id, once a sheet is open. */
export const usePeopleEditView = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: peopleEditKey(studentId),
    queryFn: () => people.view(studentId),
    enabled,
  });

/** The guardian picker, from two characters. */
export const useFamilySearch = (search: string) =>
  useQuery({
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

/** The API's refusal in MSA, the generic sentence for anything else. */
const peopleErrorText = (e: unknown): string => peopleEditErrorText(e, t.peopleEdit.errors);

const ME = JSON.stringify(pathKey('/auth/me'));

/** One /people write: then every query but the session refetches (lists, files, chats, money). */
export function usePeopleWrite<I, R>(write: (input: I) => Promise<R>, onDone: (result: R) => void) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: write,
    onSuccess: async (result) => {
      onDone(result);
      await client.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey) !== ME });
    },
  });
  return { ...mutation, errorText: mutation.isError ? peopleErrorText(mutation.error) : null };
}
