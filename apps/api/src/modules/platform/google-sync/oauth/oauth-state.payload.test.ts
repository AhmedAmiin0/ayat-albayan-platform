import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readState, stateKey } from './oauth-state';

// docs/36 z9: a well-signed state whose payload is not { u, n, e } reads as no state.

const KEY = stateKey('fake-service-key');
const NOW = Date.UTC(2026, 9, 22, 10);

/** A state signed with KEY around any body text (as newState signs, but any payload). */
const signed = (text: string): string => {
  const body = Buffer.from(text).toString('base64url');
  return `${body}.${createHmac('sha256', KEY).update(body).digest('base64url')}`;
};

describe('OAuth state payload', () => {
  it.each([
    ['not JSON', '{u:1'],
    ['JSON null', 'null'],
    ['an array', '[1]'],
    ['no nonce', JSON.stringify({ u: 'a', e: NOW + 1000 })],
    ['expiry as text', JSON.stringify({ u: 'a', n: 'x', e: String(NOW + 1000) })],
    ['user id as number', JSON.stringify({ u: 1, n: 'x', e: NOW + 1000 })],
  ])('%s → null', (_name, text) => {
    expect(readState({ state: signed(text), key: KEY, now: NOW })).toBeNull();
  });

  it('a valid payload keeps only u, n and e', () => {
    const text = JSON.stringify({ u: 'a', n: 'x', e: NOW + 1000, extra: true });
    expect(readState({ state: signed(text), key: KEY, now: NOW })).toEqual({
      u: 'a',
      n: 'x',
      e: NOW + 1000,
    });
  });
});
