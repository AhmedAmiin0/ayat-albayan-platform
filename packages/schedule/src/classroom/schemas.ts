import { z } from 'zod';

/** POST /public/join/:linkToken: the name the student or guardian types (shown to the others). */
export const guestJoinSchema = z.object({
  name: z.string().trim().min(1).max(30),
});
export type GuestJoin = z.output<typeof guestJoinSchema>;

/** The same through the family app's signed link: no name needed, the API takes the student's. */
export const familyGuestJoinSchema = z.object({ name: guestJoinSchema.shape.name.optional() });

/** Allow (true) or stop (false) a guest's screen share. */
export const shareGrantSchema = z.object({ allow: z.boolean() });
export type ShareGrant = z.output<typeof shareGrantSchema>;

/** POST …/participants/:identity/mute: which of their tracks the staff turn off. */
export const muteSchema = z.object({ source: z.enum(['microphone', 'camera']) });
export type MuteRequest = z.output<typeof muteSchema>;
export type MuteSource = MuteRequest['source'];
