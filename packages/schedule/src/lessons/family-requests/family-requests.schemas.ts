import { LESSON_STATUSES } from '@ab/catalog';
import { z } from 'zod';

/** A family's move request waiting for an admin or the owning assistant (R-SCH-08). */
export const familyRequestSchema = z.object({
  /** The proposal: POST /family-requests/:id/approve | reject. */
  id: z.uuid(),
  lesson_id: z.uuid(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  proposed_starts_at: z.string(),
  note: z.string().nullable(),
  created_at: z.string(),
  teacher: z.object({
    id: z.uuid(),
    display_name_ar: z.string(),
    display_name_en: z.string().nullable(),
    tz: z.string(),
  }),
  students: z.array(z.object({ id: z.uuid(), code: z.string(), name: z.string(), tz: z.string() })),
});
export type FamilyRequestView = z.infer<typeof familyRequestSchema>;

/** Oldest first. */
export const familyRequestsSchema = z.array(familyRequestSchema);
