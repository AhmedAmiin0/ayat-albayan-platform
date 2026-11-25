import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { MuteLimit } from '@/modules/teaching/classroom/moderation/mute-limit';

describe('MuteLimit and test logins (docs/56)', () => {
  it('counts a real login; a test login is never counted', () => {
    const limit = new MuteLimit(2);
    const real = { id: 'u1' };
    limit.assert(real, 0);
    limit.assert(real, 0);
    expect(() => limit.assert(real, 0)).toThrow(HttpException);
    const tester = { id: 'u2', isTest: true };
    for (let i = 0; i < 5; i += 1) expect(() => limit.assert(tester, 0)).not.toThrow();
  });
});
