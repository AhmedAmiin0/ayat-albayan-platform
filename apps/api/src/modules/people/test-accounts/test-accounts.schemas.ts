import { z } from 'zod';

/** Which row the switch is on: a student (students.id) or a login (profiles.id). */
export const testTargetSchema = z.enum(['student', 'profile']);
export type TestTarget = z.infer<typeof testTargetSchema>;
