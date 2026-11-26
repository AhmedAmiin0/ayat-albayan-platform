import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { testFlagBodySchema, testFlagResultSchema } from './test-accounts.schemas';

const flag = (path: string) =>
  defineRoute({
    method: 'PATCH',
    path,
    params: z.object({ id: z.uuid() }),
    body: testFlagBodySchema,
    response: testFlagResultSchema,
  });

/** The test switch of a login or a student (docs/56), written once for the api and its clients. */
export const testAccountRoutes = {
  user: flag('/admin/users/:id/test'),
  student: flag('/students/:id/test'),
};
