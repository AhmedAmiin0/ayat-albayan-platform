import { ADMIN_TASK_KINDS } from '@ab/catalog';
import { z } from 'zod';

/** One admin task raised by the R-SUB-02 alerts (S7, S8). */
export const adminTaskViewSchema = z.object({
  id: z.string(),
  kind: z.enum(ADMIN_TASK_KINDS),
  subject_type: z.string(),
  subject_id: z.string(),
  /** For subscription tasks: the student, so the UI can name them. */
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }).nullable(),
  title: z.string().nullable(),
  due_at: z.string().nullable(),
  done_at: z.string().nullable(),
  created_at: z.string(),
});
export type AdminTaskView = z.infer<typeof adminTaskViewSchema>;
