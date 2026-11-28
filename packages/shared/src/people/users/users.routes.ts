import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import {
  linkCandidatesQuery,
  passwordResetSchema,
  userCreateSchema,
  userDisableSchema,
  usersListQuery,
  userUpdateSchema,
} from './users.schemas';
import {
  linkedRecordSchema,
  userDetailSchema,
  userPageSchema,
  userRoleOptionSchema,
  userWithCredentialSchema,
} from './users-view.schemas';

const byId = z.object({ id: id() });
const read = { permissions: ['users.read'], tags: ['users'] } as const;
const write = { permissions: ['users.write'], tags: ['users'] } as const;

/** A request without a JSON body reads as `{}`: the reason and the credential are optional. */
const orEmpty = <S extends z.ZodType>(schema: S) =>
  z.preprocess((value: z.input<S> | undefined) => value ?? {}, schema);

/**
 * The staff directory of logins: users.read lists and opens, users.write does the rest. A secret
 * appears only in the answer of create or reset-password, shown once.
 */
export const usersRoutes = {
  list: defineRoute({
    ...read,
    method: 'GET',
    path: '/users',
    query: usersListQuery,
    response: userPageSchema,
  }),
  /** System and custom roles; `assignable` = the caller holds every grant of the role. */
  roleOptions: defineRoute({
    ...read,
    method: 'GET',
    path: '/users/role-options',
    response: z.array(userRoleOptionSchema),
  }),
  /** Records of a kind without a login; the api also wants that kind's own write permission. */
  linkCandidates: defineRoute({
    ...write,
    method: 'GET',
    path: '/users/link-candidates',
    query: linkCandidatesQuery,
    response: z.array(linkedRecordSchema),
  }),
  read: defineRoute({
    ...read,
    method: 'GET',
    path: '/users/:id',
    params: byId,
    response: userDetailSchema,
  }),
  /** 409 email_taken / link_taken, 403 permission_not_held, 400 password_* / link_target_*. */
  create: defineRoute({
    ...write,
    method: 'POST',
    path: '/users',
    body: userCreateSchema,
    response: userWithCredentialSchema,
  }),
  update: defineRoute({
    ...write,
    method: 'PATCH',
    path: '/users/:id',
    params: byId,
    body: userUpdateSchema,
    response: userDetailSchema,
  }),
  /** 409 cannot_disable_self / last_admin; also bans the login and revokes its sessions. */
  disable: defineRoute({
    ...write,
    method: 'POST',
    path: '/users/:id/disable',
    params: byId,
    body: orEmpty(userDisableSchema),
    response: userDetailSchema,
  }),
  /** 409 self_lockout: nobody re-enables themselves. */
  enable: defineRoute({
    ...write,
    method: 'POST',
    path: '/users/:id/enable',
    params: byId,
    response: userDetailSchema,
  }),
  resetPassword: defineRoute({
    ...write,
    method: 'POST',
    path: '/users/:id/reset-password',
    params: byId,
    body: orEmpty(passwordResetSchema),
    response: userWithCredentialSchema,
  }),
  signOut: defineRoute({
    ...write,
    method: 'POST',
    path: '/users/:id/sign-out',
    params: byId,
    response: 'empty',
  }),
  /** 409 cannot_delete_self / last_admin / users_has_history {references, hint}. */
  remove: defineRoute({
    ...write,
    method: 'DELETE',
    path: '/users/:id',
    params: byId,
    response: 'empty',
  }),
};
