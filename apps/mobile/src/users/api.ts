import type {
  LinkCandidate,
  LinkKind,
  PasswordReset,
  UserCreate,
  UserDetail,
  UserRoleOption,
  UserUpdate,
  UserWithCredential,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

// The web's users/api.ts on the phone (apps/api/src/modules/users): users.read lists and opens,
// users.write does the rest. Every key sits under ['users'], so one invalidation reaches them all.
export const USERS_KEY = ['users'] as const;
export const USERS_PAGE_SIZE = 20;

/** The list's filters; usePagedList adds page + pageSize (GET /users?q=&role=&status=&page=&pageSize=20). */
export interface UsersView {
  q: string;
  role: string;
  status: string;
}

export const FIRST_VIEW: UsersView = { q: '', role: '', status: '' };

export const roleOptionsQuery = queryOptions({
  queryKey: [...USERS_KEY, 'role-options'],
  queryFn: () => apiFetch<UserRoleOption[]>('/users/role-options'),
  staleTime: 60_000,
});

/** Records of `kind` without a login, matching `q` (name or student code); `q=` is sent even blank, as on the web. */
export const candidatesQuery = (kind: LinkKind, q: string) =>
  queryOptions({
    queryKey: [...USERS_KEY, 'candidates', kind, q],
    queryFn: () =>
      apiFetch<LinkCandidate[]>(`/users/link-candidates?kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(q)}`),
  });

export const userQuery = (id: string) =>
  queryOptions({ queryKey: [...USERS_KEY, 'detail', id], queryFn: () => apiFetch<UserDetail>(`/users/${id}`) });

// The credential in these answers is shown once: the mutations that return one use gcTime 0 and
// the screens copy it into their own state, never into the query cache.
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
