import { USER_ROLES } from '@ab/catalog';
import { z } from 'zod';
import type { ChannelPresence, PresencePeer } from './presence.views';

// The apps' parse of a chat's presence (docs/36 Z-5), typed by presence.views.ts.

const presencePeerSchema: z.ZodType<PresencePeer> = z.object({
  profile_id: z.string(),
  role: z.enum(USER_ROLES),
  last_seen_at: z.string().nullable(),
});

/** GET …/channel/presence: the chat's people the caller may see (docs/33 §1). */
export const channelPresenceSchema: z.ZodType<ChannelPresence> = z.object({
  enabled: z.boolean(),
  peers: z.array(presencePeerSchema),
});
