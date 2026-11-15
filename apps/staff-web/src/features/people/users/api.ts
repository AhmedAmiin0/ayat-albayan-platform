import type {
  LinkCandidate,
  LinkKind,
  PasswordReset,
  UserCreate,
  UserDetail,
  UserPage,
  UserRoleOption,
  UserUpdate,
  UserWithCredential,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// apps/api/src/modules/users: «المستخدمون». users.read lists and opens, users.write does the rest.
export const USERS_KEY = ['users'] as const;
export const USERS_PAGE_SIZE = 20;

export interface UsersView {
  q: string;
  role: string;
  status: string;
  page: number;
}

export const userListQuery = (view: UsersView) =>
  queryOptions({
    queryKey: [...USERS_KEY, 'list', view],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(view.page), pageSize: String(USERS_PAGE_SIZE) });
      for (const key of ['q', 'role', 'status'] as const) if (view[key]) qs.set(key, view[key]);
      return apiFetch<UserPage>(`/users?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

export const roleOptionsQuery = queryOptions({
  queryKey: [...USERS_KEY, 'role-options'],
  queryFn: () => apiFetch<UserRoleOption[]>('/users/role-options'),
  staleTime: 60_000,
});

/** Records of `kind` without a login, matching `q` (name or student code). */
export const candidatesQuery = (kind: LinkKind, q: string) =>
  queryOptions({
    queryKey: [...USERS_KEY, 'candidates', kind, q],
    queryFn: () => apiFetch<LinkCandidate[]>(`/users/link-candidates?${new URLSearchParams({ kind, q })}`),
  });

export const userQuery = (id: string) =>
  queryOptions({ queryKey: [...USERS_KEY, 'detail', id], queryFn: () => apiFetch<UserDetail>(`/users/${id}`) });

// The credential in these answers is shown once: the mutations that return one use gcTime 0 and
// the dialogs copy it into their own state, never into the query cache.
export const createUser = (body: UserCreate) => apiSend<UserWithCredential>('POST', '/users', body);

export const updateUser = (input: { id: string; body: UserUpdate }) =>
  apiSend<UserDetail>('PATCH', `/users/${input.id}`, input.body);

export const disableUser = (input: { id: string; reason?: string }) =>
  apiSend<UserDetail>('POST', `/users/${input.id}/disable`, input.reason ? { reason: input.reason } : {});

export const enableUser = (id: string) => apiSend<UserDetail>('POST', `/users/${id}/enable`, {});

export const resetPassword = (input: { id: string; body: PasswordReset }) =>
  apiSend<UserWithCredential>('POST', `/users/${input.id}/reset-password`, input.body);

export const signOutUser = (id: string) => apiSend('POST', `/users/${id}/sign-out`, {});

export const deleteUser = (id: string) => apiSend('DELETE', `/users/${id}`);
