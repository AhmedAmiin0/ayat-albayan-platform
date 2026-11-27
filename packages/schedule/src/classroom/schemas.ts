import { z } from 'zod';
import type { MessageStatus } from '@ab/catalog';

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

/** POST /lessons/:id/join-link (admin): the family's one-lesson link, sent by WhatsApp. */
export const joinLinkRequestSchema = z.object({ studentId: z.uuid() });
export type JoinLinkRequest = z.output<typeof joinLinkRequestSchema>;

export interface JoinLinkResult {
  expires_at: string;
  replayed: boolean;
  message_status: MessageStatus;
}

/** POST /lessons/:id/join-link/url: the guest link itself, to copy. */
export interface JoinLinkUrl {
  url: string;
  expires_at: string;
}
