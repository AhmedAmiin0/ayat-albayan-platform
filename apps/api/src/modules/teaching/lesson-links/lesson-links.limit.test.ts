import { describe, expect, it, vi } from 'vitest';
import type { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { LessonLinksLimit } from './lesson-links.limit';

const setup = () => {
  const takeOrThrow = vi.fn().mockResolvedValue(undefined);
  const limit = new LessonLinksLimit({ takeOrThrow } as unknown as RateLimitRepo);
  return { limit, takeOrThrow };
};

describe('LessonLinksLimit', () => {
  it.each([
    ['join', 60],
    ['legacy', 10],
  ] as const)('%s allows %i a minute per IP and 20 per IP and link', async (route, perIp) => {
    const { limit, takeOrThrow } = setup();
    await limit.check(route, { ip: '1.2.3.4', link: 'tok' });
    expect(takeOrThrow).toHaveBeenCalledWith({
      buckets: [
        { key: `teacher-${route}:ip:1.2.3.4`, max: perIp },
        { key: `teacher-${route}:link:1.2.3.4|tok`, max: 20 },
      ],
      windowMs: 60_000,
    });
  });
});
