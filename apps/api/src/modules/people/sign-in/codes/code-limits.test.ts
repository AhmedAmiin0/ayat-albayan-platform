import { describe, expect, it } from 'vitest';
import { phoneMayCheck, phoneMaySend, SignInLimits } from './code-limits';

const stats = (over: Partial<{ sentLast15Min: number; sentLastDay: number; failedLastDay: number }> = {}) => ({
  sentLast15Min: 0,
  sentLastDay: 0,
  failedLastDay: 0,
  ...over,
});

describe('per-phone limits (database counts)', () => {
  it('3 per 15 minutes, 10 a day, and no new code after 10 wrong ones a day', () => {
    expect(phoneMaySend(stats({ sentLast15Min: 2, sentLastDay: 9 }))).toBe(true);
    expect(phoneMaySend(stats({ sentLast15Min: 3 }))).toBe(false);
    expect(phoneMaySend(stats({ sentLastDay: 10 }))).toBe(false);
    expect(phoneMaySend(stats({ failedLastDay: 10 }))).toBe(false);
    expect(phoneMayCheck(stats({ failedLastDay: 9 }))).toBe(true);
    expect(phoneMayCheck(stats({ failedLastDay: 10 }))).toBe(false);
  });
});

describe('SignInLimits (per IP and per identifier, 15 minutes)', () => {

  it('5 code requests per identifier, whatever its spelling', () => {
    const limits = new SignInLimits();
    const spellings = ['AB-1234', 'ab-1234', 'ab 1234', 'AB1234', ' ab-1234 '];
    spellings.forEach((identifier, i) => limits.assert('request', { ip: `10.0.0.${i}`, identifier }, 1000));
    expect(() => limits.assert('request', { ip: '10.0.0.99', identifier: 'Ab-1234' }, 1000)).toThrow('too_many_requests');
  });

  it('phones in any format share a bucket', () => {
    const limits = new SignInLimits();
    for (let i = 0; i < 5; i += 1) limits.assert('request', { ip: `1.1.1.${i}`, identifier: i % 2 ? '+966500000001' : '00966 50 000 0001' }, 0);
    expect(() => limits.assert('request', { ip: '1.1.1.9', identifier: '+966 500000001' }, 0)).toThrow('too_many_requests');
  });

  it('20 requests per IP across identifiers; buckets free up after 15 minutes', () => {
    const limits = new SignInLimits();
    for (let i = 0; i < 20; i += 1) limits.assert('request', { ip: '9.9.9.9', identifier: `user${i}x` }, 0);
    expect(() => limits.assert('request', { ip: '9.9.9.9', identifier: 'fresh' }, 0)).toThrow('too_many_requests');
    expect(() => limits.assert('request', { ip: '9.9.9.9', identifier: 'fresh' }, 15 * 60_000)).not.toThrow();
  });

  it('kinds have their own buckets (10 checks / logins per identifier)', () => {
    const limits = new SignInLimits();
    for (let i = 0; i < 10; i += 1) limits.assert('check', { ip: `2.2.2.${i}`, identifier: 'omar' }, 0);
    expect(() => limits.assert('check', { ip: '2.2.2.99', identifier: 'OMAR' }, 0)).toThrow('too_many_requests');
    expect(() => limits.assert('login', { ip: '2.2.2.99', identifier: 'omar' }, 0)).not.toThrow();
  });
});
