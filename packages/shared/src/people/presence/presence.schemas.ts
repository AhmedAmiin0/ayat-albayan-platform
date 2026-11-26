import { USER_ROLES } from '@ab/catalog';
import { z } from 'zod';

// The API's presence answers (docs/33): ids, a role and a time, never a phone or email.

export const presencePeerSchema = z.object({
  profile_id: z.string(),
  role: z.enum(USER_ROLES),
  /** UTC; null: never seen since presence shipped. */
  last_seen_at: z.string().nullable(),
});
export type PresencePeer = z.infer<typeof presencePeerSchema>;

/** GET …/channel/presence: the chat's people the caller may see, never the caller (docs/33 §1). */
export const channelPresenceSchema = z.object({
  /** presence_enabled: off = nothing tracked or shown. */
  enabled: z.boolean(),
  peers: z.array(presencePeerSchema),
});
export type ChannelPresence = z.infer<typeof channelPresenceSchema>;

export const staffPresenceRowSchema = presencePeerSchema.extend({ name: z.string() });
export type StaffPresenceRow = z.infer<typeof staffPresenceRowSchema>;

/** GET /presence/staff (admin): every active staff login. */
export const staffPresenceSchema = z.object({
  enabled: z.boolean(),
  staff: z.array(staffPresenceRowSchema),
});
export type StaffPresence = z.infer<typeof staffPresenceSchema>;

/** GET /presence/me: may this login track itself? */
export const presenceSelfSchema = z.object({ enabled: z.boolean() });
export type PresenceSelf = z.infer<typeof presenceSelfSchema>;
