import { guardianCreateSchema, studentCreateSchema } from '@ab/shared';
import { z } from 'zod';

/**
 * POST /students: either an existing `guardian_id`, or a `guardian` found-or-created by phone
 * (R-STU-02, R-STU-04). `force: true` skips the duplicate check (R-STU-03).
 */
export const studentCreateRequestSchema = studentCreateSchema
  .omit({ guardian_id: true })
  .extend({
    guardian_id: z.uuid().optional(),
    guardian: guardianCreateSchema.optional(),
    force: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.guardian_id) !== Boolean(v.guardian), {
    message: 'guardian_id_or_guardian',
    path: ['guardian'],
  });
export type StudentCreateRequest = z.infer<typeof studentCreateRequestSchema>;

/** POST /students/:id/merge — `merged_id` is folded into `:id` (kept). */
export const mergeRequestSchema = z.object({ merged_id: z.uuid() });
