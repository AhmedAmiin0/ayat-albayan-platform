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

/** Roles and the permission matrix, written once for the api and its clients. */
export const roleRoutes = {
  permissions: defineRoute({
    method: 'GET',
    path: '/permissions',
    response: z.array(permissionGroupSchema),
  }),
  list: defineRoute({ method: 'GET', path: '/roles', response: z.array(roleViewSchema) }),
  staffUsers: defineRoute({
    method: 'GET',
    path: '/roles/staff-users',
    response: z.array(staffUserViewSchema),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/roles',
    body: roleCreateSchema,
    response: roleViewSchema,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/roles/:id',
    params: byId,
    body: roleUpdateSchema,
    response: roleViewSchema,
  }),
  reset: defineRoute({
    method: 'POST',
    path: '/roles/:id/reset',
    params: byId,
    response: roleViewSchema,
  }),
  remove: defineRoute({ method: 'DELETE', path: '/roles/:id', params: byId, response: 'empty' }),
  assign: defineRoute({
    method: 'PATCH',
    path: '/users/:id/role',
    params: byId,
    body: roleAssignSchema,
    response: staffUserViewSchema,
  }),
};
