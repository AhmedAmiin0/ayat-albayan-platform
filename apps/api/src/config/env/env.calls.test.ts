import { describe, expect, it } from 'vitest';
import { DEFAULT_STUN, iceServers } from './env.calls';
import { loadEnv } from './env';

const base = { SUPABASE_URL: 'http://localhost:54321', SUPABASE_SERVICE_ROLE_KEY: 'x' };

describe('iceServers (docs/28: STUN default, optional TURN)', () => {
  it('a public STUN server when nothing is set', () => {
    expect(iceServers(loadEnv(base))).toEqual([{ urls: [DEFAULT_STUN] }]);
  });

  it('the configured STUN list, and TURN with its credentials when its urls are set', () => {
    const env = loadEnv({
      ...base,
      CALLS_STUN_URLS: 'stun:a.example.org, stun:b.example.org:3478',
      CALLS_TURN_URLS: 'turns:t.example.org:5349',
      CALLS_TURN_USERNAME: 'u',
      CALLS_TURN_CREDENTIAL: 'p',
    });
    expect(iceServers(env)).toEqual([
      { urls: ['stun:a.example.org', 'stun:b.example.org:3478'] },
      { urls: ['turns:t.example.org:5349'], username: 'u', credential: 'p' },
    ]);
  });

  it('refuses a URL that is not stun: / turn:', () => {
    expect(() => loadEnv({ ...base, CALLS_STUN_URLS: 'https://x' })).toThrow();
  });
});
