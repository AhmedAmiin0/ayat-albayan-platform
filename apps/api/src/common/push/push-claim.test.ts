import { describe, expect, it } from 'vitest';
import { deviceKeyHash, mayClaimDevice, mintDeviceKey } from './push-claim';

describe('mayClaimDevice (no push-token takeover)', () => {
  const other = { profileId: 'teacher-1', live: true, proven: false };

  it('nobody holds it, or the caller does: yes', () => {
    expect(mayClaimDevice('admin-1', null)).toBe(true);
    expect(mayClaimDevice('teacher-1', other)).toBe(true);
  });

  it('another person’s live device on the token alone: no', () => {
    expect(mayClaimDevice('admin-1', other)).toBe(false);
  });

  it('their session ended, or the request proves it is that device: yes', () => {
    expect(mayClaimDevice('admin-1', { ...other, live: false })).toBe(true);
    expect(mayClaimDevice('admin-1', { ...other, proven: true })).toBe(true);
  });
});

describe('device keys', () => {
  it('43 base64url characters, never the same twice; stored as a 64-hex sha256', () => {
    const a = mintDeviceKey();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(mintDeviceKey()).not.toBe(a);
    expect(deviceKeyHash(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(deviceKeyHash(a)).toBe(deviceKeyHash(a));
  });
});
