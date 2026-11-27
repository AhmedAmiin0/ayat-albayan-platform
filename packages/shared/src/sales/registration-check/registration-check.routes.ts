import { defineRoute } from '@ab/core';
import { registrationCheckQuerySchema } from './registration-check';
import { registrationCheckViewSchema } from './registration-check.schemas';

/** Is this family or child already a student? Rate-limited, no ids, phones, money or notes. */
export const registrationCheckRoutes = {
  check: defineRoute({
    permissions: ['students.check_registration'],
    tags: ['sales'],
    method: 'GET',
    path: '/sales/registration-check',
    query: registrationCheckQuerySchema,
    response: registrationCheckViewSchema,
  }),
};
