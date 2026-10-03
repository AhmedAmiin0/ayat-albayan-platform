import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PublicFeedbackLimit, WindowCounter } from './feedback.rate-limit';

const MIN = 60_000;

describe('WindowCounter', () => {
  it('allows `max` hits per window, then refuses until the oldest ages out', () => {
    const c = new WindowCounter(3);
    expect([0, 1, 2].map((i) => c.allow('k', i * MIN))).toEqual([true, true, true]);
    expect(c.allow('k', 3 * MIN)).toBe(false);
    expect(c.allow('k', 10 * MIN)).toBe(true);
  });

  it('keeps keys apart', () => {
    const c = new WindowCounter(1);
    expect(c.allow('a', 0)).toBe(true);
    expect(c.allow('b', 0)).toBe(true);
    expect(c.allow('a', 1)).toBe(false);
  });
});

describe('PublicFeedbackLimit', () => {
  const status = (fn: () => void) => {
    try {
      fn();
      return 200;
    } catch (e) {
      return e instanceof HttpException ? e.getStatus() : 500;
    }
  };

  it('10 requests per token and IP in 10 minutes, then 429 too_many_requests', () => {
    const l = new PublicFeedbackLimit();
    const hit = () => status(() => l.assert({ ip: '1.1.1.1', token: 't' }, 0));
    expect(Array.from({ length: 10 }, hit).every((s) => s === 200)).toBe(true);
    expect(hit()).toBe(429);
    expect(status(() => l.assert({ ip: '1.1.1.1', token: 't' }, 11 * MIN))).toBe(200);
  });

  it('another token from the same IP has its own bucket, but the IP has a ceiling of 60', () => {
    const l = new PublicFeedbackLimit();
    const codes = Array.from({ length: 61 }, (_, i) => status(() => l.assert({ ip: '2.2.2.2', token: `t${i}` }, 0)));
    expect(codes.slice(0, 60).every((s) => s === 200)).toBe(true);
    expect(codes[60]).toBe(429);
    expect(status(() => l.assert({ ip: '3.3.3.3', token: 't0' }, 0))).toBe(200);
  });
});
