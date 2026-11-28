import { defineRoute, id, pageOf, phoneE164 } from '@ab/core';
import { z } from 'zod';
import {
  guardianCreateBodySchema,
  guardianDetailSchema,
  guardianUpdateBodySchema,
  guardianViewSchema,
  peopleListQuerySchema,
} from './guardians.schemas';

const byId = z.object({ id: id() });

/** Guardians (R-STU-02, R-STU-04), written once for the api and its clients. */
export const guardianRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/guardians',
    query: peopleListQuerySchema,
    response: pageOf(guardianViewSchema),
    permissions: ['guardians.read'],
    tags: ['guardians'],
  }),
  get: defineRoute({
    method: 'GET',
    path: '/guardians/:id',
    params: byId,
    response: guardianDetailSchema,
    permissions: ['guardians.read'],
    tags: ['guardians'],
  }),
  create: defineRoute({
    method: 'POST',
    path: '/guardians',
    body: guardianCreateBodySchema,
    response: guardianViewSchema,
    permissions: ['guardians.write'],
    tags: ['guardians'],
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/guardians/:id',
    params: byId,
    body: guardianUpdateBodySchema,
    response: guardianViewSchema,
    permissions: ['guardians.write'],
    tags: ['guardians'],
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/guardians/:id',
    params: byId,
    response: 'empty',
    permissions: ['guardians.write'],
    tags: ['guardians'],
  }),
  /** The family's second number only; 404 phone_not_found for any other. */
  removePhone: defineRoute({
    method: 'DELETE',
    path: '/guardians/:id/phones/:phone',
    params: byId.extend({ phone: phoneE164 }),
    response: 'empty',
    permissions: ['guardians.write'],
    tags: ['guardians'],
  }),
};
