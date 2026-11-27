import { z } from 'zod';
import { JOIN_ROLES } from './room';

// Live room state from LiveKit join/leave webhooks plus lessons.room_ended_at.

/** How a person in the room is named to the others: never a login role the family must not see. */
export const ROOM_PRESENCE_ROLES = ['teacher', 'student', 'guardian', 'staff', 'guest'] as const;
export const roomPresenceRoleSchema = z.enum(ROOM_PRESENCE_ROLES);
export type RoomPresenceRole = z.infer<typeof roomPresenceRoleSchema>;

/** name: absent for someone the viewer may not know by name (the family sees roles only). */
export const roomPresenceSchema = z.object({
  name: z.string().optional(),
  role: roomPresenceRoleSchema,
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

export const joinRoleSchema = z.enum(JOIN_ROLES);

/** POST /lessons/:id/room/join and the meeting joins: all the web room needs. */
export const roomJoinResultSchema = z.object({
  url: z.string(),
  token: z.string(),
  room: z.string(),
  role: joinRoleSchema,
  /** 'off': recording is not set up, so this room is not recorded (the admin is warned). */
  recording: z.enum(['on', 'off']).optional(),
  /** false: a trial lesson: no text chat between the family and the teacher. */
  chat: z.boolean().optional(),
});
export type RoomJoinResult = z.infer<typeof roomJoinResultSchema>;

/** A lesson whose room was ended for everyone: no join or rejoin. */
export const roomEnded = (lesson: { room_ended_at?: string | null | undefined }): boolean =>
  typeof lesson.room_ended_at === 'string';
