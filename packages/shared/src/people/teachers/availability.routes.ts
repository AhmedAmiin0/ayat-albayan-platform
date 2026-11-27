import { defineRoute, id } from '@ab/core';
import { availabilityReplaceSchema, timeOffCreateSchema } from '@ab/schedule';
import { z } from 'zod';
import { availabilityRowSchema, timeOffViewSchema } from './availability.schemas';

const byTeacher = z.object({ id: id() });
const byTimeOff = z.object({ id: id(), timeOffId: id() });

/** A teacher's weekly grid and time-off (R-TCH-02), written once for the api and its clients. */
export const availabilityRoutes = {
  grid: defineRoute({
    method: 'GET',
    path: '/teachers/:id/availability',
    params: byTeacher,
    response: z.array(availabilityRowSchema),
    permissions: ['availability.read'],
    tags: ['teachers'],
  }),
  replaceGrid: defineRoute({
    method: 'PUT',
    path: '/teachers/:id/availability',
    params: byTeacher,
    body: availabilityReplaceSchema,
    response: z.array(availabilityRowSchema),
    permissions: ['availability.write'],
    tags: ['teachers'],
  }),
  timeOff: defineRoute({
    method: 'GET',
    path: '/teachers/:id/time-off',
    params: byTeacher,
    response: z.array(timeOffViewSchema),
    permissions: ['availability.read'],
    tags: ['teachers'],
  }),
  addTimeOff: defineRoute({
    method: 'POST',
    path: '/teachers/:id/time-off',
    params: byTeacher,
    body: timeOffCreateSchema,
    response: timeOffViewSchema,
    permissions: ['availability.write'],
    tags: ['teachers'],
  }),
  editTimeOff: defineRoute({
    method: 'PUT',
    path: '/teachers/:id/time-off/:timeOffId',
    params: byTimeOff,
    body: timeOffCreateSchema,
    response: timeOffViewSchema,
    permissions: ['availability.write'],
    tags: ['teachers'],
  }),
  removeTimeOff: defineRoute({
    method: 'DELETE',
    path: '/teachers/:id/time-off/:timeOffId',
    params: byTimeOff,
    response: 'empty',
    permissions: ['availability.write'],
    tags: ['teachers'],
  }),
};
