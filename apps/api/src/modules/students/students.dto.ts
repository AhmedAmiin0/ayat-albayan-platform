import { guardianCreateSchema, PROGRAMS, STUDENT_STATUSES, studentCreateSchema } from '@ab/shared';
import { z } from 'zod';

/**
 * POST /students: either an existing `guardian_id`, or a `guardian` found-or-created by phone
 * (R-STU-02, R-STU-04). `force: true` skips the duplicate check (R-STU-03). `lead_id` converts that
 * lead and links it to the guardian (R-LEAD-06).
 */
export const studentCreateRequestSchema = studentCreateSchema
  .omit({ guardian_id: true })
  .extend({
    guardian_id: z.uuid().optional(),
    guardian: guardianCreateSchema.optional(),
    force: z.boolean().default(false),
    /** «تسجيل الطالب» from the inbox: the lead to convert and link to the guardian. */
    lead_id: z.uuid().optional(),
  })
  .refine((v) => Boolean(v.guardian_id) !== Boolean(v.guardian), {
    message: 'guardian_id_or_guardian',
    path: ['guardian'],
  });
export type StudentCreateRequest = z.infer<typeof studentCreateRequestSchema>;

/**
 * PATCH /students/:id. Shared `studentUpdateSchema` is `.partial()` over fields with defaults and
 * zod 4 still applies them: `{ level }` came back with status 'new' / program 'quran', silently
 * resetting an active student. Same fields here, without the defaults.
 */
export const studentPatchSchema = studentCreateSchema
  .omit({ guardian_id: true })
  .extend({ program: z.enum(PROGRAMS), status: z.enum(STUDENT_STATUSES) })
  .partial()
  /** Compare-and-set: written only while the row still has this status, else 409 `status_changed`. */
  .extend({ expected_status: z.enum(STUDENT_STATUSES).optional() });

/** POST /students/:id/merge — `merged_id` is folded into `:id` (kept). */
export const mergeRequestSchema = z.object({ merged_id: z.uuid() });
