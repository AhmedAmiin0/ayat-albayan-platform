import { z } from 'zod';

// The live state of a lesson's room («الحلقة جارية الآن»): who is inside now and
// since when, from LiveKit's participant_joined / participant_left webhooks, and the «إنهاء الحلقة
// للجميع» stamp (lessons.room_ended_at). Rides on the staff lesson rows and the portal lessons.

/** How a person in the room is named to the others: never a login role the family must not see. */
export const ROOM_PRESENCE_ROLES = ['teacher', 'student', 'guardian', 'staff', 'guest'] as const;
export type RoomPresenceRole = (typeof ROOM_PRESENCE_ROLES)[number];

/** name: absent for someone the viewer may not know by name (the family sees roles only). */
export const roomPresenceSchema = z.object({
  name: z.string().optional(),
  role: z.enum(ROOM_PRESENCE_ROLES),
});
export type RoomPresence = z.infer<typeof roomPresenceSchema>;

/**
 * liveSince: the earliest arrival of those inside now (null: nobody inside); endedAt: the lesson
 * was ended for everyone (every join then answers 410 lesson_ended).
 */
export const lessonRoomStateSchema = z.object({
  liveSince: z.string().nullable(),
  endedAt: z.string().nullable(),
  inRoom: z.array(roomPresenceSchema),
});
export type LessonRoomState = z.infer<typeof lessonRoomStateSchema>;

/** POST /lessons/:id/end: when the lesson was ended for everyone (the first call's time). */
export const lessonEndResultSchema = z.object({ endedAt: z.string() });
export type LessonEndResult = z.infer<typeof lessonEndResultSchema>;

/** A lesson whose room was ended for everyone: no join, no «ادخل مرة أخرى». */
export const roomEnded = (lesson: { room_ended_at?: string | null | undefined }): boolean =>
  typeof lesson.room_ended_at === 'string';
