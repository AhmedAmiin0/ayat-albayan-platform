import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { testFlagBodySchema, testFlagResultSchema } from './test-accounts.schemas';

const flag = (path: string, area: 'users' | 'students') =>
  defineRoute({
    method: 'PATCH',
    path,
    params: z.object({ id: z.uuid() }),
    body: testFlagBodySchema,
    response: testFlagResultSchema,
    permissions: [`${area}.write`],
    tags: [area],
  });

/** The test switch of a login or a student (docs/56), written once for the api and its clients. */
export const testAccountRoutes = {
  user: flag('/admin/users/:id/test', 'users'),
  student: flag('/students/:id/test', 'students'),
};
