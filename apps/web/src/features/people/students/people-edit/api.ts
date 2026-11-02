import {
  familySearchKey,
  type MoveBody,
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
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { meQuery } from '@/features/people/auth';
import { apiFetch, apiSend, type SendMethod } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

// /people/* (owner 2026-11-02): «تعديل البيانات», «ربط بولي أمر آخر» and «تحويل», for the assistant
// and the admin (people.edit, students.attach_guardian, people.switch_role).

/** apiSend whose JSON answer is parsed by the caller's schema (never a type argument). */
const send = (method: SendMethod, path: string, body?: unknown): Promise<unknown> =>
  apiSend(method, path, body);

export const peopleEditQuery = (studentId: string) =>
  queryOptions({
    queryKey: peopleEditKey(studentId),
    queryFn: async () => peopleEditViewSchema.parse(await apiFetch(P.student(studentId))),
  });

export const familySearchQuery = (search: string) =>
  queryOptions({
    queryKey: familySearchKey(search),
    queryFn: async () => familyOptionsSchema.parse(await apiFetch(P.families(search))),
    enabled: search.length >= 2,
  });

export const saveStudent = (input: { id: string; patch: PeopleStudentPatch }) =>
  apiSend('PATCH', P.student(input.id), input.patch);

export const saveFamily = (input: { id: string; patch: PeopleGuardianPatch }) =>
  apiSend('PATCH', P.guardian(input.id), input.patch);

export const removeSecondPhone = (input: { guardianId: string; phone: string }) =>
  apiSend('DELETE', P.secondPhone(input.guardianId, input.phone));

export const moveFamily = async (input: { studentId: string; body: MoveBody }) =>
  familyReplySchema.parse(await send('POST', P.move(input.studentId), input.body));

export const setContactSelf = (input: { studentId: string; value: boolean }) =>
  apiSend('PATCH', P.contactSelf(input.studentId), { contact_is_self: input.value });

export const guardianToStudent = async (guardianId: string) =>
  convertedStudentSchema.parse(await send('POST', P.toStudent(guardianId)));

export const studentToGuardian = async (studentId: string) =>
  familyReplySchema.parse(await send('POST', P.toGuardian(studentId)));

const ME = JSON.stringify(meQuery.queryKey);

/** A people write changes lists, profiles, chats and money reads: refetch all but the session. */
export const refreshPeople = (client: QueryClient): Promise<void> =>
  client.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey) !== ME });

/** The API's refusal in MSA (t.peopleEdit.errors), the generic sentence for anything else. */
export const peopleErrorText = (e: unknown): string => peopleEditErrorText(e, t.peopleEdit.errors);
