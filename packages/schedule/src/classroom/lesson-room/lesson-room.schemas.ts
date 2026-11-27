import { z } from 'zod';
import { joinWindowViewSchema } from '../join-window/join-window.schemas';

/** POST /lessons/:id/room/open: the lesson's window after the room was opened. */
export const roomOpenResultSchema = joinWindowViewSchema.extend({ room_opened_at: z.string() });
export type RoomOpenResult = z.infer<typeof roomOpenResultSchema>;

/** The lesson the student's link points at right now (current, else the next one). */
export const studentLinkLessonSchema = z.object({
  id: z.uuid(),
  starts_at: z.string(),
  ends_at: z.string(),
  teacher_name: z.string(),
  window: joinWindowViewSchema,
});
export type StudentLinkLesson = z.infer<typeof studentLinkLessonSchema>;

/** GET /public/student/:token. `lesson` is null when nothing is booked ahead. */
export const studentLinkViewSchema = z.object({
  first_name: z.string(),
  lesson: studentLinkLessonSchema.nullable(),
});
export type StudentLinkView = z.infer<typeof studentLinkViewSchema>;

/** POST /students/:id/join-link (admin): the student's link, created or rotated. */
export const studentJoinLinkUrlSchema = z.object({ url: z.string() });
export type StudentJoinLinkUrl = z.infer<typeof studentJoinLinkUrlSchema>;
