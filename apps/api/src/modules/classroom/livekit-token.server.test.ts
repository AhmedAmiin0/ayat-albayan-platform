import { roleOfMeta } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { CONFIG, decode } from './classroom.fakes';
import { grantsFor, mintServerToken, mintToken, signJwt } from './livekit-token';

const NOW = new Date('2026-10-05T16:00:00Z');
const nowS = NOW.getTime() / 1000;
const input = { room: 'lesson-x', name: 'أبرار', identity: 'teacher-aa' };

describe('the role travels in the token metadata', () => {
  it.each(['teacher', 'admin', 'assistant', 'sales', 'guest'] as const)('%s', (role) => {
    const c = decode(mintToken(CONFIG, { ...input, role }, NOW));
    expect(roleOfMeta(c.metadata)).toBe(role);
  });

  it('carries no user or link id', () => {
    const c = decode(mintToken(CONFIG, { ...input, role: 'guest' }, NOW));
    expect(JSON.parse(c.metadata ?? '')).toEqual({ role: 'guest' });
  });
});

describe('grants used by the classroom', () => {
  it('every role may publish data (the whiteboard rides the data channel)', () => {
    for (const role of ['teacher', 'admin', 'assistant', 'sales', 'guest'] as const) {
      expect(grantsFor(role, 'r').canPublishData).toBe(true);
    }
  });

  it('teacher, admin and assistant may share a screen (no source limit); a guest may not', () => {
    for (const role of ['teacher', 'admin', 'assistant'] as const) expect(grantsFor(role, 'r').canPublishSources).toBeUndefined();
    expect(grantsFor('guest', 'r').canPublishSources).not.toContain('screen_share');
  });
});

describe('mintServerToken', () => {
  it('signs a short-lived server token carrying only the requested grant', () => {
    const t = mintServerToken(CONFIG, { roomAdmin: true, room: 'lesson-x' }, NOW);
    const c = decode(t) as unknown as { iss: string; exp: number; nbf: number; video: object; validSignature: boolean };
    expect(c.validSignature).toBe(true);
    expect(c.iss).toBe(CONFIG.apiKey);
    expect(c.video).toEqual({ roomAdmin: true, room: 'lesson-x' });
    expect(c.exp).toBe(nowS + 600);
    expect(c.nbf).toBe(nowS - 10);
  });

  it('never grants roomJoin', () => {
    const c = decode(mintServerToken(CONFIG, { roomRecord: true }, NOW));
    expect(c.video).toEqual({ roomRecord: true });
  });
});

describe('signJwt', () => {
  it('is an HS256 JWT over the claims', () => {
    const t = signJwt(CONFIG.apiSecret, { iss: 'k', sub: 's', name: 'n', nbf: 1, exp: 2, video: {} });
    expect(decode(t).validSignature).toBe(true);
    expect(decode(t, 'other').validSignature).toBe(false);
  });
});
