import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { PublicJoinLimit } from './join-limit';

const T0 = 1_000_000;

describe('PublicJoinLimit', () => {
  it('lets 10 calls per link and IP through, the 11th is a 429', () => {
    const limit = new PublicJoinLimit();
    for (let i = 0; i < 10; i++) expect(() => limit.assert({ ip: '1.1.1.1', token: 'a' }, T0 + i)).not.toThrow();
    try {
      limit.assert({ ip: '1.1.1.1', token: 'a' }, T0 + 11);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(429);
      expect((e as HttpException).getResponse()).toMatchObject({ code: 'too_many_requests' });
    }
  });

  it('counts links separately, but caps one IP at 60 whatever the links', () => {
    const limit = new PublicJoinLimit();
    for (let i = 0; i < 60; i++) limit.assert({ ip: '2.2.2.2', token: `t${i}` }, T0);
    expect(() => limit.assert({ ip: '2.2.2.2', token: 'fresh' }, T0)).toThrow(HttpException);
    expect(() => limit.assert({ ip: '3.3.3.3', token: 't0' }, T0)).not.toThrow();
  });

  it('forgets after the 10-minute window', () => {
    const limit = new PublicJoinLimit();
    for (let i = 0; i < 10; i++) limit.assert({ ip: '4.4.4.4', token: 'a' }, T0);
    expect(() => limit.assert({ ip: '4.4.4.4', token: 'a' }, T0 + 10 * 60_000 + 1)).not.toThrow();
  });
});
