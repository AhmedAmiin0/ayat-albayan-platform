import { describe, expect, it } from 'vitest';
import { CONFIG, decode } from '../classroom.fakes';
import { grantsFor, mintToken, newIdentity, TOKEN_TTL_S } from './livekit-token';

const NOW = new Date('2026-10-05T16:00:00Z');
const nowS = NOW.getTime() / 1000;
const input = { room: 'lesson-x', role: 'teacher' as const, name: 'أبرار', identity: 'teacher-aa' };

describe('mintToken', () => {
  it('signs a three-part HS256 JWT with the API secret', () => {
    const token = mintToken(CONFIG, input, NOW);
    expect(token.split('.')).toHaveLength(3);
    expect(JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString())).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(decode(token).validSignature).toBe(true);
    expect(decode(token, 'another-secret').validSignature).toBe(false);
  });

  it('carries iss = API key, sub = identity, the name, nbf and exp', () => {
    const c = decode(mintToken(CONFIG, input, NOW));
    expect(c).toMatchObject({ iss: CONFIG.apiKey, sub: 'teacher-aa', name: 'أبرار' });
    expect(c.nbf).toBe(nowS - 10);
    expect(c.exp).toBe(nowS + TOKEN_TTL_S);
  });

  it('joins exactly the requested room', () => {
    const { video } = decode(mintToken(CONFIG, input, NOW));
    expect(video).toMatchObject({ roomJoin: true, room: 'lesson-x' });
  });

  it('caps the lifetime at the default and floors it at five minutes', () => {
    expect(decode(mintToken(CONFIG, { ...input, ttlSeconds: 99 * 3600 }, NOW)).exp).toBe(nowS + TOKEN_TTL_S);
    expect(decode(mintToken(CONFIG, { ...input, ttlSeconds: 3600 }, NOW)).exp).toBe(nowS + 3600);
    expect(decode(mintToken(CONFIG, { ...input, ttlSeconds: 1 }, NOW)).exp).toBe(nowS + 300);
  });

  it('keeps the default lifetime to a few hours', () => {
    expect(TOKEN_TTL_S).toBeGreaterThanOrEqual(2 * 3600);
    expect(TOKEN_TTL_S).toBeLessThanOrEqual(6 * 3600);
  });
});

describe('role grants', () => {
  it.each(['teacher', 'admin', 'assistant', 'sales'] as const)('%s publishes everything and may subscribe', (role) => {
    expect(grantsFor(role, 'r')).toEqual({ roomJoin: true, room: 'r', canPublish: true, canSubscribe: true, canPublishData: true });
  });

  it('a guest publishes camera and microphone only (no screen share), and may subscribe', () => {
    const g = grantsFor('guest', 'r');
    expect(g).toMatchObject({ canPublish: true, canSubscribe: true, canPublishData: true });
    expect(g.canPublishSources).toEqual(['camera', 'microphone']);
  });

  it('is what the minted token carries', () => {
    const c = decode(mintToken(CONFIG, { ...input, role: 'guest' }, NOW));
    expect(c.video.canPublishSources).toEqual(['camera', 'microphone']);
  });
});

describe('newIdentity', () => {
  it('is unique per call (one token = one identity)', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newIdentity('teacher')));
    expect(ids.size).toBe(500);
  });

  it('starts with the role and uses the injected randomness', () => {
    expect(newIdentity('guest', () => Buffer.from('abcdef'))).toBe('guest-616263646566');
  });
});
