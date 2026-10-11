import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { authorized } from './lines.ts';

// Review C, S1: a chat token alone must not make the notifications line strict.

const req = (authorization?: string) => ({ headers: authorization ? { authorization } : {} }) as IncomingMessage;
const CHAT = { phoneNumberId: 'PN-C', wabaId: 'WABA-C', accessToken: 'chat-token' };

describe('wa-stub: authorized()', () => {
  it('no token configured: any bearer passes, none is refused', () => {
    expect(authorized(req('Bearer anything'), {})).toBe(true);
    expect(authorized(req(), {})).toBe(false);
  });

  it('only the chat token configured (no WA_ACCESS_TOKEN): still lenient', () => {
    expect(authorized(req('Bearer local-token'), { chat: CHAT })).toBe(true);
    expect(authorized(req('OAuth chat-token'), { chat: CHAT })).toBe(true);
  });

  it('both tokens configured: either passes, any other bearer is refused', () => {
    const opts = { accessToken: 'n-token', chat: CHAT };
    expect(authorized(req('Bearer n-token'), opts)).toBe(true);
    expect(authorized(req('Bearer chat-token'), opts)).toBe(true);
    expect(authorized(req('Bearer local-token'), opts)).toBe(false);
  });

  it('only the notifications token configured: strict on it', () => {
    expect(authorized(req('Bearer n-token'), { accessToken: 'n-token' })).toBe(true);
    expect(authorized(req('Bearer other'), { accessToken: 'n-token' })).toBe(false);
  });
});
