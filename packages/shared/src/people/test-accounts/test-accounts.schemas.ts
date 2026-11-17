import { z } from 'zod';

/** PATCH /admin/users/:id/test and PATCH /students/:id/test: the one switch. */
export const testFlagBodySchema = z.object({ is_test: z.boolean() }).strict();
export type TestFlagBody = z.infer<typeof testFlagBodySchema>;

/** Their answer: the flag as stored now. */
export const testFlagResultSchema = z.object({ id: z.uuid(), is_test: z.boolean() });
export type TestFlagResult = z.infer<typeof testFlagResultSchema>;
