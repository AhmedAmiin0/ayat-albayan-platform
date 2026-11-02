import type { UserRole } from '@ab/catalog';

// The API's presence answers (docs/33): ids, a role and a time, never a phone or email.

export interface PresencePeer {
  profile_id: string;
  role: UserRole;
  /** UTC; null: never seen since presence shipped. */
  last_seen_at: string | null;
}

/** GET …/channel/presence: the chat's people the caller may see (never the caller). */
export interface ChannelPresence {
  /** presence_enabled: off = nothing tracked or shown. */
  enabled: boolean;
  peers: PresencePeer[];
}

export interface StaffPresenceRow extends PresencePeer {
  name: string;
}

/** GET /presence/staff (admin): every active staff login. */
export interface StaffPresence {
  enabled: boolean;
  staff: StaffPresenceRow[];
}

/** GET /presence/me: may this login track itself? */
export interface PresenceSelf {
  enabled: boolean;
}
