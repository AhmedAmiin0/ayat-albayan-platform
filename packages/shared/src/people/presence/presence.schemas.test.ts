import { describe, expect, it } from 'vitest';
import { channelPresenceSchema } from './presence.schemas';

describe("a chat's presence as the apps read it (docs/33)", () => {
  it('reads the people, a never-seen one included', () => {
    const answer = {
      enabled: true,
      peers: [
        { profile_id: 'g1', role: 'guardian', last_seen_at: '2026-10-30T12:00:00.000Z' },
        { profile_id: 't1', role: 'teacher', last_seen_at: null },
      ],
    };
    expect(channelPresenceSchema.parse(answer)).toEqual(answer);
    expect(channelPresenceSchema.parse({ enabled: false, peers: [] }).enabled).toBe(false);
  });

  it('refuses an answer without its people or with an unknown role', () => {
    expect(channelPresenceSchema.safeParse({ enabled: true }).success).toBe(false);
    const odd = { profile_id: 'x', role: 'robot', last_seen_at: null };
    expect(channelPresenceSchema.safeParse({ enabled: true, peers: [odd] }).success).toBe(false);
  });
});
