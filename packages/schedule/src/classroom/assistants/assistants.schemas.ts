import { lessonStatusSchema } from '@ab/catalog';
import { z } from 'zod';

/** POST /students/:id/assistants (admin). The profile must have role = assistant. */
export const assignAssistantSchema = z.object({ profileId: z.uuid() });
export type AssignAssistant = z.output<typeof assignAssistantSchema>;

/** A teaching assistant as the admin's manager lists them. */
export const assistantViewSchema = z.object({ profile_id: z.string(), full_name: z.string() });
export type AssistantView = z.infer<typeof assistantViewSchema>;

/** GET /assistants/me/lessons: one of the day's sessions of an assistant's students. */
export const assistantLessonViewSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: lessonStatusSchema,
  teacher_name: z.string(),
  student_names: z.array(z.string()),
});
export type AssistantLessonView = z.infer<typeof assistantLessonViewSchema>;

/** [from, to) as ISO instants; the client picks the viewer's local day. */
export const assistantDaySchema = z.object({ from: z.iso.datetime(), to: z.iso.datetime() });
export type AssistantDay = z.infer<typeof assistantDaySchema>;
