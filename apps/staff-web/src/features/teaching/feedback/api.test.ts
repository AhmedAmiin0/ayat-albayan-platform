import { describe, expect, it } from 'vitest';
import { ApiError } from '@ab/web-kit';
import { publicProblem } from './api';

describe('public feedback contract', () => {
  it('a form the page cannot read is a failure to retry later, not a bad link', () => {
    const unreadable = new ApiError(200, { code: 'bad_response', path: '/public/feedback/tok' });
    expect(publicProblem(unreadable)).toBe('failed');
  });

  it('publicProblem: 409 already, 429 too many, other 4xx a bad link, the rest a failure to retry', () => {
    expect(publicProblem(new ApiError(409))).toBe('already');
    expect(publicProblem(new ApiError(429))).toBe('too_many');
    expect(publicProblem(new ApiError(404))).toBe('invalid');
    expect(publicProblem(new ApiError(401))).toBe('invalid');
    expect(publicProblem(new ApiError(500))).toBe('failed');
    expect(publicProblem(new TypeError('network'))).toBe('failed');
  });
});
