import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOW, publicContext, tokenFor } from './feedback.fakes';
import { feedbackApp } from './test-app';

describe('public feedback rate limit (own app: the limiter is per instance)', () => {
  let h: Awaited<ReturnType<typeof feedbackApp>>;
  beforeAll(async () => {
    h = await feedbackApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    h.reset();
    h.queries.byTokenHash.mockResolvedValue(publicContext());
  });
  afterEach(() => vi.useRealTimers());

  it('the 11th request on one token from one IP is 429 too_many_requests; another token still works', async () => {
    const get = (token: string) => h.call({ method: 'GET', url: `/public/feedback/${token}`, token: null });
    const codes: number[] = [];
    for (let i = 0; i < 11; i++) codes.push((await get(tokenFor())).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    const limited = await get(tokenFor());
    expect([limited.statusCode, limited.json().code]).toEqual([429, 'too_many_requests']);
    expect((await get('another-token')).statusCode).toBe(404);
  });
});
