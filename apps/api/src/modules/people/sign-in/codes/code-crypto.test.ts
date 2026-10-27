import { describe, expect, it } from 'vitest';
import { expiryOf, hashCode, newCode, sameHash } from './code-crypto';

const PEPPER = 'test-pepper-0123456789-0123456789-abc';
const subject = { kind: 'guardian' as const, id: 'g1' };

describe('code crypto (docs/30 §3)', () => {
  it('makes 6 digits, keeping leading zeros', () => {
    expect(newCode(() => 42)).toBe('000042');
    expect(newCode(() => 999_999)).toBe('999999');
    expect(newCode()).toMatch(/^\d{6}$/);
  });

  it('asks the CSPRNG for the whole 10^6 range', () => {
    let asked = 0;
    newCode((max) => ((asked = max), 0));
    expect(asked).toBe(1_000_000);
  });

  it('hashes to 64 hex chars, bound to pepper, purpose, subject and code', () => {
    const h = hashCode(PEPPER, { purpose: 'sign_in', subject, code: '123456' });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('123456');
    expect(hashCode(PEPPER, { purpose: 'sign_in', subject, code: '123456' })).toBe(h);
    expect(hashCode('other-pepper-0123456789-0123456789-ab', { purpose: 'sign_in', subject, code: '123456' })).not.toBe(h);
    expect(hashCode(PEPPER, { purpose: 'reset_password', subject, code: '123456' })).not.toBe(h);
    expect(hashCode(PEPPER, { purpose: 'sign_in', subject: { kind: 'student', id: 'g1' }, code: '123456' })).not.toBe(h);
    expect(hashCode(PEPPER, { purpose: 'sign_in', subject, code: '123457' })).not.toBe(h);
  });

  it('compares in constant time and refuses empty or uneven input', () => {
    const h = hashCode(PEPPER, { purpose: 'sign_in', subject, code: '1' });
    expect(sameHash(h, h)).toBe(true);
    expect(sameHash(h, hashCode(PEPPER, { purpose: 'sign_in', subject, code: '2' }))).toBe(false);
    expect(sameHash(h, h.slice(0, 10))).toBe(false);
    expect(sameHash('', '')).toBe(false);
  });

  it('expires after the TTL', () => {
    expect(expiryOf(new Date('2026-10-27T10:00:00Z'), 10).toISOString()).toBe('2026-10-27T10:10:00.000Z');
  });
});
