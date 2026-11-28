import type { LinkKind, PasswordReset, UserCreate, UserUpdate } from '@ab/shared';
import { userCalls, type UsersView } from '@ab/client-core';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { userKeys } from '@/features/people/keys';

// users.read lists and opens, users.write does the rest.
export const USERS_KEY = userKeys.all;
export const USERS_PAGE_SIZE = 20;

/** The list's filters and the web's page (the table pages by hand). */
export type UsersPageView = UsersView & { page: number };

const users = userCalls({ apiFetch, apiSend });

export const userListQuery = (view: UsersPageView) =>
  queryOptions({
    queryKey: userKeys.list(view),
    queryFn: () => {
      const { page, q, role, status } = view;
      return users.list({ page, pageSize: USERS_PAGE_SIZE, q, role, status });
    },
    placeholderData: keepPreviousData,
  });

export const roleOptionsQuery = queryOptions({
  queryKey: userKeys.roleOptions(),
  queryFn: users.roleOptions,
  staleTime: 60_000,
});

/** Records of `kind` without a login, matching `q` (name or student code). */
export const candidatesQuery = (kind: LinkKind, q: string) =>
  queryOptions({
    queryKey: userKeys.candidates(kind, q),
    queryFn: () => users.linkCandidates({ kind, q }),
  });

export const userQuery = (id: string) =>
  queryOptions({ queryKey: userKeys.detail(id), queryFn: () => users.read(id) });

// The credential in these answers is shown once: the mutations that return one use gcTime 0 and
// the dialogs copy it into their own state, never into the query cache.
export const createUser = (body: UserCreate) => users.create(body);

export const updateUser = (input: { id: string; body: UserUpdate }) =>
  users.update(input.id, input.body);

export const disableUser = (input: { id: string; reason?: string }) =>
  users.disable(input.id, { reason: input.reason });

export const enableUser = (id: string) => users.enable(id);

export const resetPassword = (input: { id: string; body: PasswordReset }) =>
  users.resetPassword(input.id, input.body);

export const signOutUser = (id: string) => users.signOut(id);

export const deleteUser = (id: string) => users.remove(id);
