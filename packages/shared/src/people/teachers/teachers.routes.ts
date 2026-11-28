import { defineRoute, id, pageOf } from '@ab/core';
import { z } from 'zod';
import { teacherCreateSchema, teacherUpdateSchema } from '../schemas';
import {
  teacherListQuerySchema,
  teacherListRowSchema,
  teacherViewSchema,
} from './teachers.schemas';

const byId = z.object({ id: id() });

/** Teachers (R-TCH-01), written once for the api and its clients. */
export const teacherRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/teachers',
    query: teacherListQuerySchema,
    response: pageOf(teacherListRowSchema),
    permissions: ['teachers.read'],
    tags: ['teachers'],
  }),
  get: defineRoute({
    method: 'GET',
    path: '/teachers/:id',
    params: byId,
    response: teacherViewSchema,
    permissions: ['teachers.read'],
    tags: ['teachers'],
  }),
  create: defineRoute({
    method: 'POST',
    path: '/teachers',
    body: teacherCreateSchema,
    response: teacherViewSchema,
    permissions: ['teachers.write'],
    tags: ['teachers'],
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/teachers/:id',
    params: byId,
    body: teacherUpdateSchema,
    response: teacherViewSchema,
    permissions: ['teachers.write'],
    tags: ['teachers'],
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/teachers/:id',
    params: byId,
    response: 'empty',
    permissions: ['teachers.write'],
    tags: ['teachers'],
  }),
};
