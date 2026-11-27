import { STUDENT_STATUSES } from '@ab/catalog';
import { blanksToNull, partialOf } from '@ab/core';
import { z } from 'zod';
import {
  guardianCreateSchema,
  studentColumnQueryShape,
  studentCreateSchema,
  studentListFiltersSchema,
} from '../../schemas';
import { peopleListQuerySchema } from '../../guardians';

/** GET /students: search and page, the filters (R-STU-01), the column sort and texts (R-NFR-08). */
export const studentListQuerySchema = peopleListQuerySchema.extend({
  ...studentListFiltersSchema.shape,
  ...studentColumnQueryShape,
});
export type StudentListQuery = z.output<typeof studentListQuerySchema>;

/**
 * POST /students fields: an existing `guardian_id` or a `guardian` found or created by phone
 * (R-STU-02, R-STU-04); `force` skips the duplicate check (R-STU-03); `lead_id` converts that lead.
 */
const studentCreateFieldsSchema = studentCreateSchema.omit({ guardian_id: true }).extend({
  guardian_id: z.uuid().optional(),
  guardian: guardianCreateSchema.optional(),
  force: z.boolean().default(false),
  lead_id: z.uuid().optional(),
});

type GuardianChoice = Pick<z.input<typeof studentCreateFieldsSchema>, 'guardian_id' | 'guardian'>;

export const hasOneGuardian = (v: GuardianChoice): boolean =>
  Boolean(v.guardian_id) !== Boolean(v.guardian);

export const studentCreateRequestSchema = studentCreateFieldsSchema.refine(hasOneGuardian, {
  message: 'guardian_id_or_guardian',
  path: ['guardian'],
});
export type StudentCreateRequest = z.infer<typeof studentCreateRequestSchema>;

/**
 * PATCH /students/:id. `expected_status` is compare-and-set: the row is written only while it
 * still has this status, else 409 `status_changed` (R-STU-05).
 */
export const studentPatchSchema = partialOf(studentCreateSchema.omit({ guardian_id: true })).extend(
  { expected_status: z.enum(STUDENT_STATUSES).optional() },
);
export type StudentPatch = z.infer<typeof studentPatchSchema>;

/** POST /students/:id/merge: `merged_id` is folded into `:id`, which is kept (R-STU-03). */
export const mergeRequestSchema = z.object({ merged_id: z.uuid() });

export const studentCreateBodySchema = blanksToNull(studentCreateRequestSchema);
export const studentPatchBodySchema = blanksToNull(studentPatchSchema);
