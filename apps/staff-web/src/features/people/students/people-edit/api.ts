import {
  familySearchKey,
  peopleEditCalls,
  peopleEditErrorText,
  peopleEditKey,
  peopleEditWrites,
} from '@ab/client-core';
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

/** The people writes in the forms' input shape. */
export const peopleWrites = peopleEditWrites({ apiFetch, apiSend });

const ME = JSON.stringify(meQuery.queryKey);

/** A people write changes lists, profiles, chats and money reads: refetch all but the session. */
export const refreshPeople = (client: QueryClient): Promise<void> =>
  client.invalidateQueries({ predicate: (q) => JSON.stringify(q.queryKey) !== ME });

/** The API's refusal in MSA (t.peopleEdit.errors), the generic sentence for anything else. */
export const peopleErrorText = (e: unknown): string => peopleEditErrorText(e, t.peopleEdit.errors);
