import { describe, expect, it } from 'vitest';
import { newState, nonceHash, readState, STATE_TTL_MS, stateKey } from './oauth-state';

const KEY = stateKey('fake-service-key');
const NOW = Date.UTC(2026, 9, 22, 10);

describe('OAuth state', () => {
  it('round-trips the admin id and nonce while unexpired', () => {
    const s = newState({ userId: 'admin-1', key: KEY, now: NOW });
    expect(readState({ state: s.state, key: KEY, now: NOW + 1000 })).toEqual({ u: 'admin-1', n: s.nonce, e: NOW + STATE_TTL_MS });
    expect(s.expiresAt.getTime()).toBe(NOW + STATE_TTL_MS);
  });

  it('refuses an expired state', () => {
    const s = newState({ userId: 'admin-1', key: KEY, now: NOW });
    expect(readState({ state: s.state, key: KEY, now: NOW + STATE_TTL_MS })).toBeNull();
  });

  it('refuses a tampered body, a foreign key and junk', () => {
    const s = newState({ userId: 'admin-1', key: KEY, now: NOW });
    const [, mac] = s.state.split('.');
    const forged = `${Buffer.from(JSON.stringify({ u: 'attacker', n: 'x', e: NOW + 60_000 })).toString('base64url')}.${mac}`;
    expect(readState({ state: forged, key: KEY, now: NOW })).toBeNull();
    expect(readState({ state: s.state, key: stateKey('other'), now: NOW })).toBeNull();
    expect(readState({ state: 'nope', key: KEY, now: NOW })).toBeNull();
    expect(readState({ state: `${s.state}.x`, key: KEY, now: NOW })).toBeNull();
  });

  it('stores only a hash of the nonce, and each state has its own nonce', () => {
    const a = newState({ userId: 'u', key: KEY, now: NOW });
    const b = newState({ userId: 'u', key: KEY, now: NOW });
    expect(a.nonce).not.toBe(b.nonce);
    expect(nonceHash(a.nonce)).toMatch(/^[0-9a-f]{64}$/);
    expect(nonceHash(a.nonce)).not.toContain(a.nonce);
  });
});
