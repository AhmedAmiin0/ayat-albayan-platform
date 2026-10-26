import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STUN, iceServers, TURN_TTL_S } from './env.calls';
import { loadEnv } from './env';

const base = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'x' };
const who = { userId: 'u1', now: new Date('2026-10-26T10:00:00Z') };

describe('iceServers (docs/28: STUN default, optional TURN)', () => {
  it('a public STUN server when nothing is set', () => {
    expect(iceServers(loadEnv(base), who)).toEqual([{ urls: [DEFAULT_STUN] }]);
  });

  it('TURN gets short-lived per-user credentials minted from the shared secret (TURN REST)', () => {
    const env = loadEnv({ ...base, CALLS_STUN_URLS: 'stun:a.example.org, stun:b.example.org:3478', CALLS_TURN_URLS: 'turns:t.example.org:5349', CALLS_TURN_SECRET: 's3cret' });
    const [stun, turn] = iceServers(env, who);
    expect(stun).toEqual({ urls: ['stun:a.example.org', 'stun:b.example.org:3478'] });
    const username = `${Math.floor(who.now.getTime() / 1000) + TURN_TTL_S}:u1`;
    expect(turn).toEqual({ urls: ['turns:t.example.org:5349'], username, credential: createHmac('sha1', 's3cret').update(username).digest('base64') });
    expect(JSON.stringify(turn)).not.toContain('s3cret');
  });

  it('refuses a URL that is not stun: / turn:', () => {
    expect(() => loadEnv({ ...base, CALLS_STUN_URLS: 'https://x' })).toThrow();
  });
});
