import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import {
  permissionGroupSchema,
  roleAssignSchema,
  roleCreateSchema,
  roleUpdateSchema,
  roleViewSchema,
  staffUserViewSchema,
} from './roles.schemas';

const byId = z.object({ id: id() });
const access = { permissions: ['roles.manage'], tags: ['roles'] } as const;

/** Roles and the permission matrix, written once for the api and its clients. */
export const roleRoutes = {
  permissions: defineRoute({
    ...access,
    method: 'GET',
    path: '/permissions',
    response: z.array(permissionGroupSchema),
  }),
  list: defineRoute({
    ...access,
    method: 'GET',
    path: '/roles',
    response: z.array(roleViewSchema),
  }),
  staffUsers: defineRoute({
    ...access,
    method: 'GET',
    path: '/roles/staff-users',
    response: z.array(staffUserViewSchema),
  }),
  create: defineRoute({
    ...access,
    method: 'POST',
    path: '/roles',
    body: roleCreateSchema,
    response: roleViewSchema,
  }),
  update: defineRoute({
    ...access,
    method: 'PATCH',
    path: '/roles/:id',
    params: byId,
    body: roleUpdateSchema,
    response: roleViewSchema,
  }),
  reset: defineRoute({
    ...access,
    method: 'POST',
    path: '/roles/:id/reset',
    params: byId,
    response: roleViewSchema,
  }),
  remove: defineRoute({
    ...access,
    method: 'DELETE',
    path: '/roles/:id',
    params: byId,
    response: 'empty',
  }),
  assign: defineRoute({
    ...access,
    method: 'PATCH',
    path: '/users/:id/role',
    params: byId,
    body: roleAssignSchema,
    response: staffUserViewSchema,
  }),
};
