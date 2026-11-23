import { LESSON_STATUSES } from '@ab/catalog';
import { z } from 'zod';

// «طلبات الأسر»: the families' «اطلب موعدًا آخر» waiting for an admin or the
// owning assistant. GET /family-requests answers these, oldest first; parsed at the client.

export const familyRequestSchema = z.object({
  /** The proposal: POST /family-requests/:id/approve | reject. */
  id: z.string(),
  lesson_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  proposed_starts_at: z.string(),
  /** «ملاحظة الأسرة». */
  note: z.string().nullable(),
  created_at: z.string(),
  teacher: z.object({
    id: z.string(),
    display_name_ar: z.string(),
    display_name_en: z.string().nullable(),
    tz: z.string(),
  }),
  students: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string(), tz: z.string() }),
  ),
});
export type FamilyRequestView = z.infer<typeof familyRequestSchema>;
export const familyRequestsSchema = z.array(familyRequestSchema);

/** What an answer's LessonView is read for: the lesson now (moved, or as it was). */
export const answeredLessonSchema = z.object({
  id: z.string(),
  starts_at: z.string(),
  status: z.enum(LESSON_STATUSES),
});
export type AnsweredLesson = z.infer<typeof answeredLessonSchema>;
