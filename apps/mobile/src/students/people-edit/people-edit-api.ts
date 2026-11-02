import {
  familySearchKey,
  peopleEditErrorText,
  peopleEditKey,
  peopleEditPaths as P,
} from '@ab/client-core';
import {
  convertedStudentSchema,
  familyOptionsSchema,
  familyReplySchema,
  peopleEditViewSchema,
  type PeopleGuardianPatch,
  type PeopleStudentPatch,
} from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, type SendMethod } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';

// /people/* (owner 2026-11-02), the web's api.ts: «تعديل البيانات», «ربط بولي أمر آخر» and «تحويل»
// for the assistant and the admin. Paths, keys and error words are @ab/client-core's.

const send = (method: SendMethod, path: string, body?: unknown): Promise<unknown> =>
  apiSend(method, path, body);

/** GET /people/students/:id, once a sheet is open. */
export const usePeopleEditView = (studentId: string, enabled: boolean) =>
  useQuery({
    queryKey: peopleEditKey(studentId),
    queryFn: async () => peopleEditViewSchema.parse(await apiFetch(P.student(studentId))),
    enabled,
  });

/** The guardian picker, from two characters. */
export const useFamilySearch = (search: string) =>
  useQuery({
    queryKey: familySearchKey(search),
    queryFn: async () => familyOptionsSchema.parse(await apiFetch(P.families(search))),
    enabled: search.length >= 2,
  });

export const saveStudent = (input: { id: string; patch: PeopleStudentPatch }) =>
  send('PATCH', P.student(input.id), input.patch);
export const saveFamily = (input: { id: string; patch: PeopleGuardianPatch }) =>
  send('PATCH', P.guardian(input.id), input.patch);
export const removeSecondPhone = (input: { guardianId: string; phone: string }) =>
  send('DELETE', P.secondPhone(input.guardianId, input.phone));

export type MoveBody =
  { guardian_id: string } | { guardian: { name: string; phone_e164: string; tz: string } };
export const moveFamily = async (input: { studentId: string; body: MoveBody }) =>
  familyReplySchema.parse(await send('POST', P.move(input.studentId), input.body));
export const setContactSelf = (input: { studentId: string; value: boolean }) =>
  send('PATCH', P.contactSelf(input.studentId), { contact_is_self: input.value });
export const guardianToStudent = async (guardianId: string) =>
  convertedStudentSchema.parse(await send('POST', P.toStudent(guardianId)));
export const studentToGuardian = async (studentId: string) =>
  familyReplySchema.parse(await send('POST', P.toGuardian(studentId)));

/** The API's refusal in MSA, the generic sentence for anything else. */
export const peopleErrorText = (e: unknown): string => peopleEditErrorText(e, t.peopleEdit.errors);

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
