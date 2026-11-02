// Online now (docs/33 §1.1): Supabase Realtime Presence on private topics 'presence:<profile id>'.
// A user tracks only their own topic; a viewer subscribes (never tracks) to the topics of the
// people it shows. RLS (migration 985) refuses a track elsewhere and a watch the API would not
// allow.

export const PRESENCE_SELF_PATH = '/presence/me';
export const STAFF_PRESENCE_PATH = '/presence/staff';
export const presenceSelfKey = ['presence', 'me'] as const;
export const staffPresenceKey = ['presence', 'staff'] as const;
export const channelPresenceKey = (audience: string, studentId: string) =>
  ['presence', 'channel', audience, studentId] as const;

export const presenceTopic = (profileId: string): string => `presence:${profileId}`;

export interface PresenceChannelLike {
  on(type: 'presence', filter: { event: 'sync' }, callback: () => void): PresenceChannelLike;
  subscribe(callback?: (status: string) => void): PresenceChannelLike;
  presenceState(): Record<string, unknown[]>;
  track(payload: Record<string, unknown>): Promise<unknown>;
}

export interface PresenceRealtimeLike {
  channel(
    topic: string,
    options: { config: { private: boolean; presence?: { key: string } } },
  ): PresenceChannelLike;
  removeChannel(channel: PresenceChannelLike): Promise<unknown>;
  realtime?: { setAuth(token?: string | null): Promise<void> };
}

/** What a watch knows: joined at all (`live`), and whose topic holds a tracked meta. */
export interface PresenceWatch {
  live: boolean;
  online: ReadonlySet<string>;
}

/** The topic holds at least one tracked meta (any device of that person). */
export const hasMeta = (channel: PresenceChannelLike): boolean =>
  Object.values(channel.presenceState()).some((metas) => metas.length > 0);

/** setAuth first (the join carries the session's JWT, which the policy reads), then join. */
export function afterAuth(client: PresenceRealtimeLike, join: () => void): void {
  const auth = client.realtime?.setAuth();
  if (auth) void auth.then(join, join);
  else join();
}

function leave(client: PresenceRealtimeLike, channel: PresenceChannelLike | null): void {
  if (channel) void client.removeChannel(channel).catch(() => undefined);
}

/** Tracks the signed-in user on their own topic; returns the leave. Never throws. */
export function trackSelf(client: PresenceRealtimeLike, profileId: string): () => void {
  let stopped = false;
  let channel: PresenceChannelLike | null = null;
  afterAuth(client, () => {
    if (stopped || !profileId) return;
    try {
      const config = { private: true, presence: { key: profileId } };
      const joined = client.channel(presenceTopic(profileId), { config });
      channel = joined.subscribe((status) => {
        if (status === 'SUBSCRIBED')
          void joined.track({ at: new Date().toISOString() }).catch(() => undefined);
      });
    } catch {
      channel = null;
    }
  });
  return () => {
    stopped = true;
    leave(client, channel);
    channel = null;
  };
}
