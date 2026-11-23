import { describe, expect, it } from 'vitest';
import { bearerOf, keyMatches } from './relay.auth';

// The Bearer is the notifications line's own CRM key (no new secret); compared in constant time.

describe('relay auth', () => {
  it('reads the Bearer token; any other scheme or none is null', () => {
    expect(bearerOf('Bearer abc')).toBe('abc');
    expect(bearerOf('bearer  abc ')).toBe('abc');
    expect(bearerOf('Basic abc')).toBeNull();
    expect(bearerOf(undefined)).toBeNull();
    expect(bearerOf('Bearer')).toBeNull();
  });

  it('matches only the exact key', () => {
    expect(keyMatches('Bearer fake-key', 'fake-key')).toBe(true);
    expect(keyMatches('Bearer fake-ke', 'fake-key')).toBe(false);
    expect(keyMatches('Bearer fake-key-2', 'fake-key')).toBe(false);
    expect(keyMatches(undefined, 'fake-key')).toBe(false);
    expect(keyMatches('fake-key', 'fake-key')).toBe(false);
  });
});
